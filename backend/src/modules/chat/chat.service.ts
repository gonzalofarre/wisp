import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import type { MediaKind } from '../media/media.service.js';

export type ChatStatus = 'pending' | 'accepted' | 'rejected';

export interface ChatRecord {
  id: string;
  participantIds: [string, string];
  createdAt: number;
  status: ChatStatus;
  requestedBy: string;
}

export type MessageKind = 'text' | MediaKind;

export interface MessageMedia {
  id: string;
  mimeType: string;
  fileName: string;
  size: number;
}

// Solo aplica a mensajes con media, y solo lo puede setear quien lo RECIBE (ver
// setMediaStatus) — 'viewed' es el resultado de "View once", 'deleted' de que el
// destinatario lo descartó sin abrirlo. undefined significa "todavía sin tocar".
export type MediaStatus = 'viewed' | 'deleted';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  kind: MessageKind;
  text?: string;
  media?: MessageMedia;
  mediaStatus?: MediaStatus;
  createdAt: number;
  expiresAt: number;
}

export interface MessageContent {
  kind: MessageKind;
  text?: string;
  media?: MessageMedia;
}

// Default alineado con el ejemplo del mockup de Settings ("Auto-delete chats, ej. 5 min");
// todavía no es configurable por el usuario, eso queda para cuando exista esa pantalla.
const MESSAGE_TTL_MS = Number(process.env.MESSAGE_TTL_MS ?? 5 * 60_000);
const CLEANUP_INTERVAL_MS = Number(process.env.MESSAGE_CLEANUP_INTERVAL_MS ?? 30_000);

@Injectable()
export class ChatService implements OnModuleDestroy {
  private readonly chatsById = new Map<string, ChatRecord>();
  // Clave estable e independiente del orden de los participantes, para no crear un chat
  // duplicado si ambos lados inician el "New chat" el uno hacia el otro.
  private readonly chatIdByParticipantKey = new Map<string, string>();
  private readonly messagesByChatId = new Map<string, ChatMessage[]>();
  private readonly cleanupInterval = setInterval(() => this.sweepExpiredMessages(), CLEANUP_INTERVAL_MS);

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
  }

  // El primero en escribir "New chat" queda como requestedBy y el chat nace 'pending' —
  // el otro lado tiene que aceptar (o lo acepta implícito, ver abajo) antes de contar
  // como una conexión real. No es un chat nuevo por par de participantes; es EL MISMO
  // registro el que va cambiando de estado a lo largo de su vida.
  createOrGetChat(participantIdA: string, participantIdB: string): ChatRecord {
    const key = this.participantKey(participantIdA, participantIdB);
    const existingId = this.chatIdByParticipantKey.get(key);
    const existing = existingId ? this.chatsById.get(existingId) : undefined;

    if (existing) {
      if (existing.status === 'rejected') {
        // Se puede reintentar: un rechazo previo no bloquea para siempre.
        existing.status = 'pending';
        existing.requestedBy = participantIdA;
      } else if (existing.status === 'pending' && existing.requestedBy !== participantIdA) {
        // El destinatario original tipeó el ID en New Chat en vez de tocar "Accept" en
        // el aviso — mismo resultado (los dos quieren hablar), se acepta directo.
        existing.status = 'accepted';
      }
      return existing;
    }

    const chat: ChatRecord = {
      id: randomBytes(16).toString('hex'),
      participantIds: [participantIdA, participantIdB],
      createdAt: Date.now(),
      status: 'pending',
      requestedBy: participantIdA,
    };

    this.chatsById.set(chat.id, chat);
    this.chatIdByParticipantKey.set(key, chat.id);

    return chat;
  }

  getChatForParticipant(chatId: string, participantId: string): ChatRecord | undefined {
    const chat = this.chatsById.get(chatId);
    if (!chat || !chat.participantIds.includes(participantId)) return undefined;
    return chat;
  }

  // Solo puede responder quien NO mandó la solicitud, y solo mientras siga 'pending' —
  // ya resuelta (aceptada o rechazada antes) no se puede volver a responder.
  respondToRequest(chatId: string, participantId: string, accept: boolean): ChatRecord | undefined {
    const chat = this.chatsById.get(chatId);
    if (!chat) return undefined;
    if (!chat.participantIds.includes(participantId)) return undefined;
    if (chat.requestedBy === participantId) return undefined;
    if (chat.status !== 'pending') return undefined;

    chat.status = accept ? 'accepted' : 'rejected';
    return chat;
  }

  getPendingRequestsFor(participantId: string): ChatRecord[] {
    return [...this.chatsById.values()].filter(
      (chat) =>
        chat.status === 'pending' &&
        chat.requestedBy !== participantId &&
        chat.participantIds.includes(participantId),
    );
  }

  addMessage(chatId: string, senderId: string, content: MessageContent): ChatMessage {
    const now = Date.now();
    const message: ChatMessage = {
      id: randomBytes(8).toString('hex'),
      chatId,
      senderId,
      kind: content.kind,
      text: content.text,
      media: content.media,
      createdAt: now,
      expiresAt: now + MESSAGE_TTL_MS,
    };

    const messages = this.messagesByChatId.get(chatId) ?? [];
    messages.push(message);
    this.messagesByChatId.set(chatId, messages);

    return message;
  }

  // Solo el destinatario (nunca quien lo mandó) puede consumir o descartar un adjunto, y
  // solo una vez — ya resuelto (viewed o deleted) no se puede pisar. El gateway es quien
  // borra el archivo real en MediaService una vez que esto devuelve el mensaje actualizado.
  setMediaStatus(
    chatId: string,
    messageId: string,
    actorId: string,
    status: MediaStatus,
  ): ChatMessage | undefined {
    const message = this.messagesByChatId.get(chatId)?.find((candidate) => candidate.id === messageId);
    if (!message || !message.media) return undefined;
    if (message.senderId === actorId || message.mediaStatus) return undefined;

    message.mediaStatus = status;
    return message;
  }

  // Lazy + sweep: acá se filtran por si nadie corrió el barrido todavía, y de paso se
  // podan del store para no dejar mensajes vencidos ocupando memoria indefinidamente.
  getMessages(chatId: string): ChatMessage[] {
    const messages = this.messagesByChatId.get(chatId);
    if (!messages) return [];

    const now = Date.now();
    const alive = messages.filter((message) => message.expiresAt > now);
    if (alive.length !== messages.length) this.messagesByChatId.set(chatId, alive);

    return alive;
  }

  private sweepExpiredMessages(): void {
    const now = Date.now();
    for (const [chatId, messages] of this.messagesByChatId) {
      const alive = messages.filter((message) => message.expiresAt > now);
      if (alive.length !== messages.length) this.messagesByChatId.set(chatId, alive);
    }
  }

  private participantKey(participantIdA: string, participantIdB: string): string {
    return [participantIdA, participantIdB].sort().join(':');
  }
}
