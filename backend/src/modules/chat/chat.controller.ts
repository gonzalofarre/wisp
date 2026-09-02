import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ChatService } from './chat.service.js';
import { SessionService } from '../session/session.service.js';
import { SessionAuthGuard, type AuthenticatedRequest } from '../session/session-auth.guard.js';
import { RateLimitGuard } from '../session/rate-limit.guard.js';

interface CreateChatBody {
  recipientId?: unknown;
}

@Controller('chat')
@UseGuards(SessionAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly sessionService: SessionService,
  ) {}

  @Post()
  @UseGuards(RateLimitGuard)
  create(@Body() body: CreateChatBody, @Req() request: AuthenticatedRequest) {
    const recipientId = this.normalizeRecipientId(body.recipientId);
    const ownId = request.session.id;

    if (recipientId === ownId) {
      throw new BadRequestException("You can't start a chat with yourself");
    }

    if (!this.sessionService.sessionExists(recipientId)) {
      throw new NotFoundException('Recipient ID not found');
    }

    const chat = this.chatService.createOrGetChat(ownId, recipientId);
    return { chatId: chat.id, recipientId, status: chat.status };
  }

  // Declarado antes de ':id' — si no, Nest/Express matchea "requests" contra el
  // parámetro :id del GET de abajo y esta ruta nunca se alcanza.
  @Get('requests')
  listRequests(@Req() request: AuthenticatedRequest) {
    const pending = this.chatService.getPendingRequestsFor(request.session.id);
    return pending.map((chat) => ({ chatId: chat.id, fromId: chat.requestedBy, createdAt: chat.createdAt }));
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const ownId = request.session.id;
    const chat = this.chatService.getChatForParticipant(id, ownId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const recipientId = chat.participantIds.find((participantId) => participantId !== ownId) ?? ownId;
    return { chatId: chat.id, recipientId };
  }

  @Post(':id/accept')
  accept(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    const chat = this.chatService.respondToRequest(id, request.session.id, true);
    if (!chat) throw new NotFoundException('Request not found');

    const recipientId = chat.participantIds.find((p) => p !== request.session.id) ?? request.session.id;
    return { chatId: chat.id, recipientId };
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  reject(@Param('id') id: string, @Req() request: AuthenticatedRequest): void {
    const chat = this.chatService.respondToRequest(id, request.session.id, false);
    if (!chat) throw new NotFoundException('Request not found');
  }

  private normalizeRecipientId(recipientId: unknown): string {
    if (typeof recipientId !== 'string') {
      throw new BadRequestException('recipientId is required');
    }

    const normalized = recipientId.trim().toUpperCase();
    if (!normalized) {
      throw new BadRequestException('recipientId is required');
    }

    return normalized;
  }
}
