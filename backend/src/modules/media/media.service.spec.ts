import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MediaService, deriveMediaKind } from './media.service.js';

describe('deriveMediaKind', () => {
  it.each([
    ['image/png', 'image'],
    ['image/svg+xml', 'image'],
    ['video/mp4', 'video'],
    ['audio/mpeg', 'audio'],
    ['application/pdf', 'document'],
    ['text/plain', 'document'],
  ] as const)('classifies %s as %s', (mimeType, expected) => {
    expect(deriveMediaKind(mimeType)).toBe(expected);
  });

  it('returns undefined for an unsupported type', () => {
    expect(deriveMediaKind('application/x-msdownload')).toBeUndefined();
  });
});

describe('MediaService', () => {
  let service: MediaService;

  beforeEach(() => {
    service = new MediaService();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  it('stores a file and returns it with derived metadata', () => {
    const stored = service.store({
      uploaderId: 'AAAA-1111',
      mimeType: 'text/plain',
      fileName: 'nota.txt',
      buffer: Buffer.from('hola'),
    });

    expect(service.get(stored.id)).toEqual(stored);
    expect(stored.size).toBe(Buffer.from('hola').length);
  });

  it('returns undefined for an unknown ID', () => {
    expect(service.get('unknown')).toBeUndefined();
  });

  it('treats expired media as gone and evicts it', () => {
    const stored = service.store({
      uploaderId: 'AAAA-1111',
      mimeType: 'text/plain',
      fileName: 'nota.txt',
      buffer: Buffer.from('hola'),
    });
    stored.expiresAt = Date.now() - 1;

    expect(service.get(stored.id)).toBeUndefined();
  });
});
