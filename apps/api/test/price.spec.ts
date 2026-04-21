import { processFinanciado, processQuitado } from '../src/price/price.service';

describe('price processing', () => {
  it('adds the quote fee to paid-off basic and full totals', () => {
    const processed = processQuitado(
      {
        nome: 'Ana',
        entrada_basico: '100.00',
        mensal_basico: '80',
        valor_total_basico: '500.00',
        entrada_completo: '200',
        mensal_completo: '120',
        valor_total_completo: '900'
      },
      320
    );

    expect(processed.entrada_basico).toBe('420.00');
    expect(processed.valor_total_basico).toBe('820.00');
    expect(processed.entrada_completo).toBe('520.00');
    expect(processed.valor_total_completo).toBe('1,220.00');
    expect(processed.mensal_completo).toBe('120');
  });

  it('adds the quote fee to financed full totals', () => {
    const processed = processFinanciado(
      {
        nome: 'Bruno',
        entrada_completo: '$1,000.00',
        mensal_completo: '150',
        valor_total_completo: '1,400.00'
      },
      400
    );

    expect(processed.entrada_completo).toBe('1,400.00');
    expect(processed.valor_total_completo).toBe('1,800.00');
    expect(processed.mensal_completo).toBe('150');
  });
});
