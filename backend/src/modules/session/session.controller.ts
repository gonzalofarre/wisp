import { Controller, Delete, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { SessionService } from './session.service.js';
import { SessionAuthGuard, type AuthenticatedRequest } from './session-auth.guard.js';
import { RateLimitGuard } from './rate-limit.guard.js';

@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @UseGuards(RateLimitGuard)
  create() {
    const { id, token } = this.sessionService.createSession();
    return { id, token };
  }

  @Delete()
  @UseGuards(SessionAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  end(@Req() request: AuthenticatedRequest) {
    this.sessionService.endSession(request.session.token);
  }
}
