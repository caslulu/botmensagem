import type { ServiceModule } from '../components/layout/ServiceNav';

export const DEFAULT_MODULES: ServiceModule[] = [
  { id: 'mensagens', name: 'Mensagens', icon: '💬', description: 'Envio automático no WhatsApp', requiresAdmin: true, group: 'modules' },
  { id: 'web', name: 'App Web', icon: '🌐', description: 'RTA, Kanban de cotações e preço', group: 'modules' },
  { id: 'howto', name: 'Ajuda', icon: '❔', description: 'Passos rápidos para operar', group: 'modules' },
  { id: 'novidades', name: 'Novidades', icon: '📰', description: 'Atualizações e mudanças recentes', group: 'news' },
  { id: 'roadmap', name: 'Roadmap', icon: '🗺️', description: 'Planejamento e andamento', group: 'news' },
  { id: 'perfil', name: 'Perfil', icon: '👤', description: 'Dados do operador atual', group: 'account' },
  { id: 'config', name: 'Configurações', icon: '⚙️', description: 'Perfis e preferências do app', group: 'account' }
];
