import { SetMetadata } from '@nestjs/common';

// Lets us write @Roles('ADMIN') on any route to declare who's allowed in
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);