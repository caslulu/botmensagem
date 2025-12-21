import type { ServiceModule } from '../components/layout/ServiceNav';

export const DEFAULT_MODULES: ServiceModule[] = [
  { id: 'mensagens', name: 'Enviar mensagem automática', icon: '💬', requiresAdmin: true, group: 'modules' },
  { id: 'rta', name: 'RTA automático', icon: '📄', group: 'modules' },
  { id: 'trello', name: 'Integração Trello', icon: '📋', group: 'modules' },
  { id: 'cotacoes', name: 'Cotações', icon: '📑', group: 'modules' },
  { id: 'price', name: 'Preço automático', icon: '💵', group: 'modules' },
  { id: 'howto', name: 'Como usar', icon: '❔', group: 'modules' },
  { id: 'novidades', name: 'Novidades', icon: '📰', description: 'O que mudou e como usar', group: 'news' },
  { id: 'roadmap', name: 'Roadmap', icon: '🗺️', description: 'Planejamento e andamento', group: 'news' },
  { id: 'perfil', name: 'Perfil', icon: '👤', description: 'Dados do operador', group: 'account' },
  { id: 'config', name: 'Configurações', icon: '⚙️', description: 'Preferências do app', group: 'account' }
];
