import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryProvider } from '../cloudinary/cloudinary.provider';

@Module({
  imports: [PrismaModule], 
  controllers: [EventsController],
  providers: [EventsService, CloudinaryProvider],
  exports: [EventsService],
})
export class EventsModule {}