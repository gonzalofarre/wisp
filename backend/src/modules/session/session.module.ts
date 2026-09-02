import { Module } from '@nestjs/common';
import { SessionService } from './session.service.js';
import { SessionController } from './session.controller.js';
import { SessionAuthGuard } from './session-auth.guard.js';
import { RateLimitGuard } from './rate-limit.guard.js';

@Module({
  controllers: [SessionController],
  providers: [SessionService, SessionAuthGuard, RateLimitGuard],
  exports: [SessionService, SessionAuthGuard, RateLimitGuard],
})
export class SessionModule {}
