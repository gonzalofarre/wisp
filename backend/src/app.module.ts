import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { SessionModule } from './modules/session/session.module.js';
import { ChatModule } from './modules/chat/chat.module.js';
import { MediaModule } from './modules/media/media.module.js';
import { RealtimeModule } from './modules/realtime/realtime.module.js';

@Module({
  imports: [SessionModule, ChatModule, MediaModule, RealtimeModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
