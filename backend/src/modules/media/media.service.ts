import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomBytes } from 'node:crypto';

export type MediaKind = 'image' | 'video' | 'audio' | 'document';

export interface StoredMedia {
  id: string;
  uploaderId: string;
  mimeType: string;
  fileName: string;
  size: number;
  buffer: Buffer;
  createdAt: number;
  expiresAt: number;
}

interface UploadInput {
  uploaderId: string;
  mimeType: string;
  fileName: string;
  buffer: Buffer;
}

// Vida corta y en memoria — "nada de storage permanente" del spec. El TTL coincide con
// el de un mensaje (Fase 6): la subida ocurre recién al enviar (ver MediaPreviewScreen),
// así que el ciclo de vida del archivo es el mismo que el del mensaje que lo referencia.
const MEDIA_TTL_MS = Number(process.env.MEDIA_TTL_MS ?? 5 * 60_000);
const CLEANUP_INTERVAL_MS = Number(process.env.MEDIA_CLEANUP_INTERVAL_MS ?? 30_000);

const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
]);

// Única fuente de verdad para "qué tipo de archivo es esto" — la usa tanto la subida
// (para rechazar tipos no soportados) como el gateway (para no confiar en un "kind" que
// mande el cliente y derivarlo del mimetype real guardado en el servidor).
export function deriveMediaKind(mimeType: string): MediaKind | undefined {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (DOCUMENT_MIME_TYPES.has(mimeType)) return 'document';
  return undefined;
}

@Injectable()
export class MediaService implements OnModuleDestroy {
  private readonly mediaById = new Map<string, StoredMedia>();
  private readonly cleanupInterval = setInterval(() => this.sweepExpired(), CLEANUP_INTERVAL_MS);

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
  }

  store(input: UploadInput): StoredMedia {
    const now = Date.now();
    const media: StoredMedia = {
      id: randomBytes(16).toString('hex'),
      uploaderId: input.uploaderId,
      mimeType: input.mimeType,
      fileName: input.fileName,
      size: input.buffer.length,
      buffer: input.buffer,
      createdAt: now,
      expiresAt: now + MEDIA_TTL_MS,
    };

    this.mediaById.set(media.id, media);
    return media;
  }

  get(id: string): StoredMedia | undefined {
    const media = this.mediaById.get(id);
    if (!media) return undefined;

    if (media.expiresAt <= Date.now()) {
      this.mediaById.delete(id);
      return undefined;
    }

    return media;
  }

  private sweepExpired(): void {
    const now = Date.now();
    for (const [id, media] of this.mediaById) {
      if (media.expiresAt <= now) this.mediaById.delete(id);
    }
  }
}
