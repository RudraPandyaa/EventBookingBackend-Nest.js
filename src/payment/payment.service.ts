import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentService {
  private razorpay: Razorpay;

  constructor(private prisma: PrismaService) {
    const key_id = process.env.RAZORPAY_KEY_ID;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;

    if (!key_id || !key_secret) {
      throw new Error('Razorpay keys are missing in .env');
    }

    this.razorpay = new Razorpay({
      key_id,
      key_secret,
    });
  }

  // ✅ CREATE ORDER
  async createOrder(bookingId: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { event: true },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.userId !== userId)
      throw new BadRequestException('Not your booking');
    if (booking.paymentStatus === 'PAID')
      throw new BadRequestException('Already paid');

        const price = booking.event.price;

        // DEBUG (remove later)
        console.log('EVENT PRICE:', price);

        if (!price || price <= 0) {
        throw new BadRequestException('Invalid event price');
        }

        // Razorpay needs minimum 100 paise (₹1)
        const amount = Math.max(Math.floor(price * 100), 100);

        console.log('FINAL AMOUNT (paise):', amount);

        const order = await this.razorpay.orders.create({
        amount,
        currency: 'INR',
        receipt: booking.id,
        });

    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { razorpayOrderId: order.id },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  // ✅ VERIFY PAYMENT
  async verifyPayment(dto: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = dto;

    const secret = process.env.RAZORPAY_KEY_SECRET;

    if (!secret) {
      throw new Error('RAZORPAY_KEY_SECRET is missing');
    }

    // 🔐 Generate signature
    const generatedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    // ❌ Signature mismatch → FAIL
    if (generatedSignature !== razorpay_signature) {
      await this.prisma.booking.update({
        where: { razorpayOrderId: razorpay_order_id },
        data: { paymentStatus: 'FAILED' },
      });

      throw new BadRequestException('Payment verification failed');
    }

    // ✅ Find booking safely
    const booking = await this.prisma.booking.findUnique({
      where: { razorpayOrderId: razorpay_order_id },
    });

    if (!booking) {
      throw new NotFoundException('Booking not found for this order');
    }

    // 🔁 Idempotency check (VERY IMPORTANT)
    if (booking.paymentStatus === 'PAID') {
      return { message: 'Already verified', booking };
    }

    // ✅ Mark as paid
    const updatedBooking = await this.prisma.booking.update({
      where: { razorpayOrderId: razorpay_order_id },
      data: {
        paymentStatus: 'PAID',
        razorpayPaymentId: razorpay_payment_id,
      },
    });

    return {
      message: 'Payment verified successfully',
      booking: updatedBooking,
    };
  }
}