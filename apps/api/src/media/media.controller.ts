import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Controller('media')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'RESTAURANT_OWNER')
export class MediaController {
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Image file is required');
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are allowed');
    }

    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `img-${randomUUID()}${ext}`;
    fs.writeFileSync(path.join(uploadDir, filename), file.buffer);

    return { url: `/uploads/${filename}` };
  }
}
