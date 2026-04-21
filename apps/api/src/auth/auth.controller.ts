import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import type { Response } from 'express';
import { LoginDto } from './auth.dto';
import { AuthService } from './auth.service';
import { Public } from './public.decorator';
import type { RequestWithUser } from './auth.types';

const SESSION_COOKIE = 'botmensagem_session';

function shouldUseSecureCookie(): boolean {
  if (process.env.AUTH_COOKIE_SECURE) {
    return process.env.AUTH_COOKIE_SECURE === 'true';
  }
  return process.env.NODE_ENV === 'production';
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.authService.login(dto);
    response.cookie(SESSION_COOKIE, session.token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: shouldUseSecureCookie(),
      path: '/',
      expires: new Date(session.expiresAt)
    });

    return {
      expiresAt: session.expiresAt,
      user: session.user
    };
  }

  @Public()
  @Post('logout')
  logout(@Res({ passthrough: true }) response: Response) {
    response.clearCookie(SESSION_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: shouldUseSecureCookie(),
      path: '/'
    });
    return { ok: true };
  }

  @Get('me')
  me(@Req() request: RequestWithUser) {
    return { user: request.user };
  }
}
