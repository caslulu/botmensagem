import type { ServiceModule } from '../components/layout/ServiceNav';

export const DEFAULT_MODULES: ServiceModule[] = [
  { id: 'mensagens', name: 'Mensagens', icon: '💬', description: 'Envio automático no WhatsApp', requiresAdmin: true, group: 'modules' },
  { id: 'kanban', name: 'Kanban', icon: '▦', description: 'Quadro de cotações no desktop', group: 'modules' },
  { id: 'rta', name: 'RTA', icon: '📄', description: 'Geração de RTA no desktop', group: 'modules' },
  { id: 'preco', name: 'Preço', icon: '🏷️', description: 'Imagem de preço no desktop', group: 'modules' },
  { id: 'config', name: 'Configurações', icon: '⚙️', description: 'Perfis e preferências do app', group: 'account' }
];
