import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: '9b308f76-a9b4-4a8b-91ce-af22bca41f79' })
  @IsUUID()
  eventId: string;
}