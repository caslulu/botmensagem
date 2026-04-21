import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import type { RequestWithUser } from '../auth/auth.types';
import { ChangePasswordDto, CreateUserDto, UpdateProfileDto, UpdateUserDto } from './dto';
import { UsersService } from './users.service';

const ALLOWED_AVATAR_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('admin')
  @Get('users')
  listUsers() {
    return this.usersService.listUsers();
  }

  @Roles('admin')
  @Post('users')
  createUser(@Body() dto: CreateUserDto) {
    return this.usersService.createUser(dto);
  }

  @Roles('admin')
  @Patch('users/:id')
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto, @Req() request: RequestWithUser) {
    return this.usersService.updateUser(id, dto, request.user!);
  }

  @Patch('profile')
  updateProfile(@Body() dto: UpdateProfileDto, @Req() request: RequestWithUser) {
    return this.usersService.updateProfile(request.user!, dto);
  }

  @Patch('profile/password')
  changePassword(@Body() dto: ChangePasswordDto, @Req() request: RequestWithUser) {
    return this.usersService.changePassword(request.user!, dto);
  }

  @Post('profile/avatar')
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }))
  updateAvatar(@UploadedFile() file: Express.Multer.File | undefined, @Req() request: RequestWithUser) {
    if (!file) throw new BadRequestException('Foto obrigatoria.');
    if (!ALLOWED_AVATAR_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Use uma imagem PNG, JPG ou WEBP.');
    }
    return this.usersService.updateAvatar(request.user!, file);
  }

  @Get('users/:id/avatar')
  async getAvatar(@Param('id') id: string, @Req() request: RequestWithUser, @Res() response: Response) {
    const avatar = await this.usersService.getAvatar(id, request.user!);
    response.setHeader('Content-Type', avatar.mimeType);
    response.setHeader('Cache-Control', 'private, max-age=3600');
    return response.sendFile(avatar.path);
  }
}
