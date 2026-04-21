import { Body, Controller, Get, Post } from '@nestjs/common';
import { GeneratePriceDto, SaveQuoteDto } from './dto';
import { PriceService } from './price.service';

@Controller()
export class PriceController {
  constructor(private readonly priceService: PriceService) {}

  @Get('quotes')
  listQuotes() {
    return this.priceService.listQuotes();
  }

  @Post('quotes')
  saveQuote(@Body() dto: SaveQuoteDto) {
    return this.priceService.saveQuote(dto);
  }

  @Post('price/generate')
  generate(@Body() dto: GeneratePriceDto) {
    return this.priceService.generate(dto);
  }
}
