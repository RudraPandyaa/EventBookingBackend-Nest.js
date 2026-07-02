import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new BadRequestException('Event does not exist');
    }

    const bookingCount = await this.prisma.booking.count({ where: { eventId } });
    if (bookingCount >= event.maxSeats) {
      throw new BadRequestException('Event is fully booked');
    }

    const existingBooking = await this.prisma.booking.findFirst({
      where: { eventId, userId },
    });
    if (existingBooking) {
      throw new BadRequestException('You have already booked this event');
    }

    return this.prisma.booking.create({
      data: { eventId, userId },
    });
  }

  async findAll() {
    return this.prisma.booking.findMany({
      include: { event: true, user: true },
    });
  }

  async getUserBookings(userId: string) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: { event: true },
    });
  }

  async deleteBooking(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only delete your own bookings');
    }
    return this.prisma.booking.delete({ where: { id } });
  }
}