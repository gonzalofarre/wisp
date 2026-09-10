import { Injectable } from '@nestjs/common';

// Compartido entre RealtimeGateway (que la actualiza en cada connect/disconnect y hace
// los broadcasts en vivo) y ChatController (que la lee para el punto online/offline del
// listado de chats por REST) — antes vivía solo dentro del gateway, pero el listado
// necesitaba la misma respuesta a "¿está online ahora mismo?" sin abrir un socket.
@Injectable()
export class PresenceService {
  // Cuenta de sockets por sesión, no un booleano: la misma sesión puede tener más de un
  // socket vivo (dos pestañas, o una reconexión que todavía no cerró la anterior).
  private readonly onlineSocketCountBySessionId = new Map<string, number>();

  // Devuelve true solo la primera vez que esta sesión pasa a tener algún socket vivo —
  // así el caller sabe si vale la pena avisarle a alguien que "se conectó".
  markOnline(sessionId: string): boolean {
    const previousCount = this.onlineSocketCountBySessionId.get(sessionId) ?? 0;
    this.onlineSocketCountBySessionId.set(sessionId, previousCount + 1);
    return previousCount === 0;
  }

  // Devuelve true solo cuando el último socket de esta sesión se cerró.
  markOffline(sessionId: string): boolean {
    const nextCount = (this.onlineSocketCountBySessionId.get(sessionId) ?? 1) - 1;
    if (nextCount <= 0) {
      this.onlineSocketCountBySessionId.delete(sessionId);
      return true;
    }
    this.onlineSocketCountBySessionId.set(sessionId, nextCount);
    return false;
  }

  isOnline(sessionId: string): boolean {
    return (this.onlineSocketCountBySessionId.get(sessionId) ?? 0) > 0;
  }
}
