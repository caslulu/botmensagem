import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsObject, IsOptional, IsString, ValidateIf } from 'class-validator';

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
  cardId?: string;

  @IsObject()
  campos!: Record<string, unknown>;
}

export class SaveQuoteDto {
  @IsOptional()
  @IsString()
  cardId?: string;

  @IsObject()
  payload!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  processed?: Record<string, unknown>;
}
