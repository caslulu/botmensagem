import { Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateColumnDto {
  @IsString()
  title!: string;
}

export class UpdateColumnDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  position?: number;
}

export class CreateCardDto {
  @IsOptional()
  @IsString()
  columnId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsObject()
  payload!: Record<string, unknown>;
}

export class UpdateCardDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}

export class MoveCardDto {
  @IsString()
  columnId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  position!: number;
}
