import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { MediaService, deriveMediaKind } from './media.service.js';
import { SessionAuthGuard, type AuthenticatedRequest } from '../session/session-auth.guard.js';
import { RateLimitGuard } from '../session/rate-limit.guard.js';

const MAX_FILE_SIZE_BYTES = Number(process.env.MEDIA_MAX_SIZE_BYTES ?? 15 * 1024 * 1024);

@Controller('media')
@UseGuards(SessionAuthGuard)
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @UseGuards(RateLimitGuard)
  @UseInterceptors(
    FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_FILE_SIZE_BYTES } }),
  )
  upload(@UploadedFile() file: Express.Multer.File | undefined, @Req() request: AuthenticatedRequest) {
    if (!file) throw new BadRequestException('file is required');

    const kind = deriveMediaKind(file.mimetype);
    if (!kind) throw new BadRequestException('Unsupported file type');

    const media = this.mediaService.store({
      uploaderId: request.session.id,
      mimeType: file.mimetype,
      fileName: file.originalname,
      buffer: file.buffer,
    });

    return { mediaId: media.id, kind, mimeType: media.mimeType, fileName: media.fileName, size: media.size };
  }

  // Cualquier sesión válida puede pedir un media por ID, sin chequear participación en
  // el chat: mismo modelo de seguridad que el resto de la app (IDs random de 128 bits
  // como secreto — solo llega a conocerse el ID siendo participante del chat que lo usó).
  @Get(':id')
  download(@Param('id') id: string, @Res() response: Response): void {
    const media = this.mediaService.get(id);
    if (!media) throw new NotFoundException('Media not found or expired');

    response.setHeader('Content-Type', media.mimeType);
    response.setHeader('Content-Length', media.size.toString());
    response.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(media.fileName)}"`);
    response.send(media.buffer);
  }
}
