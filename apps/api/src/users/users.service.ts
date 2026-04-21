import fs from 'node:fs';
import path from 'node:path';
import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { publicApiUrl, sanitizeFileName, storagePath, ensureDir } from '../common/paths';
import { PrismaService } from '../prisma/prisma.service';
import { AuthUser } from '../auth/auth.types';
import { PasswordService } from '../auth/password.service';
import { ChangePasswordDto, CreateUserDto, UpdateProfileDto, UpdateUserDto } from './dto';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  isActive: true,
  avatarPath: true,
  avatarMimeType: true,
  avatarUpdatedAt: true,
  createdAt: true,
  updatedAt: true
};

type SelectedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  avatarPath: string | null;
  avatarMimeType: string | null;
  avatarUpdatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService
  ) {}

  async listUsers() {
    const users = await this.prisma.user.findMany({
      select: USER_SELECT,
      orderBy: [{ role: 'asc' }, { name: 'asc' }]
    });

    return { users: users.map((user) => this.toResponse(user)) };
  }

  async createUser(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    await this.ensureEmailAvailable(email);
    const passwordHash = await this.passwordService.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash,
        role: dto.role,
        isActive: true
      },
      select: USER_SELECT
    });

    console.info(`Usuario criado: ${email} (${dto.role}).`);
    return { user: this.toResponse(user) };
  }

  async updateUser(id: string, dto: UpdateUserDto, actor: AuthUser) {
    const current = await this.findUserOrThrow(id);
    const data: Record<string, unknown> = {};

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      await this.ensureEmailAvailable(email, id);
      data.email = email;
    }

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.password !== undefined) data.passwordHash = await this.passwordService.hash(dto.password);

    if (actor.id === id && data.isActive === false) {
      throw new BadRequestException('Voce nao pode desativar sua propria conta.');
    }

    if (actor.id === id && data.role && data.role !== current.role) {
      throw new BadRequestException('Voce nao pode alterar sua propria funcao.');
    }

    const user = await this.prisma.user.update({
      where: { id },
      data,
      select: USER_SELECT
    });

    return { user: this.toResponse(user) };
  }

  async updateProfile(actor: AuthUser, dto: UpdateProfileDto) {
    const data: Record<string, unknown> = {};

    if (dto.email !== undefined) {
      const email = dto.email.trim().toLowerCase();
      await this.ensureEmailAvailable(email, actor.id);
      data.email = email;
    }

    if (dto.name !== undefined) data.name = dto.name.trim();

    if (!Object.keys(data).length) {
      const current = await this.findUserOrThrow(actor.id);
      return { user: this.toResponse(current) };
    }

    const user = await this.prisma.user.update({
      where: { id: actor.id },
      data,
      select: USER_SELECT
    });

    return { user: this.toResponse(user) };
  }

  async changePassword(actor: AuthUser, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { id: true, passwordHash: true }
    });

    if (!user) throw new UnauthorizedException('Sessao invalida.');
    const validPassword = await this.passwordService.verify(dto.currentPassword, user.passwordHash);
    if (!validPassword) {
      throw new ForbiddenException('Senha atual invalida.');
    }

    await this.prisma.user.update({
      where: { id: actor.id },
      data: { passwordHash: await this.passwordService.hash(dto.newPassword) }
    });

    console.info(`Senha alterada para ${actor.email}.`);
    return { ok: true };
  }

  async updateAvatar(actor: AuthUser, file: Express.Multer.File) {
    const uploadsDir = ensureDir(path.join(storagePath('UPLOADS_DIR', path.join(process.cwd(), 'storage', 'uploads')), 'avatars'));
    const extension = this.extensionForMimeType(file.mimetype);
    const filename = `${randomUUID()}-${sanitizeFileName(actor.email)}${extension}`;
    const targetPath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(targetPath, file.buffer);

    const previous = await this.prisma.user.findUnique({
      where: { id: actor.id },
      select: { avatarPath: true }
    });

    const user = await this.prisma.user.update({
      where: { id: actor.id },
      data: {
        avatarPath: targetPath,
        avatarMimeType: file.mimetype,
        avatarUpdatedAt: new Date()
      },
      select: USER_SELECT
    });

    if (previous?.avatarPath && previous.avatarPath !== targetPath) {
      await fs.promises.rm(previous.avatarPath, { force: true }).catch(() => undefined);
    }

    return { user: this.toResponse(user) };
  }

  async getAvatar(id: string, actor: AuthUser) {
    if (actor.id !== id && actor.role !== 'admin') {
      throw new ForbiddenException('Acesso restrito.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { avatarPath: true, avatarMimeType: true }
    });

    if (!user?.avatarPath || !user.avatarMimeType || !fs.existsSync(user.avatarPath)) {
      throw new NotFoundException('Foto nao encontrada.');
    }

    return {
      path: user.avatarPath,
      mimeType: user.avatarMimeType
    };
  }

  private async findUserOrThrow(id: string): Promise<SelectedUser> {
    const user = await this.prisma.user.findUnique({ where: { id }, select: USER_SELECT });
    if (!user) throw new NotFoundException('Usuario nao encontrado.');
    return user;
  }

  private async ensureEmailAvailable(email: string, ignoreId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing && existing.id !== ignoreId) {
      throw new ConflictException('Email ja esta em uso.');
    }
  }

  private extensionForMimeType(mimeType: string): string {
    if (mimeType === 'image/png') return '.png';
    if (mimeType === 'image/webp') return '.webp';
    return '.jpg';
  }

  private toResponse(user: SelectedUser) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      avatarUrl: user.avatarUpdatedAt
        ? `${publicApiUrl()}/users/${encodeURIComponent(user.id)}/avatar?v=${encodeURIComponent(user.avatarUpdatedAt.toISOString())}`
        : null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };
  }
}
