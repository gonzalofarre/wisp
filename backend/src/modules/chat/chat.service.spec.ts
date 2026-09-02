import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChatService } from './chat.service.js';

describe('ChatService', () => {
  let service: ChatService;

  beforeEach(() => {
    service = new ChatService();
  });

  afterEach(() => {
    service.onModuleDestroy();
  });

  describe('createOrGetChat', () => {
    it('creates a chat between two participants', () => {
      const chat = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      expect(chat.participantIds).toEqual(['AAAA-1111', 'BBBB-2222']);
      expect(chat.id).toBeTruthy();
    });

    it('is idempotent regardless of which side starts it', () => {
      const first = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      const second = service.createOrGetChat('BBBB-2222', 'AAAA-1111');
      expect(second.id).toBe(first.id);
    });

    it('creates separate chats for unrelated pairs', () => {
      const chatAB = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      const chatAC = service.createOrGetChat('AAAA-1111', 'CCCC-3333');
      expect(chatAB.id).not.toBe(chatAC.id);
    });

    it('starts a new chat as pending, with the creator as requestedBy', () => {
      const chat = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      expect(chat.status).toBe('pending');
      expect(chat.requestedBy).toBe('AAAA-1111');
    });

    it('stays pending if the same requester calls again', () => {
      service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      const again = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      expect(again.status).toBe('pending');
      expect(again.requestedBy).toBe('AAAA-1111');
    });

    it('auto-accepts when the recipient starts a chat back while pending', () => {
      service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      const accepted = service.createOrGetChat('BBBB-2222', 'AAAA-1111');
      expect(accepted.status).toBe('accepted');
    });

    it('lets a rejected request be retried', () => {
      const first = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      service.respondToRequest(first.id, 'BBBB-2222', false);

      const retried = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      expect(retried.id).toBe(first.id);
      expect(retried.status).toBe('pending');
      expect(retried.requestedBy).toBe('AAAA-1111');
    });
  });

  describe('respondToRequest', () => {
    it('lets the recipient accept a pending request', () => {
      const chat = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      const accepted = service.respondToRequest(chat.id, 'BBBB-2222', true);
      expect(accepted?.status).toBe('accepted');
    });

    it('lets the recipient reject a pending request', () => {
      const chat = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      const rejected = service.respondToRequest(chat.id, 'BBBB-2222', false);
      expect(rejected?.status).toBe('rejected');
    });

    it('refuses to let the requester respond to their own request', () => {
      const chat = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      expect(service.respondToRequest(chat.id, 'AAAA-1111', true)).toBeUndefined();
    });

    it('refuses to respond twice to an already-resolved request', () => {
      const chat = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      service.respondToRequest(chat.id, 'BBBB-2222', true);
      expect(service.respondToRequest(chat.id, 'BBBB-2222', false)).toBeUndefined();
    });

    it('returns undefined for a non-participant', () => {
      const chat = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      expect(service.respondToRequest(chat.id, 'CCCC-3333', true)).toBeUndefined();
    });
  });

  describe('getPendingRequestsFor', () => {
    it('returns requests addressed to the given participant', () => {
      const chat = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      const pending = service.getPendingRequestsFor('BBBB-2222');
      expect(pending.map((c) => c.id)).toEqual([chat.id]);
    });

    it('does not return your own outgoing pending request', () => {
      service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      expect(service.getPendingRequestsFor('AAAA-1111')).toEqual([]);
    });

    it('does not return requests already accepted or rejected', () => {
      const chat = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      service.respondToRequest(chat.id, 'BBBB-2222', true);
      expect(service.getPendingRequestsFor('BBBB-2222')).toEqual([]);
    });
  });

  describe('getChatForParticipant', () => {
    it('returns the chat when the requester is a participant', () => {
      const chat = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      expect(service.getChatForParticipant(chat.id, 'AAAA-1111')).toEqual(chat);
      expect(service.getChatForParticipant(chat.id, 'BBBB-2222')).toEqual(chat);
    });

    it('returns undefined for a non-participant', () => {
      const chat = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      expect(service.getChatForParticipant(chat.id, 'CCCC-3333')).toBeUndefined();
    });

    it('returns undefined for an unknown chat ID', () => {
      expect(service.getChatForParticipant('unknown', 'AAAA-1111')).toBeUndefined();
    });
  });

  describe('messages', () => {
    it('stores and returns messages in order', () => {
      const chat = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      service.addMessage(chat.id, 'AAAA-1111', { kind: 'text', text: 'hola' });
      service.addMessage(chat.id, 'BBBB-2222', { kind: 'text', text: 'todo bien' });

      const messages = service.getMessages(chat.id);
      expect(messages.map((m) => m.text)).toEqual(['hola', 'todo bien']);
    });

    it('returns an empty list for a chat with no messages', () => {
      expect(service.getMessages('unknown')).toEqual([]);
    });

    it('filters out expired messages and prunes them from the store', () => {
      const chat = service.createOrGetChat('AAAA-1111', 'BBBB-2222');
      const alive = service.addMessage(chat.id, 'AAAA-1111', { kind: 'text', text: 'sigue vivo' });
      const expired = service.addMessage(chat.id, 'AAAA-1111', { kind: 'text', text: 'ya venció' });
      expired.expiresAt = Date.now() - 1;

      const messages = service.getMessages(chat.id);
      expect(messages).toEqual([alive]);
    });
  });
});
