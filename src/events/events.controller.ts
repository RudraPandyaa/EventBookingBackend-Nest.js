import {
  Controller, Post, Body, Get, Param, Query,
  UseInterceptors, Patch, UploadedFile, Delete
} from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { ApiQuery, ApiConsumes, ApiBody, ApiBearerAuth  } from '@nestjs/swagger';
import { UpdateEventDto } from './dto/update-event.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import * as os from 'os';
import * as path from 'path';
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @ApiBearerAuth()
    @Post()
    @UseInterceptors(
      FileInterceptor('image', {
        storage: diskStorage({
          destination: path.join(os.tmpdir(), 'uploads'), // /tmp/uploads on Vercel, writable
          filename: (req, file, cb) => {
            const uniqueName = Date.now() + '-' + file.originalname;
            cb(null, uniqueName);
          },
        }),
      }),
    )
    @ApiConsumes('multipart/form-data')
    @ApiBody({
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string', example: 'FIFA WC26' },
          description: { type: 'string', example: 'Football' },
          date: { type: 'string', example: '2026-07-14' },
          location: { type: 'string', example: 'USA' },
          maxSeats: { type: 'number', example: 10 },
          image: { type: 'string', format: 'binary' },
          price: { type: 'number', example: 499 },
        },
      },
    })
    create(
      @UploadedFile() file: Express.Multer.File,
      @Body() createEventDto: CreateEventDto,
    ) {
      return this.eventsService.create(createEventDto, file);
    }


  
  @Get()
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '10' })
  @ApiQuery({ name: 'location', required: false, example: 'Ahmedabad' })
  getEvents(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('location') location?: string,
  ) {
    return this.eventsService.findAll(page, limit, location);
  }

  @Get('stats')
  @ApiQuery({ name: 'location', required: false, example: 'Ahmedabad' })
  getStats(@Query('location') location?: string) {
    return this.eventsService.getStats(location);
  }
  
  @Get('search')
  searchEvents(@Query('query') query: string) {
    return this.eventsService.searchEvents(query);
  }

  @Get(':id')
  getEventById(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @Patch(':id')
  updateEvent(@Param('id') id: string, @Body() data: UpdateEventDto) {
    return this.eventsService.updateEvent(id, data);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @Delete(':id')
  deleteEvent(@Param('id') id: string) {
    return this.eventsService.deleteEvent(id);
  }
}