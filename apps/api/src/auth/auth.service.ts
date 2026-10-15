import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import {
  RegisterDto,
  LoginDto,
  UpdateProfileDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './auth.dto';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d+]/g, '');
}

function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private mail: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const phone = normalizePhone(dto.phone);

    await this.assertContactsAvailable(email, phone);

    const password = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        phone,
        password,
      },
    });

    return this.buildAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('This account has been banned');
    }
    if (user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; email: string; role: string };
    try {
      payload = this.jwt.verify(refreshToken) as {
        sub: string;
        email: string;
        role: string;
      };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException('Invalid refresh token');
    if (user.status === UserStatus.BANNED) {
      throw new UnauthorizedException('This account has been banned');
    }
    if (user.status === UserStatus.DEACTIVATED) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    return this.buildAuthResponse(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Not authenticated');

    const email = dto.email?.trim().toLowerCase();
    const phone = dto.phone != null ? normalizePhone(dto.phone) : undefined;

    if (email || phone) {
      await this.assertContactsAvailable(email, phone, userId);
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        name: dto.name?.trim(),
        email,
        phone,
      },
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      role: updated.role,
      status: updated.status,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('Not authenticated');

    const valid = await bcrypt.compare(dto.currentPassword, user.password);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    return { ok: true };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const generic = {
      ok: true as const,
      message: 'If an account exists for that email, a reset link has been sent.',
    };

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      return generic;
    }

    // Invalidate any unused tokens for this user.
    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const webBase = (process.env.APP_WEB_URL || 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    const resetUrl = `${webBase}/reset-password?token=${encodeURIComponent(token)}`;
    await this.mail.sendPasswordReset(user.email, resetUrl);

    return generic;
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = hashResetToken(dto.token.trim());
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Reset link is invalid or has expired');
    }

    if (record.user.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('This account cannot reset its password');
    }

    const hashed = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { password: hashed },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
    ]);

    return { ok: true };
  }

  /** Banned contacts cannot be reused for signup or profile updates. */
  private async assertContactsAvailable(
    email?: string,
    phone?: string,
    excludeUserId?: string,
  ) {
    if (email) {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== excludeUserId) {
        if (existing.status === UserStatus.BANNED) {
          throw new ConflictException('This email cannot be used');
        }
        throw new ConflictException('Email already registered');
      }
      const bannedEmail = await this.prisma.user.findFirst({
        where: {
          email,
          status: UserStatus.BANNED,
          ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
        },
      });
      if (bannedEmail) throw new ConflictException('This email cannot be used');
    }

    if (phone) {
      const existing = await this.prisma.user.findUnique({ where: { phone } });
      if (existing && existing.id !== excludeUserId) {
        if (existing.status === UserStatus.BANNED) {
          throw new ConflictException('This phone number cannot be used');
        }
        throw new ConflictException('Phone number already registered');
      }
    }
  }

  private buildAuthResponse(user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    role: string;
    status?: string;
    createdAt: Date;
  }) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwt.sign(payload),
      refreshToken: this.jwt.sign(payload, { expiresIn: '30d' }),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? undefined,
        role: user.role,
        status: user.status ?? 'ACTIVE',
        createdAt: user.createdAt.toISOString(),
      },
    };
  }
}
