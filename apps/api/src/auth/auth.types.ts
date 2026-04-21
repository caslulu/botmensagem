import type { Request } from 'express';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string | null;
};

export type TokenPayload = AuthUser & {
  sub: string;
  iat: number;
  exp: number;
};

export type RequestWithUser = Request & {
  user?: AuthUser;
};
