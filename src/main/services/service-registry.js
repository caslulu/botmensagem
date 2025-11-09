const SERVICES = [
  { id: 'mensagens', name: 'Enviar mensagem automática', icon: '💬', requiresAdmin: true },
  { id: 'rta', name: 'RTA automático', icon: '📄', requiresAdmin: false },
  { id: 'trello', name: 'Integração Trello', icon: '📌', requiresAdmin: false },
  {
    id: 'cotacoes',
    name: 'Cotações',
    icon: '📑',
    requiresAdmin: false,
    requiresProfile: false,
    description: 'Gerencie cotações salvas, abra no Trello ou gere preços rapidamente.'
  },
  {
    id: 'price',
    name: 'Preço automático',
    icon: '💵',
    requiresAdmin: true,
    requiresProfile: true,
    description: 'Gere cards de preço com modelos multilíngues e envie para o Trello.'
  }
];

function listServices() {
  return SERVICES.slice();
}

module.exports = { listServices };
