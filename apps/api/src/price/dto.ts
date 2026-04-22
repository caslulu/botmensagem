import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsObject, IsOptional, IsString, IsUUID, ValidateIf } from 'class-validator';

export class GeneratePriceDto {
  @IsIn(['quitado', 'financiado'])
  formType!: 'quitado' | 'financiado';

  @IsString()
  seguradora!: string;

  @IsOptional()
  @IsIn(['pt', 'en', 'es'])
  idioma?: 'pt' | 'en' | 'es';

  @IsOptional()
  @ValidateIf((_, value) => value !== '')
  @Type(() => Number)
  @IsNumber()
  taxaCotacao?: number;

  @IsOptional()
  @IsString()
  @ValidateIf((_, value) => value !== '')
  @IsUUID()
  cardId?: string;

  @IsObject()
  campos!: Record<string, unknown>;
}

export class SaveQuoteDto {
  @IsOptional()
  @IsString()
  @ValidateIf((_, value) => value !== '')
  @IsUUID()
  cardId?: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  processed?: Record<string, unknown>;
}
