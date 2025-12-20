// Serviço para integração com Trello (stub usado pelos fluxos de RTA)

type Vehicle = { modelo?: string; placa?: string };
type Person = { nome?: string };

function formatarVeiculos(veiculos: Vehicle[] = []): string {
    return veiculos.map((v) => `${v.modelo || ''} - ${v.placa || ''}`.trim()).join(', ');
}

function formatUsDate(dateStr: string | number | Date): string {
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US');
}

function formatarPessoas(pessoas: Person[] = []): string {
    return pessoas.map((p) => p.nome || '').filter(Boolean).join(', ');
}

function sanitize(text: unknown): string {
    return String(text ?? '').replace(/[<>]/g, '');
}

function trelloAuthCheck(): boolean {
    return true;
}

function createTrelloCard<T extends Record<string, unknown>>(data: T): T & { id: string; status: 'created' } {
    return {
        id: Math.random().toString(36).substring(2, 11),
        ...data,
        status: 'created'
    };
}

export { formatarVeiculos, formatUsDate, formatarPessoas, sanitize, trelloAuthCheck, createTrelloCard };
export default {
    formatarVeiculos,
    formatUsDate,
    formatarPessoas,
    sanitize,
    trelloAuthCheck,
    createTrelloCard
};
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(module as any).exports = {
    formatarVeiculos,
    formatUsDate,
    formatarPessoas,
    sanitize,
    trelloAuthCheck,
    createTrelloCard
};
