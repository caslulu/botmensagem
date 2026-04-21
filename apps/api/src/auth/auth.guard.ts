import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { IS_PUBLIC_ROUTE } from './public.decorator';
import type { RequestWithUser } from './auth.types';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_ROUTE, [context.getHandler(), context.getClass()]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractBearerToken(request.headers.authorization) || this.extractCookieToken(request.headers.cookie);
    if (!token) {
      throw new UnauthorizedException('Login necessario.');
    }

    request.user = await this.authService.authenticateToken(token);
    return true;
  }

  private extractBearerToken(header: string | undefined): string {
    if (!header) return '';
    const [type, token] = header.split(' ');
    return type?.toLowerCase() === 'bearer' && token ? token : '';
  }

  private extractCookieToken(header: string | undefined): string {
    if (!header) return '';
    const cookies = header.split(';').map((part) => part.trim());
    const sessionCookie = cookies.find((cookie) => cookie.startsWith('botmensagem_session='));
    if (!sessionCookie) return '';
    return decodeURIComponent(sessionCookie.slice('botmensagem_session='.length));
  }
}
