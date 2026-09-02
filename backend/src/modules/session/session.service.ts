import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomBytes, randomInt } from 'node:crypto';

export interface SessionRecord {
  id: string;
  token: string;
  createdAt: number;
  expiresAt: number;
}

// Sin caracteres ambiguos (0/O, 1/I/L) — el ID se lee y se dicta en voz alta
const ID_CHARSET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const ID_GROUP_LENGTH = 4;

// TTL deslizante: cada uso autenticado la renueva. Es la red de seguridad del backend —
// el cierre de pestaña ya borra la sesión del lado del cliente (sessionStorage), esto
// cubre el caso de una pestaña que queda abierta e inactiva indefinidamente.
const SESSION_IDLE_TTL_MS = Number(process.env.SESSION_IDLE_TTL_MS ?? 30 * 60_000);
const CLEANUP_INTERVAL_MS = Number(process.env.SESSION_CLEANUP_INTERVAL_MS ?? 60_000);

@Injectable()
export class SessionService implements OnModuleDestroy {
  private readonly sessionsById = new Map<string, SessionRecord>();
  private readonly idsByToken = new Map<string, string>();
  private readonly cleanupInterval = setInterval(() => this.sweepExpired(), CLEANUP_INTERVAL_MS);

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
  }

  createSession(): SessionRecord {
    const id = this.generateUniqueId();
    const token = randomBytes(32).toString('hex');
    const now = Date.now();
    const session: SessionRecord = { id, token, createdAt: now, expiresAt: now + SESSION_IDLE_TTL_MS };

    this.sessionsById.set(id, session);
    this.idsByToken.set(token, id);

    return session;
  }

  // Único punto de autenticación por token: si la sesión venció, la borra y la trata
  // como inexistente — "no accesible vía API aunque tenga el ID" aplica también al
  // propio token. Si sigue viva, el uso cuenta como actividad y renueva el TTL.
  getSessionByToken(token: string): SessionRecord | undefined {
    const id = this.idsByToken.get(token);
    if (!id) return undefined;

    const session = this.sessionsById.get(id);
    if (!session) return undefined;

    if (this.isExpired(session)) {
      this.deleteSession(session);
      return undefined;
    }

    session.expiresAt = Date.now() + SESSION_IDLE_TTL_MS;
    return session;
  }

  sessionExists(id: string): boolean {
    const session = this.sessionsById.get(id);
    if (!session) return false;

    if (this.isExpired(session)) {
      this.deleteSession(session);
      return false;
    }

    return true;
  }

  endSession(token: string): void {
    const id = this.idsByToken.get(token);
    const session = id ? this.sessionsById.get(id) : undefined;
    if (session) this.deleteSession(session);
  }

  private sweepExpired(): void {
    const now = Date.now();
    for (const session of this.sessionsById.values()) {
      if (session.expiresAt <= now) this.deleteSession(session);
    }
  }

  private isExpired(session: SessionRecord): boolean {
    return session.expiresAt <= Date.now();
  }

  private deleteSession(session: SessionRecord): void {
    this.idsByToken.delete(session.token);
    this.sessionsById.delete(session.id);
  }

  private generateUniqueId(): string {
    let id: string;
    do {
      id = `${this.randomGroup()}-${this.randomGroup()}`;
    } while (this.sessionsById.has(id));
    return id;
  }

  private randomGroup(): string {
    let group = '';
    for (let i = 0; i < ID_GROUP_LENGTH; i += 1) {
      group += ID_CHARSET[randomInt(ID_CHARSET.length)];
    }
    return group;
  }
}
