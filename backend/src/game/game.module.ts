import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { LobbyService } from './services/lobby.service';

@Module({
  providers: [GameGateway, GameService, LobbyService],
})
export class GameModule {}