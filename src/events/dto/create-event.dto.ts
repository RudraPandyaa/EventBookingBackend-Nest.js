import { Type } from 'class-transformer';
import { IsString, IsNotEmpty,IsNumber, IsDateString } from 'class-validator';

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
}