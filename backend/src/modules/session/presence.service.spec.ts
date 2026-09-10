import { describe, it, expect, beforeEach } from 'vitest';
import { PresenceService } from './presence.service.js';

describe('PresenceService', () => {
  let service: PresenceService;

  beforeEach(() => {
    service = new PresenceService();
  });

  it('is offline before any socket connects', () => {
    expect(service.isOnline('AAAA-1111')).toBe(false);
  });

  it('markOnline reports the first socket as a transition, later ones as not', () => {
    expect(service.markOnline('AAAA-1111')).toBe(true);
    expect(service.markOnline('AAAA-1111')).toBe(false);
    expect(service.isOnline('AAAA-1111')).toBe(true);
  });

  it('markOffline only reports a transition once the last socket closes', () => {
    service.markOnline('AAAA-1111');
    service.markOnline('AAAA-1111');

    expect(service.markOffline('AAAA-1111')).toBe(false);
    expect(service.isOnline('AAAA-1111')).toBe(true);

    expect(service.markOffline('AAAA-1111')).toBe(true);
    expect(service.isOnline('AAAA-1111')).toBe(false);
  });

  it('markOffline on a session with no sockets is harmless and stays offline', () => {
    expect(service.markOffline('AAAA-1111')).toBe(true);
    expect(service.isOnline('AAAA-1111')).toBe(false);
  });

  it('tracks sessions independently', () => {
    service.markOnline('AAAA-1111');
    expect(service.isOnline('BBBB-2222')).toBe(false);
  });
});
