const SERVICES = [
  { id: 'mensagens', name: 'Enviar mensagem automática', icon: '💬', requiresAdmin: true },
  {
    id: 'web',
    name: 'Aplicação web',
    icon: '🌐',
    requiresAdmin: false,
    requiresProfile: false,
    description: 'Abra RTA, Kanban de cotações e preço no navegador.'
  }
];

function listServices() {
  return SERVICES.slice();
}

module.exports = { listServices };
