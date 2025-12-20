import type { ServiceModule } from '../components/layout/ServiceNav';

export const DEFAULT_MODULES: ServiceModule[] = [
  { id: 'mensagens', name: 'Enviar mensagem automática', icon: '💬', requiresAdmin: true },
  { id: 'rta', name: 'RTA automático', icon: '📄' },
  { id: 'trello', name: 'Integração Trello', icon: '📋' },
  { id: 'cotacoes', name: 'Cotações', icon: '📑' },
  { id: 'price', name: 'Preço automático', icon: '💵' },
  { id: 'howto', name: 'Como usar', icon: '❔' }
];
