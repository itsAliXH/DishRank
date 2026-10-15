import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  private getFrom(): string {
    return process.env.MAIL_FROM || 'DishRank <noreply@dishrank.local>';
  }

  private getTransporter(): Transporter | null {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST?.trim();
    if (!host) return null;

    const port = Number(process.env.SMTP_PORT || 587);
    const secure =
      process.env.SMTP_SECURE === 'true' ||
      process.env.SMTP_SECURE === '1';
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });

    return this.transporter;
  }

  async sendPasswordReset(to: string, resetUrl: string) {
    const subject = 'Reset your DishRank password';
    const text = [
      'You requested a password reset for your DishRank account.',
      '',
      `Open this link to choose a new password (expires in 1 hour):`,
      resetUrl,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n');
    const html = `
      <p>You requested a password reset for your DishRank account.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
    `;

    const transporter = this.getTransporter();
    if (!transporter) {
      this.logger.warn(
        `SMTP not configured — password reset link for ${to}: ${resetUrl}`,
      );
      return;
    }

    try {
      await transporter.sendMail({
        from: this.getFrom(),
        to,
        subject,
        text,
        html,
      });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (err) {
      this.logger.error(
        `Failed to send password reset email to ${to}`,
        err instanceof Error ? err.stack : String(err),
      );
      // Still log the link so local/dev is not blocked if SMTP is misconfigured.
      this.logger.warn(`Password reset link for ${to}: ${resetUrl}`);
    }
  }
}
