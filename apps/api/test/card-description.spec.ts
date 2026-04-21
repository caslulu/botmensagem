import { buildCardDescription } from '../src/kanban/card-description';

describe('buildCardDescription', () => {
  it('keeps the legacy card fields in a deterministic description', () => {
    const description = buildCardDescription({
      nome: 'Maria Silva',
      documento: 'D1234',
      documento_estado: 'FL',
      estado_civil: 'Casado(a)',
      genero: 'Feminino',
      endereco_rua: '123 Main St',
      endereco_apt: '4B',
      endereco_cidade: 'Orlando',
      endereco_estado: 'FL',
      endereco_zipcode: '32801',
      data_nascimento: '1990-05-20',
      tempo_de_seguro: '1-3 anos',
      tempo_no_endereco: 'Mais de 1 ano',
      veiculos: [{ vin: '1HGCM82633A004352', placa: 'ABC123', ano: '2022', marca: 'Toyota', modelo: 'Corolla' }],
      pessoas: [{ nome: 'Joao Silva', documento: 'X1', documento_estado: 'FL', data_nascimento: '1988-01-10', parentesco: 'Conjuge', genero: 'Masculino' }],
      observacoes: 'Cliente prefere Progressive.'
    });

    expect(description).toContain('Documento: D1234');
    expect(description).toContain('Estado do Documento: FL');
    expect(description).toContain('Endereço: 123 Main St, Apt 4B, Orlando - FL, 32801');
    expect(description).toContain('Data de Nascimento: 05/20/1990');
    expect(description).toContain('VEÍCULOS:');
    expect(description).toContain('VIN: 1HGCM82633A004352');
    expect(description).toContain('DRIVERS ADICIONAIS:');
    expect(description).toContain('OBSERVAÇÕES:');
  });
});
