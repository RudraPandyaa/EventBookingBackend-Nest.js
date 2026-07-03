import { Type } from 'class-transformer';
import { IsString, IsNotEmpty,IsNumber, IsDateString, Min } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  description: string;

  @IsString()
  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @Type(() => Number)
  @IsNumber()
  maxSeats: number;

  @IsNumber()
  @Min(1)
  price: number;
}