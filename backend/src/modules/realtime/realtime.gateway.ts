import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { SessionService, type SessionRecord } from '../session/session.service.js';
import { ChatService } from '../chat/chat.service.js';
import { MediaService, deriveMediaKind } from '../media/media.service.js';
import { resolveCorsOrigin } from '../../config/cors.js';

const MAX_MESSAGE_LENGTH = 4000;

interface JoinPayload {
  chatId?: unknown;
}

interface SendPayload {
  chatId?: unknown;
  text?: unknown;
  mediaId?: unknown;
}

interface MediaStatusPayload {
  chatId?: unknown;
  messageId?: unknown;
  status?: unknown;
}

// Mismo origen que main.ts — el adapter de socket.io no hereda el enableCors() de Nest,
// hay que declararlo acá también.
@WebSocketGateway({ cors: { origin: resolveCorsOrigin() } })
export class RealtimeGateway implements OnGatewayConnection {
  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly sessionService: SessionService,
    private readonly chatService: ChatService,
    private readonly mediaService: MediaService,
  ) {}

  // Auth por token de sesión, no por el ID a secas: cualquiera que sepa un ID no puede
  // hacerse pasar por esa sesión sin el token que solo el dueño tiene.
  handleConnection(client: Socket): void {
    const token = this.extractToken(client);
    const session = token ? this.sessionService.getSessionByToken(token) : undefined;

    if (!session) {
      client.emit('session:expired');
      client.disconnect(true);
      return;
    }

    client.data.session = session;
  }

  @SubscribeMessage('chat:join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() body: JoinPayload) {
    try {
      const session = this.requireSession(client);
      if (!session) return { ok: false, error: 'Not authenticated' };

      const chatId = typeof body?.chatId === 'string' ? body.chatId : undefined;
      if (!chatId) return { ok: false, error: 'chatId is required' };

      const chat = this.chatService.getChatForParticipant(chatId, session.id);
      if (!chat) return { ok: false, error: 'Chat not found' };

      void client.join(this.room(chatId));
      return { ok: true, messages: this.chatService.getMessages(chatId) };
    } catch (error) {
      return this.handleUnexpectedError('chat:join', error);
    }
  }

  @SubscribeMessage('chat:message')
  handleMessage(@ConnectedSocket() client: Socket, @MessageBody() body: SendPayload) {
    try {
      const session = this.requireSession(client);
      if (!session) return { ok: false, error: 'Not authenticated' };

      const chatId = typeof body?.chatId === 'string' ? body.chatId : undefined;
      if (!chatId) return { ok: false, error: 'chatId is required' };

      const chat = this.chatService.getChatForParticipant(chatId, session.id);
      if (!chat) return { ok: false, error: 'Chat not found' };

      const mediaId = typeof body?.mediaId === 'string' ? body.mediaId : undefined;
      if (mediaId) return this.sendMediaMessage(chatId, session, mediaId);

      const text = typeof body?.text === 'string' ? body.text.trim() : undefined;
      if (!text || text.length > MAX_MESSAGE_LENGTH) {
        return { ok: false, error: 'Invalid message' };
      }

      const message = this.chatService.addMessage(chatId, session.id, { kind: 'text', text });
      this.server.to(this.room(chatId)).emit('chat:message', message);
      return { ok: true, message };
    } catch (error) {
      return this.handleUnexpectedError('chat:message', error);
    }
  }

  // "View once" y "Delete" del destinatario llegan acá. La room entera (destinatario
  // Y quien mandó) recibe el broadcast, así el remitente también ve que se vio o se
  // descartó — sin eso, su propia burbuja quedaría mintiendo sobre un archivo que ya no existe.
  @SubscribeMessage('chat:media-status')
  handleMediaStatus(@ConnectedSocket() client: Socket, @MessageBody() body: MediaStatusPayload) {
    try {
      const session = this.requireSession(client);
      if (!session) return { ok: false, error: 'Not authenticated' };

      const chatId = typeof body?.chatId === 'string' ? body.chatId : undefined;
      const messageId = typeof body?.messageId === 'string' ? body.messageId : undefined;
      const status = body?.status === 'viewed' || body?.status === 'deleted' ? body.status : undefined;
      if (!chatId || !messageId || !status) return { ok: false, error: 'Invalid request' };

      const chat = this.chatService.getChatForParticipant(chatId, session.id);
      if (!chat) return { ok: false, error: 'Chat not found' };

      const message = this.chatService.setMediaStatus(chatId, messageId, session.id, status);
      if (!message) return { ok: false, error: 'Message not found or already resolved' };

      if (message.media) this.mediaService.delete(message.media.id);

      this.server.to(this.room(chatId)).emit('chat:media-status', { messageId, status });
      return { ok: true };
    } catch (error) {
      return this.handleUnexpectedError('chat:media-status', error);
    }
  }

  // Sin este catch-all, una excepción inesperada acá adentro deja el callback de ack del
  // cliente colgado para siempre (Nest no lo convierte en un ack de error por su cuenta,
  // a diferencia de las excepciones HTTP) — mejor un error explícito que un cuelgue mudo.
  // El log solo lleva el error en sí, nunca el payload del evento (que podría traer texto
  // del mensaje).
  private handleUnexpectedError(event: string, error: unknown): { ok: false; error: string } {
    console.error(`[RealtimeGateway] unexpected error handling "${event}"`, error);
    return { ok: false, error: 'Something went wrong. Try again.' };
  }

  // No confía en el "kind" ni en el resto de metadata que pueda mandar el cliente: solo
  // en el mediaId, y busca el archivo real que quedó guardado al subirlo — así el tipo y
  // los datos del adjunto siempre reflejan lo que efectivamente se subió, no lo que dice el payload.
  private sendMediaMessage(chatId: string, session: SessionRecord, mediaId: string) {
    const media = this.mediaService.get(mediaId);
    if (!media || media.uploaderId !== session.id) {
      return { ok: false, error: 'Media not found or expired' };
    }

    const kind = deriveMediaKind(media.mimeType);
    if (!kind) return { ok: false, error: 'Unsupported media type' };

    const message = this.chatService.addMessage(chatId, session.id, {
      kind,
      media: { id: media.id, mimeType: media.mimeType, fileName: media.fileName, size: media.size },
    });
    this.server.to(this.room(chatId)).emit('chat:message', message);
    return { ok: true, message };
  }

  // No confía en la sesión cacheada en el connect original: la vuelve a validar contra
  // SessionService en cada mensaje, así una sesión que vence mientras el socket sigue
  // abierto (sin reconectar) también queda cortada, no solo las conexiones nuevas.
  private requireSession(client: Socket): SessionRecord | undefined {
    const cached = client.data.session as SessionRecord | undefined;
    if (!cached) return undefined;

    const fresh = this.sessionService.getSessionByToken(cached.token);
    if (!fresh) {
      client.emit('session:expired');
      client.disconnect(true);
      return undefined;
    }

    client.data.session = fresh;
    return fresh;
  }

  private room(chatId: string): string {
    return `chat:${chatId}`;
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth as { token?: unknown } | undefined;
    if (typeof auth?.token === 'string') return auth.token;

    const header = client.handshake.headers.authorization;
    if (typeof header === 'string' && header.startsWith('Bearer ')) {
      return header.slice('Bearer '.length);
    }

    return undefined;
  }
}
