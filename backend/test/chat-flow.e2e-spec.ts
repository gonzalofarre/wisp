import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { io, type Socket } from 'socket.io-client';
import { AppModule } from '../src/app.module.js';

interface SessionResponse {
  id: string;
  token: string;
}

interface JoinAck {
  ok: boolean;
  error?: string;
}

interface IncomingMessage {
  text?: string;
  senderId: string;
}

// Cubre el flujo principal de punta a punta: dos sesiones, un chat, y un mensaje
// entregado en tiempo real por WebSocket — más los rechazos server-side que el spec
// exige (self-chat, recipient inexistente, socket sin token válido).
describe('Chat flow (e2e)', () => {
  let app: INestApplication;
  let baseUrl: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(0);

    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  async function createSession(): Promise<SessionResponse> {
    const response = await request(baseUrl).post('/session').expect(201);
    return response.body as SessionResponse;
  }

  function connectSocket(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const socket = io(baseUrl, { auth: { token }, transports: ['websocket'], forceNew: true });
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });
  }

  function join(socket: Socket, chatId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      socket.emit('chat:join', { chatId }, (ack: JoinAck) => {
        if (ack.ok) resolve();
        else reject(new Error(ack.error ?? 'join failed'));
      });
    });
  }

  it('lets two sessions create a chat and exchange a realtime message', async () => {
    const sessionA = await createSession();
    const sessionB = await createSession();

    const createChatResponse = await request(baseUrl)
      .post('/chat')
      .set('Authorization', `Bearer ${sessionA.token}`)
      .send({ recipientId: sessionB.id })
      .expect(201);

    const { chatId } = createChatResponse.body as { chatId: string };

    const socketA = await connectSocket(sessionA.token);
    const socketB = await connectSocket(sessionB.token);

    try {
      await join(socketA, chatId);
      await join(socketB, chatId);

      const received = new Promise<IncomingMessage>((resolve) => {
        socketB.once('chat:message', resolve);
      });

      socketA.emit('chat:message', { chatId, text: 'hola desde el e2e' });

      const message = await received;
      expect(message.text).toBe('hola desde el e2e');
      expect(message.senderId).toBe(sessionA.id);
    } finally {
      socketA.disconnect();
      socketB.disconnect();
    }
  });

  it('rejects a chat with yourself', async () => {
    const session = await createSession();
    await request(baseUrl)
      .post('/chat')
      .set('Authorization', `Bearer ${session.token}`)
      .send({ recipientId: session.id })
      .expect(400);
  });

  it('rejects a chat with a recipient that does not exist', async () => {
    const session = await createSession();
    await request(baseUrl)
      .post('/chat')
      .set('Authorization', `Bearer ${session.token}`)
      .send({ recipientId: 'ZZZZ-ZZZZ' })
      .expect(404);
  });

  it('requires a valid session token for REST endpoints', async () => {
    await request(baseUrl).post('/chat').send({ recipientId: 'ZZZZ-ZZZZ' }).expect(401);
  });

  it('disconnects a socket that never presents a valid session token', async () => {
    const socket = io(baseUrl, {
      auth: { token: 'not-a-real-token' },
      transports: ['websocket'],
      forceNew: true,
    });

    const disconnected = new Promise<void>((resolve) => socket.once('disconnect', () => resolve()));
    const expiredNotice = new Promise<void>((resolve) => socket.once('session:expired', () => resolve()));

    await Promise.all([disconnected, expiredNotice]);
  });
});
