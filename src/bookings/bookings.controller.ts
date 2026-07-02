import { Controller, Post, Body, Get, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  create(@Body() dto: CreateBookingDto, @Req() req) {
    return this.bookingsService.create(dto.eventId, req.user.userId);
  }

  @Get()
  findAll() {
    return this.bookingsService.findAll();
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('user')
  getUserBookings(@Req() req) {
    return this.bookingsService.getUserBookings(req.user.userId);
  }
  
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':id')
  deleteBooking(@Param('id') id: string, @Req() req) {
    return this.bookingsService.deleteBooking(id, req.user.userId);
  }

}