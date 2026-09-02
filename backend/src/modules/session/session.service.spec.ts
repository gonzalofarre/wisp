import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionService } from './session.service.js';

describe('SessionService', () => {
  let service: SessionService;

  beforeEach(() => {
    service = new SessionService();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('createSession', () => {
    it('generates an ID in the XXXX-XXXX format, using only the allowed charset', () => {
      const { id } = service.createSession();
      expect(id).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/);
    });

    it('never reuses an ambiguous character (0, O, 1, I, L)', () => {
      const { id } = service.createSession();
      expect(id).not.toMatch(/[01OIL]/);
    });

    it('generates unique IDs across many sessions', () => {
      const ids = Array.from({ length: 200 }, () => service.createSession().id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('returns a distinct token unrelated to the ID', () => {
      const { id, token } = service.createSession();
      expect(token).not.toBe(id);
      expect(token).toHaveLength(64); // randomBytes(32).toString('hex')
    });
  });

  describe('getSessionByToken', () => {
    it('returns the session for a valid token', () => {
      const created = service.createSession();
      expect(service.getSessionByToken(created.token)).toEqual(created);
    });

    it('returns undefined for an unknown token', () => {
      expect(service.getSessionByToken('does-not-exist')).toBeUndefined();
    });

    it('renews the TTL on each successful lookup (sliding expiration)', () => {
      const created = service.createSession();
      const originalExpiry = created.expiresAt;

      created.expiresAt = Date.now() + 1; // a hair from expiring
      const refreshed = service.getSessionByToken(created.token);

      expect(refreshed?.expiresAt).toBeGreaterThan(originalExpiry - 1000);
    });

    it('treats an expired session as if it never existed, and evicts it', () => {
      const created = service.createSession();
      created.expiresAt = Date.now() - 1;

      expect(service.getSessionByToken(created.token)).toBeUndefined();
      expect(service.sessionExists(created.id)).toBe(false);
    });
  });

  describe('sessionExists', () => {
    it('is true for a live session', () => {
      const { id } = service.createSession();
      expect(service.sessionExists(id)).toBe(true);
    });

    it('is false for an unknown ID', () => {
      expect(service.sessionExists('ZZZZ-ZZZZ')).toBe(false);
    });

    it('is false for an expired session', () => {
      const created = service.createSession();
      created.expiresAt = Date.now() - 1;
      expect(service.sessionExists(created.id)).toBe(false);
    });
  });

  describe('endSession', () => {
    it('invalidates both the token and the ID', () => {
      const created = service.createSession();
      service.endSession(created.token);

      expect(service.getSessionByToken(created.token)).toBeUndefined();
      expect(service.sessionExists(created.id)).toBe(false);
    });

    it('is a no-op for an unknown token', () => {
      expect(() => service.endSession('unknown-token')).not.toThrow();
    });
  });
});
