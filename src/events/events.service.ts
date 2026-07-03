import { Injectable, NotFoundException  } from '@nestjs/common';
import { CreateEventDto } from './dto/create-event.dto';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  async create(createEventDto: CreateEventDto, file: Express.Multer.File) {
    return this.prisma.event.create({
      data: {
        ...createEventDto,
        date: new Date(createEventDto.date),

        imageUrl: file ? (file as any).path : null, // Cloudinary puts the full URL in `path`
      },
    });
  }

  async findAll(page?: string, limit?: string, location?: string) {
    const pageNumber = Math.max(parseInt(page || '1'), 1);
    const limitNumber = Math.max(parseInt(limit || '10'), 1);

    const skip = (pageNumber - 1) * limitNumber;

    const where = {
      location: location || undefined,
    };

    const events = await this.prisma.event.findMany({
      where,
      skip,
      take: limitNumber,
    });

    const total = await this.prisma.event.count({ where });

    return {
      total,
      page: pageNumber,
      limit: limitNumber,
      data: events,
    };
  }

  async findOne(id: string) {
      const event = await this.prisma.event.findUnique({
        where: { id },
        include: {
          bookings: true,
        },
      });

      if (!event) {
        throw new NotFoundException('Event not found');
      }

      return event;
    }

  async getStats(location?: string) {
      const where = location ? { location } : undefined;

      const events = await this.prisma.event.findMany({
        where,
        include: { _count: { select: { bookings: true } } },
      });

      const totalEvents = events.length;
      const totalBookings = events.reduce((sum, e) => sum + e._count.bookings, 0);

      const perEvent = events.map((e) => ({
        eventId: e.id,
        title: e.title,
        location: e.location,
        maxSeats: e.maxSeats,
        bookedSeats: e._count.bookings,
        seatsRemaining: e.maxSeats - e._count.bookings,
      }));

      // Group totals by location too, so you can see all locations at a glance
      const byLocation = events.reduce((acc, e) => {
        if (!acc[e.location]) {
          acc[e.location] = { totalEvents: 0, totalBookings: 0, totalSeats: 0 };
        }
        acc[e.location].totalEvents += 1;
        acc[e.location].totalBookings += e._count.bookings;
        acc[e.location].totalSeats += e.maxSeats;
        return acc;
      }, {} as Record<string, { totalEvents: number; totalBookings: number; totalSeats: number }>);

      return {
        totalEvents,
        totalBookings,
        filteredByLocation: location || null,
        byLocation,
        events: perEvent,
      };
  }

  async updateEvent(id: string, data: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        ...data,
        ...(data.date && { date: new Date(data.date) }), // only convert if date was sent
      },
    });
  }

  async deleteEvent(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return this.prisma.event.delete({ where: { id } });
  }

  
  async searchEvents(query: string) {
    if (!query) {
      throw new Error('Search query is required');
    }

    return this.prisma.event.findMany({
      where: {
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            location: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
    });
  }

}