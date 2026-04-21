import { Injectable, UnauthorizedException } from '@nestjs/common';
import { publicApiUrl } from '../common/paths';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './auth.dto';
import { AuthUser } from './auth.types';
import { PasswordService } from './password.service';
import { TokenService } from './token.service';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  passwordHash: true,
  avatarUpdatedAt: true
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: USER_SELECT
    });

    if (!user || !user.isActive) {
      console.warn(`Login recusado para ${email}: usuario inexistente ou inativo.`);
      throw new UnauthorizedException('Email ou senha invalidos.');
    }

    const validPassword = await this.passwordService.verify(dto.password, user.passwordHash);
    if (!validPassword) {
      console.warn(`Login recusado para ${email}: senha invalida.`);
      throw new UnauthorizedException('Email ou senha invalidos.');
    }

    const authUser = this.toAuthUser(user);
    const signed = this.tokenService.sign(authUser);
    console.info(`Login realizado para ${email}.`);

    return {
      ...signed,
      user: authUser
    };
  }

  async authenticateToken(token: string): Promise<AuthUser> {
    const payload = this.tokenService.verify(token);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: USER_SELECT
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Sessao invalida.');
    }

    return this.toAuthUser(user);
  }

  private toAuthUser(user: { id: string; email: string; name: string; role: string; avatarUpdatedAt?: Date | null }): AuthUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatarUpdatedAt
        ? `${publicApiUrl()}/users/${encodeURIComponent(user.id)}/avatar?v=${encodeURIComponent(user.avatarUpdatedAt.toISOString())}`
        : null
    };
  }
}
