import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(eventId: string, userId: string) {
        const MAX_RETRIES = 3;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const event = await tx.event.findUnique({ where: { id: eventId } });
            if (!event) {
              throw new BadRequestException('Event does not exist');
            }

            // Only ACTIVE bookings count toward capacity
            const bookingCount = await tx.booking.count({
              where: { eventId, status: 'ACTIVE' },
            });
            if (bookingCount >= event.maxSeats) {
              throw new BadRequestException('Event is fully booked');
            }

            const existingActiveBooking = await tx.booking.findFirst({
              where: { eventId, userId, status: 'ACTIVE' },
            });
            if (existingActiveBooking) {
              throw new BadRequestException('You have already booked this event');
            }

            // If a CANCELLED booking exists for this user+event, reactivate
            // it instead of inserting a new row (avoids @@unique conflict)
            const cancelledBooking = await tx.booking.findFirst({
              where: { eventId, userId, status: 'CANCELLED' },
            });

            if (cancelledBooking) {
              return tx.booking.update({
                where: { id: cancelledBooking.id },
                data: {
                  status: 'ACTIVE',
                  paymentStatus: 'PENDING',
                  cancelledAt: null,
                  razorpayOrderId: null,
                  razorpayPaymentId: null,
                },
              });
            }

            return tx.booking.create({ data: { eventId, userId } });
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        // P2034 = Prisma's conflict code under Serializable isolation.
        // Safe to just retry — it means another booking happened at the
        // exact same instant, not that anything is actually broken.
        if (error.code === 'P2034' && attempt < MAX_RETRIES) {
          continue;
        }
        throw error;
      }
    }
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

  async cancelBooking(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }
    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Booking is already cancelled');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
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