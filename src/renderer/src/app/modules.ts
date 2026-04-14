import type { ServiceModule } from '../components/layout/ServiceNav';

export const DEFAULT_MODULES: ServiceModule[] = [
  { id: 'mensagens', name: 'Mensagens', icon: '💬', description: 'Envio automático no WhatsApp', requiresAdmin: true, group: 'modules' },
  { id: 'rta', name: 'RTA', icon: '📄', description: 'Geração guiada de PDFs', group: 'modules' },
  { id: 'cotacoes', name: 'Cotações', icon: '📑', description: 'Fila do Trello e automações', group: 'modules' },
  { id: 'price', name: 'Preço', icon: '💵', description: 'Imagens de preço em segundos', group: 'modules' },
  { id: 'howto', name: 'Ajuda', icon: '❔', description: 'Passos rápidos para operar', group: 'modules' },
  { id: 'novidades', name: 'Novidades', icon: '📰', description: 'Atualizações e mudanças recentes', group: 'news' },
  { id: 'roadmap', name: 'Roadmap', icon: '🗺️', description: 'Planejamento e andamento', group: 'news' },
  { id: 'perfil', name: 'Perfil', icon: '👤', description: 'Dados do operador atual', group: 'account' },
  { id: 'config', name: 'Configurações', icon: '⚙️', description: 'Perfis e preferências do app', group: 'account' }
];
