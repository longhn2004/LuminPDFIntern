import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  @Transform(({ value }) => value?.trim().toLowerCase())
  email: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  // @Matches(/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
  //   message: 'Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number',
  // })
  password: string;

  @IsString({ message: 'Name must be a string' })
  @IsNotEmpty({ message: 'Name is required' })
  @MinLength(2, { message: 'Name must be at least 2 characters long' })
  @Transform(({ value }) => value?.trim())
  name: string;
}
