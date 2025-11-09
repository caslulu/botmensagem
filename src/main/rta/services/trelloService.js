// Exemplo de serviço para Trello migrado de Python para Node.js

function formatarVeiculos(veiculos) {
    return veiculos.map(v => v.modelo + ' - ' + v.placa).join(', ');
}

function formatUsDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US');
}

function formatarPessoas(pessoas) {
    return pessoas.map(p => p.nome).join(', ');
}

function sanitize(text) {
    return String(text).replace(/[<>]/g, '');
}

function trelloAuthCheck() {
    // Exemplo: retorna true para simular autenticação
    return true;
}

function createTrelloCard(data) {
    // Exemplo: retorna um objeto simulando a criação de um card
    return {
        id: Math.random().toString(36).substr(2, 9),
        ...data,
        status: 'created',
    };
}

module.exports = {
    formatarVeiculos,
    formatUsDate,
    formatarPessoas,
    sanitize,
    trelloAuthCheck,
    createTrelloCard,
};
