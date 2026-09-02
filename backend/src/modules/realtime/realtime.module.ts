import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway.js';
import { SessionModule } from '../session/session.module.js';
import { ChatModule } from '../chat/chat.module.js';
import { MediaModule } from '../media/media.module.js';

@Module({
  imports: [SessionModule, ChatModule, MediaModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
