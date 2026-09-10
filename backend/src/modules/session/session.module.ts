import { Module } from '@nestjs/common';
import { SessionService } from './session.service.js';
import { SessionController } from './session.controller.js';
import { SessionAuthGuard } from './session-auth.guard.js';
import { RateLimitGuard } from './rate-limit.guard.js';
import { PresenceService } from './presence.service.js';

@Module({
  controllers: [SessionController],
  providers: [SessionService, SessionAuthGuard, RateLimitGuard, PresenceService],
  exports: [SessionService, SessionAuthGuard, RateLimitGuard, PresenceService],
})
export class SessionModule {}
