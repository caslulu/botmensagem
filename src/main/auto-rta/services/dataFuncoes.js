// Funções utilitárias migradas de data_funcoes.py

function parseFloatVal(val) {
    return parseFloat(val) || 0;
}

function veiculoVin(vin) {
    // Exemplo: validação simples de VIN
    return typeof vin === 'string' && vin.length === 17;
}

function formatarData(data) {
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
}

function separarNome(nome) {
    if (!nome) return { primeiro: '', ultimo: '' };
    const partes = nome.split(' ');
    return { primeiro: partes[0], ultimo: partes.slice(1).join(' ') };
}

function separarDocumento(documentoCompleto) {
    // Exemplo: separa tipo e número
    const [tipo, ...resto] = documentoCompleto.split(' ');
    return { tipo, numero: resto.join(' ') };
}

function separarEndereco(enderecoCompleto) {
    // Exemplo: separa rua e número
    const partes = enderecoCompleto.split(',');
    return { rua: partes[0], numero: partes[1] || '' };
}

function decodificarVin(vin) {
    // Exemplo: retorna objeto com partes do VIN
    return { vin, valido: veiculoVin(vin) };
}

function formatarComVirgula(numero) {
    return Number(numero).toLocaleString('pt-BR');
}

module.exports = {
    parseFloatVal,
    veiculoVin,
    formatarData,
    separarNome,
    separarDocumento,
    separarEndereco,
    decodificarVin,
    formatarComVirgula,
};
