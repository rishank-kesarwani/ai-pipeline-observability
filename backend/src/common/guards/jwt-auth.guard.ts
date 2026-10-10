import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user || user.isAnonymous) {
      throw (
        err ||
        new UnauthorizedException(
          'Authenticated operator credentials required to execute this operation',
        )
      );
    }
    return user;
  }
}
