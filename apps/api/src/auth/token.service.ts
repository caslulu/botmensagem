import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { AuthUser, TokenPayload } from './auth.types';

const TOKEN_VERSION = 1;
const DEFAULT_TOKEN_TTL_SECONDS = 12 * 60 * 60;
const DEV_SECRET = 'botmensagem-development-auth-secret-change-before-production';

function encodeBase64Url(value: Buffer | string): string {
  return Buffer.from(value).toString('base64url');
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, 'base64url').toString('utf8');
}

@Injectable()
export class TokenService {
  private readonly secret = this.resolveSecret();
  private readonly ttlSeconds = this.resolveTtlSeconds();

  sign(user: AuthUser): { token: string; expiresAt: string } {
    const now = Math.floor(Date.now() / 1000);
    const payload: TokenPayload = {
      ...user,
      sub: user.id,
      iat: now,
      exp: now + this.ttlSeconds
    };
    const header = { alg: 'HS256', typ: 'JWT', v: TOKEN_VERSION };
    const body = `${encodeBase64Url(JSON.stringify(header))}.${encodeBase64Url(JSON.stringify(payload))}`;
    const signature = this.signBody(body);

    return {
      token: `${body}.${signature}`,
      expiresAt: new Date(payload.exp * 1000).toISOString()
    };
  }

  verify(token: string): TokenPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const body = `${encodedHeader}.${encodedPayload}`;
    const expectedSignature = this.signBody(body);

    if (!this.safeEqual(signature, expectedSignature)) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    try {
      const header = JSON.parse(decodeBase64Url(encodedHeader)) as { alg?: string; v?: number };
      const payload = JSON.parse(decodeBase64Url(encodedPayload)) as TokenPayload;
      const now = Math.floor(Date.now() / 1000);

      if (header.alg !== 'HS256' || header.v !== TOKEN_VERSION || !payload.sub || payload.exp <= now) {
        throw new UnauthorizedException('Sessao expirada.');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Sessao invalida.');
    }
  }

  private signBody(body: string): string {
    return createHmac('sha256', this.secret).update(body).digest('base64url');
  }

  private safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
  }

  private resolveSecret(): string {
    const configured = process.env.AUTH_SECRET?.trim();
    if (configured) return configured;

    if (process.env.NODE_ENV === 'production') {
      throw new Error('AUTH_SECRET precisa ser configurado em producao.');
    }

    return DEV_SECRET;
  }

  private resolveTtlSeconds(): number {
    const configured = Number(process.env.AUTH_TOKEN_TTL_SECONDS || DEFAULT_TOKEN_TTL_SECONDS);
    if (!Number.isFinite(configured) || configured < 300) return DEFAULT_TOKEN_TTL_SECONDS;
    return Math.floor(configured);
  }
}
