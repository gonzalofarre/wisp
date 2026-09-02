import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, OnModuleDestroy } from '@nestjs/common';
import type { Request } from 'express';

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 10;
const CLEANUP_INTERVAL_MS = 5 * 60_000;

interface Bucket {
  count: number;
  windowStartedAt: number;
}

// Rate limiter simple en memoria, por IP — suficiente para v1 de un solo proceso.
// @nestjs/throttler todavía no publica soporte para Nest 12 (peer dep tope en ^11), así que se
// evita forzar una resolución de dependencias potencialmente rota por un rate limiter genérico.
@Injectable()
export class RateLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly buckets = new Map<string, Bucket>();
  // Sin esto, cada IP que alguna vez pegó acá queda ocupando memoria para siempre — en un
  // servicio público de cara a internet eso sí importa con el tiempo, aunque sea un rate
  // limiter simple de un solo proceso.
  private readonly cleanupInterval = setInterval(() => this.sweepStaleBuckets(), CLEANUP_INTERVAL_MS);

  onModuleDestroy(): void {
    clearInterval(this.cleanupInterval);
  }

  private sweepStaleBuckets(): void {
    const now = Date.now();
    for (const [key, bucket] of this.buckets) {
      if (now - bucket.windowStartedAt >= WINDOW_MS) this.buckets.delete(key);
    }
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const key = request.ip ?? 'unknown';
    const now = Date.now();

    const bucket = this.buckets.get(key);

    if (!bucket || now - bucket.windowStartedAt >= WINDOW_MS) {
      this.buckets.set(key, { count: 1, windowStartedAt: now });
      return true;
    }

    if (bucket.count >= MAX_REQUESTS_PER_WINDOW) {
      throw new HttpException('Too many session requests — try again in a minute', HttpStatus.TOO_MANY_REQUESTS);
    }

    bucket.count += 1;
    return true;
  }
}
