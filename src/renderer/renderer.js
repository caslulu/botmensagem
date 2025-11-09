// DOM Elements
const sidebarEl = document.getElementById('sidebar');
const servicesNav = document.getElementById('servicesNav');
const sidebarToggle = document.getElementById('sidebarToggle');
const sidebarOpenToggle = document.getElementById('sidebarOpenToggle');
const mainViewport = document.querySelector('main');
const rtaView = document.getElementById('rtaView');
const trelloView = document.getElementById('trelloView');
const rtaStatus = document.getElementById('rtaStatus');
const rtaOutput = document.getElementById('rtaOutput');
const rtaActions = document.getElementById('rtaActions');
const rtaOpenBtn = document.getElementById('rtaOpenBtn');
const rtaDownloadBtn = document.getElementById('rtaDownloadBtn');
const profilesContainer = document.getElementById('profilesContainer');
const selectionView = document.getElementById('selectionView');
const moduleSelectionView = document.getElementById('moduleSelectionView');
const moduleCardsContainer = document.getElementById('moduleCards');
const controlView = document.getElementById('controlView');
const backToProfilesButton = document.getElementById('backToProfiles');
const activeProfileNameEl = document.getElementById('activeProfileName');
const activeProfileMessageEl = document.getElementById('activeProfileMessage');
const statusBadge = document.getElementById('statusBadge');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusText = document.getElementById('statusText');
const logContainer = document.getElementById('logContainer');

// Messages UI elements
const messagesList = document.getElementById('messagesList');
const addMessageBtn = document.getElementById('addMessageBtn');
const messageModal = document.getElementById('messageModal');
const modalTitle = document.getElementById('modalTitle');
const closeModalBtn = document.getElementById('closeModalBtn');
const cancelModalBtn = document.getElementById('cancelModalBtn');
const saveMessageBtn = document.getElementById('saveMessageBtn');
const messageText = document.getElementById('messageText');
const messageImage = document.getElementById('messageImage');
const selectImageBtn = document.getElementById('selectImageBtn');

// Profile settings elements
const sendLimitInput = document.getElementById('sendLimitInput');
const saveSendLimitBtn = document.getElementById('saveSendLimitBtn');

// Verificar se todos os elementos foram encontrados
console.log('Elementos DOM carregados:', {
  profilesContainer: !!profilesContainer,
  selectionView: !!selectionView,
  controlView: !!controlView,
  backToProfilesButton: !!backToProfilesButton,
  startButton: !!startButton,
  stopButton: !!stopButton
});

const placeholderAvatar =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="480" viewBox="0 0 320 480" fill="none">
      <rect width="320" height="480" rx="32" fill="white"/>
      <path d="M160 132c28.719 0 52-23.281 52-52s-23.281-52-52-52-52 23.281-52 52 23.281 52 52 52Z" fill="#E2E8F0"/>
      <path d="M160 168c-66.274 0-120 53.726-120 120v56h240v-56c0-66.274-53.726-120-120-120Z" fill="#E2E8F0"/>
    </svg>`
  );

let profiles = [];
let selectedProfileId = null;
let selectionEnabled = true;
let automationRunning = false;
let currentMessages = [];
let editingMessageId = null;
let currentSendLimit = 200;
let activeServiceId = 'mensagens';
let lastGeneratedRtaPath = null;
let trelloFormManager = null;

startButton.disabled = true;
showProfileSelection();

if (servicesNav) {
  servicesNav.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-service-id]');
    if (!button || !servicesNav.contains(button)) {
      return;
    }

    const { serviceId } = button.dataset;
    if (!serviceId || serviceId === activeServiceId) {
      return;
    }

    event.preventDefault();
    selectService(serviceId);
  });
}

function appendLog(message) {
  const timestamp = new Date().toLocaleTimeString('pt-BR', { hour12: false });
  const line = document.createElement('div');
  line.className = 'border-b border-white/5 pb-2 text-xs last:border-none last:pb-0';
  line.textContent = `[${timestamp}] ${message}`;
  logContainer.appendChild(line);
  logContainer.scrollTop = logContainer.scrollHeight;
}

function setStatus(text) {
  statusText.textContent = text;
}

function updateStatusBadge(state) {
  switch (state) {
    case 'running':
      statusBadge.textContent = 'Em execução';
      statusBadge.className = 'tag bg-emerald-500/10 text-emerald-300';
      break;
    case 'stopped':
      statusBadge.textContent = 'Parado';
      statusBadge.className = 'tag bg-slate-800 text-slate-300';
      break;
    case 'error':
      statusBadge.textContent = 'Erro';
      statusBadge.className = 'tag bg-rose-500/10 text-rose-300';
      break;
    case 'idle':
      statusBadge.textContent = 'Aguardando';
      statusBadge.className = 'tag bg-emerald-500/10 text-emerald-300';
      break;
    default:
      statusBadge.textContent = 'Aguardando';
      statusBadge.className = 'tag bg-emerald-500/10 text-emerald-300';
  }
}

function setSelectionEnabled(enabled) {
  selectionEnabled = enabled;
  const inputs = profilesContainer.querySelectorAll('input[type="radio"]');
  inputs.forEach((input) => {
    input.disabled = !enabled;
  });

  profilesContainer.classList.toggle('opacity-50', !enabled);
  profilesContainer.classList.toggle('pointer-events-none', !enabled);
}

function updateProfilesActiveState() {
  const cards = profilesContainer.querySelectorAll('.profile-card');
  cards.forEach((card) => {
    const isActive = card.dataset.profileId === selectedProfileId;
    card.dataset.active = isActive ? 'true' : 'false';
    card.classList.toggle('ring-2', isActive);
    card.classList.toggle('ring-brand-500', isActive);
    const input = card.querySelector('input[type="radio"]');
    if (input) {
      input.checked = isActive;
    }
  });
}

function toggleSidebarVisibility(visible) {
  if (!sidebarEl) {
    return;
  }

  sidebarEl.classList.toggle('hidden', !visible);
}

function scrollMainToTop() {
  if (mainViewport) {
    mainViewport.scrollTop = 0;
  }
}

function showProfileSelection() {
  if (selectionView) selectionView.style.display = 'flex';
  if (moduleSelectionView) moduleSelectionView.style.display = 'none';
  if (controlView) controlView.style.display = 'none';
  if (rtaView) rtaView.style.display = 'none';
  if (trelloView) trelloView.style.display = 'none';
  toggleSidebarVisibility(false);
  scrollMainToTop();
}

function showModuleSelection() {
  if (selectionView) selectionView.style.display = 'none';
  if (moduleSelectionView) moduleSelectionView.style.display = 'flex';
  if (controlView) controlView.style.display = 'none';
  if (rtaView) rtaView.style.display = 'none';
  if (trelloView) trelloView.style.display = 'none';
  toggleSidebarVisibility(false);
  scrollMainToTop();
}

function showControlModule() {
  if (selectionView) selectionView.style.display = 'none';
  if (moduleSelectionView) moduleSelectionView.style.display = 'none';
  if (controlView) controlView.style.display = 'flex';
  if (rtaView) rtaView.style.display = 'none';
  if (trelloView) trelloView.style.display = 'none';
  toggleSidebarVisibility(true);
  scrollMainToTop();
}

function showRtaModule() {
  if (selectionView) selectionView.style.display = 'none';
  if (moduleSelectionView) moduleSelectionView.style.display = 'none';
  if (controlView) controlView.style.display = 'none';
  if (rtaView) rtaView.style.display = 'flex';
  if (trelloView) trelloView.style.display = 'none';
  toggleSidebarVisibility(true);
  scrollMainToTop();
}

function showUnavailableModule() {
  if (selectionView) selectionView.style.display = 'none';
  if (moduleSelectionView) moduleSelectionView.style.display = 'none';
  if (controlView) controlView.style.display = 'none';
  if (rtaView) rtaView.style.display = 'none';
  if (trelloView) trelloView.style.display = 'none';
  toggleSidebarVisibility(true);
  scrollMainToTop();
}

function showTrelloModule() {
  if (selectionView) selectionView.style.display = 'none';
  if (moduleSelectionView) moduleSelectionView.style.display = 'none';
  if (controlView) controlView.style.display = 'none';
  if (rtaView) rtaView.style.display = 'none';
  if (trelloView) trelloView.style.display = 'flex';
  toggleSidebarVisibility(true);
  scrollMainToTop();
}

function selectProfile(profileId) {
  if (!selectionEnabled) {
    return;
  }

  selectedProfileId = profileId;
  const profile = profiles.find((item) => item.id === profileId);
  updateProfilesActiveState();

  if (profile) {
    activeProfileNameEl.textContent = profile.name;
    activeProfileMessageEl.textContent = profile.message;
    startButton.disabled = false;
    showModuleSelection();
    activeServiceId = null;
    updateActiveServiceButton();
    setStatus('Escolha o módulo que deseja utilizar.');
    updateStatusBadge('stopped');
    
    // Load messages and settings for this profile
    loadMessages(profileId);
    loadProfileSettings(profileId);
  } else {
    startButton.disabled = true;
    setStatus('Selecione um operador para começar.');
    showProfileSelection();
  }
}

function renderProfiles(profileList) {
  console.log('Renderizando perfis:', profileList);
  profiles = profileList;
  profilesContainer.innerHTML = '';

  if (!profileList || profileList.length === 0) {
    profilesContainer.innerHTML = '<p class="text-slate-400 text-center col-span-full py-8">Nenhum perfil encontrado.</p>';
    return;
  }

  profiles.forEach((profile) => {
    console.log('Criando card para:', profile.name, 'Thumbnail:', profile.thumbnail);
    const card = document.createElement('label');
    card.className = 'profile-card';
    card.dataset.profileId = profile.id;
    card.dataset.active = selectedProfileId === profile.id ? 'true' : 'false';

    const input = document.createElement('input');
    input.type = 'radio';
    input.name = 'profile';
    input.value = profile.id;
    input.checked = selectedProfileId === profile.id;

    input.addEventListener('change', () => {
      selectProfile(profile.id);
    });

    const thumbWrapper = document.createElement('div');
    thumbWrapper.className = 'profile-thumbnail';

    const thumbnail = document.createElement('img');
    thumbnail.alt = `Foto de ${profile.name}`;
    thumbnail.src = profile.thumbnail || placeholderAvatar;
    thumbnail.loading = 'lazy';
    thumbnail.decoding = 'async';
    
    // Handle image loading errors
    thumbnail.onerror = () => {
      thumbnail.src = placeholderAvatar;
    };

    const info = document.createElement('div');
    info.className = 'profile-info';

    const name = document.createElement('p');
    name.className = 'profile-name';
    name.textContent = profile.name;

    thumbWrapper.appendChild(thumbnail);
    info.appendChild(name);
    
    card.appendChild(input);
    card.appendChild(thumbWrapper);
    card.appendChild(info);

    profilesContainer.appendChild(card);
  });

  setSelectionEnabled(selectionEnabled);
  if (!selectedProfileId) {
    setStatus('Selecione um operador para começar.');
    updateStatusBadge('idle');
  }

  updateProfilesActiveState();
}

async function loadProfiles() {
  try {
    console.log('Carregando perfis...');
    
    if (!window.automation) {
      console.error('window.automation não está disponível!');
      profilesContainer.innerHTML = '<p class="text-rose-400 text-center col-span-full py-8">Erro: API automation não disponível.</p>';
      return;
    }
    
    const profileList = await window.automation.getProfiles();
    console.log('Perfis recebidos:', profileList);
    renderProfiles(profileList);
  } catch (error) {
    console.error('Erro ao carregar perfis:', error);
    appendLog(`Não foi possível carregar os perfis: ${error.message ?? error}`);
    setStatus('Erro ao carregar perfis. Verifique o backend.');
    profilesContainer.innerHTML = `<p class="text-rose-400 text-center col-span-full py-8">Erro ao carregar perfis: ${error.message}</p>`;
  }
}

startButton.addEventListener('click', async () => {
  if (!selectedProfileId) {
    setStatus('Escolha um operador antes de iniciar.');
    appendLog('Seleção de operador obrigatória para iniciar.');
    startButton.disabled = true;
    return;
  }

  const profile = profiles.find((item) => item.id === selectedProfileId);
  const profileLabel = profile?.name ?? selectedProfileId;

  appendLog(`Disparando automação para ${profileLabel}…`);
  setStatus('Iniciando automação…');
  updateStatusBadge('running');
  automationRunning = true;
  startButton.disabled = true;
  setSelectionEnabled(false);

  try {
    const response = await window.automation.start(selectedProfileId);
    appendLog(response?.message ?? 'Automação iniciada.');
    setStatus('Automação em execução.');
    stopButton.disabled = false;
  } catch (error) {
    automationRunning = false;
    appendLog(`Falha ao iniciar: ${error.message ?? error}`);
    setStatus('Erro ao iniciar automação. Veja os logs.');
    updateStatusBadge('error');
    setSelectionEnabled(true);
    startButton.disabled = !selectedProfileId;
  }
});

stopButton.addEventListener('click', async () => {
  appendLog('Solicitando parada…');
  setStatus('Encerrando automação…');
  updateStatusBadge('stopped');
  stopButton.disabled = true;

  try {
    const response = await window.automation.stop();
    appendLog(response?.message ?? 'Automação interrompida.');
    setStatus('Automação parada.');
  } catch (error) {
    appendLog(`Falha ao parar: ${error.message ?? error}`);
    setStatus('Erro ao interromper automação. Veja os logs.');
    updateStatusBadge('error');
  } finally {
    automationRunning = false;
    setSelectionEnabled(true);
    startButton.disabled = !selectedProfileId;
  }
});

window.automation.onLog((payload) => {
  if (typeof payload === 'string') {
    appendLog(payload);
  }
});

window.automation.onStatus((payload) => {
  if (payload?.status) {
    setStatus(payload.status);
  }

  if (payload?.profileName) {
    activeProfileNameEl.textContent = payload.profileName;
  }

  if (payload?.startDisabled !== undefined) {
    if (payload.startDisabled) {
      startButton.disabled = true;
      setSelectionEnabled(false);
    } else {
      setSelectionEnabled(true);
      startButton.disabled = !selectedProfileId;
    }
  }

  if (payload?.stopDisabled !== undefined) {
    stopButton.disabled = payload.stopDisabled;
  }

  if (payload?.status) {
    if (payload.status.toLowerCase().includes('erro')) {
      updateStatusBadge('error');
    } else if (payload.status.toLowerCase().includes('execut')) {
      updateStatusBadge('running');
    } else if (payload.status.toLowerCase().includes('parad') || payload.status.toLowerCase().includes('finalizado')) {
      updateStatusBadge('stopped');
    }
  }
});

backToProfilesButton.addEventListener('click', () => {
  if (automationRunning) {
    appendLog('Finalize ou pare a automação antes de trocar de operador.');
    return;
  }

  selectedProfileId = null;
  activeProfileNameEl.textContent = '—';
  activeProfileMessageEl.textContent = '';
  startButton.disabled = true;
  stopButton.disabled = true;
  showProfileSelection();
  activeServiceId = 'mensagens';
  updateActiveServiceButton();
  setStatus('Selecione um operador para começar.');
  updateStatusBadge('idle');
  setSelectionEnabled(true);
  updateProfilesActiveState();
});

loadProfiles();

// ===== Serviços (Sidebar) =====
const FALLBACK_SERVICES = [
  {
    id: 'mensagens',
    name: 'Enviar mensagem automática',
    icon: 'chat',
    description: 'Automatize o disparo e a gestão de mensagens no WhatsApp.'
  },
  {
    id: 'rta',
    name: 'RTA automático',
    icon: 'doc',
    description: 'Gere documentos RTA completos a partir das informações preenchidas.'
  },
  {
    id: 'trello',
    name: 'Integração Trello',
    icon: 'board',
    description: 'Sincronize dados e crie cards rapidamente no Trello.'
  }
];

function createServiceIcon(iconKey) {
  const key = iconKey || 'chat';
  const svgIcons = ['chat', 'doc', 'board'];

  if (!svgIcons.includes(key)) {
    const emoji = document.createElement('span');
    emoji.className = 'service-btn-emoji';
    emoji.textContent = key;
    return emoji;
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('stroke-linecap', 'round');
  path.setAttribute('stroke-linejoin', 'round');
  path.setAttribute('stroke-width', '2');

  switch (key) {
    case 'chat':
      path.setAttribute('d', 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z');
      break;
    case 'doc':
      path.setAttribute('d', 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z');
      break;
    case 'board':
    default:
      path.setAttribute('d', 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2');
      break;
  }

  svg.appendChild(path);
  return svg;
}

function renderServiceButtons(services) {
  if (!servicesNav) {
    return;
  }

  servicesNav.innerHTML = '';
  const fragment = document.createDocumentFragment();

  services.forEach((service) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'service-btn';
    button.dataset.serviceId = service.id;

    const icon = createServiceIcon(service.icon);
    icon.classList.add('service-btn-icon');
    button.appendChild(icon);

    const label = document.createElement('span');
    label.textContent = service.name;
    button.appendChild(label);

    fragment.appendChild(button);
  });

  servicesNav.appendChild(fragment);
  updateActiveServiceButton();
}

function updateActiveServiceButton() {
  if (!servicesNav) {
    return;
  }

  const buttons = servicesNav.querySelectorAll('.service-btn');
  buttons.forEach((button) => {
    const isActive = button.dataset.serviceId === activeServiceId;
    button.classList.toggle('active', isActive);
  });
}

function renderModuleCards(services) {
  if (!moduleCardsContainer) {
    return;
  }

  moduleCardsContainer.innerHTML = '';

  services.forEach((service) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'module-card';
    card.dataset.serviceId = service.id;

    const iconWrapper = document.createElement('div');
    iconWrapper.className = 'module-card-icon-wrapper';

    const icon = createServiceIcon(service.icon);
    icon.classList.add('module-card-icon');
    iconWrapper.appendChild(icon);

    const title = document.createElement('span');
    title.className = 'module-card-title';
    title.textContent = service.name;

    card.appendChild(iconWrapper);
    card.appendChild(title);

    if (service.description) {
      const description = document.createElement('p');
      description.className = 'module-card-description';
      description.textContent = service.description;
      card.appendChild(description);
    }

    card.addEventListener('click', () => {
      selectService(service.id);
    });

    moduleCardsContainer.appendChild(card);
  });
}

async function loadServices() {
  let servicesToRender = FALLBACK_SERVICES.map((service) => ({ ...service }));

  if (window.services?.list) {
    try {
      const response = await window.services.list();
      if (Array.isArray(response) && response.length > 0) {
        servicesToRender = response.map((service) => {
          const fallback = FALLBACK_SERVICES.find((item) => item.id === service.id);
          return {
            id: service.id,
            name: service.name || fallback?.name || service.id,
            icon: service.icon || fallback?.icon || 'chat',
            description: service.description || fallback?.description || ''
          };
        });
      }
    } catch (error) {
      console.error('Erro ao carregar lista de serviços:', error);
    }
  }

  renderServiceButtons(servicesToRender);
  renderModuleCards(servicesToRender);
}

function selectService(id) {
  let handled = false;

  switch (id) {
    case 'mensagens': {
      if (!selectedProfileId) {
        showProfileSelection();
        setStatus('Selecione um operador para começar.');
        updateStatusBadge('idle');
      } else {
        showControlModule();
        setStatus('Pronto para iniciar os envios.');
        updateStatusBadge('stopped');
      }
      handled = true;
      break;
    }
    case 'rta': {
      if (!selectedProfileId) {
        showProfileSelection();
        setStatus('Selecione um operador para começar.');
        updateStatusBadge('idle');
      } else {
        showRtaModule();
        setStatus('Preencha os dados para gerar o RTA.');
        updateStatusBadge('idle');
        handled = true;
      }
      break;
    }
    case 'trello': {
      if (!selectedProfileId) {
        showProfileSelection();
        setStatus('Selecione um operador para começar.');
        updateStatusBadge('idle');
      } else {
        showTrelloModule();
        initializeTrelloForm();
        setStatus('Preencha os dados para criar o card no Trello.');
        updateStatusBadge('idle');
        handled = true;
      }
      break;
    }
    default: {
      appendLog(`Módulo desconhecido: ${id}`);
      if (selectedProfileId) {
        showModuleSelection();
      } else {
        showProfileSelection();
      }
      setStatus('Módulo não reconhecido.');
      updateStatusBadge('idle');
    }
  }

  activeServiceId = handled ? id : null;
  updateActiveServiceButton();
}

loadServices();
selectService('mensagens');

// ===== Sidebar toggle =====
function applySidebarState() {
  const collapsed = localStorage.getItem('sidebarCollapsed') === '1';
  document.body.classList.toggle('sidebar-collapsed', collapsed);
}

applySidebarState();

if (sidebarToggle) {
  sidebarToggle.addEventListener('click', () => {
    const collapsed = !(localStorage.getItem('sidebarCollapsed') === '1');
    localStorage.setItem('sidebarCollapsed', collapsed ? '1' : '0');
    applySidebarState();
  });
}

if (sidebarOpenToggle) {
  sidebarOpenToggle.addEventListener('click', () => {
    localStorage.setItem('sidebarCollapsed', '0');
    applySidebarState();
  });
}

// ===== MESSAGE MANAGEMENT =====

async function loadMessages(profileId) {
  if (!profileId) return;
  
  try {
    currentMessages = await window.messages.get(profileId);
    renderMessages();
    updateSelectedMessagePreview();
  } catch (error) {
    console.error('Erro ao carregar mensagens:', error);
    appendLog(`Erro ao carregar mensagens: ${error.message}`);
  }
}

async function loadProfileSettings(profileId) {
  if (!profileId) return;
  
  try {
    const settings = await window.profile.getSettings(profileId);
    currentSendLimit = settings.send_limit || 200;
    sendLimitInput.value = currentSendLimit;
    appendLog(`Configuração carregada: ${currentSendLimit} grupos`);
  } catch (error) {
    console.error('Erro ao carregar configurações:', error);
    sendLimitInput.value = 200;
    currentSendLimit = 200;
  }
}

async function saveSendLimit() {
  if (!selectedProfileId) {
    appendLog('Nenhum perfil selecionado');
    return;
  }
  
  const limit = parseInt(sendLimitInput.value);
  
  if (isNaN(limit) || limit < 1 || limit > 1000) {
    appendLog('Por favor, insira um número válido entre 1 e 1000');
    return;
  }
  
  try {
    await window.profile.updateSendLimit(selectedProfileId, limit);
    currentSendLimit = limit;
    appendLog(`✓ Configuração salva: ${limit} grupos`);
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    appendLog(`Erro ao salvar configuração: ${error.message}`);
  }
}

function renderMessages() {
  messagesList.innerHTML = '';
  
  if (currentMessages.length === 0) {
    messagesList.innerHTML = '<p class="text-slate-400 text-sm text-center py-4">Nenhuma mensagem salva</p>';
    return;
  }
  
  currentMessages.forEach((msg, index) => {
    const card = document.createElement('div');
    card.className = `message-card ${msg.isSelected ? 'selected' : ''}`;
    card.dataset.messageId = msg.id;
    
    const content = document.createElement('div');
    content.className = 'flex-1 min-w-0';
    
    const header = document.createElement('div');
    header.className = 'flex items-center gap-2 mb-1';
    
    const number = document.createElement('span');
    number.className = 'text-xs font-semibold text-slate-400';
    number.textContent = `#${index + 1}`;
    
    if (msg.isSelected) {
      const badge = document.createElement('span');
      badge.className = 'tag bg-brand-500/20 text-brand-300 text-xs';
      badge.textContent = 'Ativa';
      header.appendChild(badge);
    }
    
    header.appendChild(number);
    
    const preview = document.createElement('p');
    preview.className = 'text-sm text-slate-300 truncate';
    preview.textContent = msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : '');
    
    content.appendChild(header);
    content.appendChild(preview);
    
    const actions = document.createElement('div');
    actions.className = 'flex gap-1';
    
    if (!msg.isSelected) {
      const selectBtn = document.createElement('button');
      selectBtn.className = 'message-action-btn';
      selectBtn.innerHTML = '✓';
      selectBtn.title = 'Selecionar';
      selectBtn.onclick = () => selectMessageHandler(msg.id);
      actions.appendChild(selectBtn);
    }
    
    const editBtn = document.createElement('button');
    editBtn.className = 'message-action-btn';
    editBtn.innerHTML = '✎';
    editBtn.title = 'Editar';
    editBtn.onclick = () => openEditModal(msg);
    actions.appendChild(editBtn);
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'message-action-btn text-rose-400 hover:text-rose-300';
    deleteBtn.innerHTML = '🗑';
    deleteBtn.title = 'Deletar';
    deleteBtn.onclick = () => deleteMessageHandler(msg.id);
    actions.appendChild(deleteBtn);
    
    card.appendChild(content);
    card.appendChild(actions);
    messagesList.appendChild(card);
  });
  
  // Update add button state
  addMessageBtn.disabled = currentMessages.length >= 5;
  if (currentMessages.length >= 5) {
    addMessageBtn.textContent = 'Limite de 5 mensagens atingido';
  } else {
    addMessageBtn.innerHTML = '<span aria-hidden="true">+</span> Adicionar mensagem';
  }
}

function updateSelectedMessagePreview() {
  const selected = currentMessages.find(msg => msg.isSelected);
  if (selected) {
    activeProfileMessageEl.textContent = selected.text;
  } else {
    activeProfileMessageEl.textContent = 'Nenhuma mensagem selecionada';
  }
}

function openAddModal() {
  if (currentMessages.length >= 5) {
    appendLog('Limite máximo de 5 mensagens atingido');
    return;
  }
  
  editingMessageId = null;
  modalTitle.textContent = 'Adicionar mensagem';
  messageText.value = '';
  messageImage.value = '';
  messageModal.classList.remove('hidden');
}

function openEditModal(message) {
  editingMessageId = message.id;
  modalTitle.textContent = 'Editar mensagem';
  messageText.value = message.text;
  messageImage.value = message.imagePath || '';
  messageModal.classList.remove('hidden');
}

function closeModal() {
  messageModal.classList.add('hidden');
  editingMessageId = null;
  messageText.value = '';
  messageImage.value = '';
}

async function saveMessage() {
  const text = messageText.value.trim();
  
  if (!text) {
    appendLog('O texto da mensagem não pode estar vazio');
    return;
  }
  
  const imagePath = messageImage.value.trim() || null;
  
  try {
    if (editingMessageId) {
      // Update existing message
      await window.messages.update(editingMessageId, text, imagePath);
      appendLog('Mensagem atualizada com sucesso');
    } else {
      // Add new message
      await window.messages.add(selectedProfileId, text, imagePath);
      appendLog('Mensagem adicionada com sucesso');
    }
    
    closeModal();
    await loadMessages(selectedProfileId);
  } catch (error) {
    console.error('Erro ao salvar mensagem:', error);
    appendLog(`Erro ao salvar mensagem: ${error.message}`);
  }
}

async function deleteMessageHandler(messageId) {
  if (!confirm('Tem certeza que deseja deletar esta mensagem?')) {
    return;
  }
  
  try {
    await window.messages.delete(messageId);
    appendLog('Mensagem deletada com sucesso');
    await loadMessages(selectedProfileId);
  } catch (error) {
    console.error('Erro ao deletar mensagem:', error);
    appendLog(`Erro ao deletar mensagem: ${error.message}`);
  }
}

async function selectMessageHandler(messageId) {
  try {
    await window.messages.select(messageId);
    appendLog('Mensagem selecionada com sucesso');
    await loadMessages(selectedProfileId);
  } catch (error) {
    console.error('Erro ao selecionar mensagem:', error);
    appendLog(`Erro ao selecionar mensagem: ${error.message}`);
  }
}

// Modal event listeners
addMessageBtn.addEventListener('click', openAddModal);
closeModalBtn.addEventListener('click', closeModal);
cancelModalBtn.addEventListener('click', closeModal);
saveMessageBtn.addEventListener('click', saveMessage);

// Image selection
selectImageBtn.addEventListener('click', async () => {
  try {
    const result = await window.fileSystem.selectImage();
    if (result.success && result.path) {
      messageImage.value = result.path;
      appendLog(`Imagem selecionada: ${result.path}`);
    }
  } catch (error) {
    console.error('Erro ao selecionar imagem:', error);
    appendLog(`Erro ao selecionar imagem: ${error.message}`);
  }
});

// Profile settings
saveSendLimitBtn.addEventListener('click', saveSendLimit);

// Close modal when clicking outside
messageModal.addEventListener('click', (e) => {
  if (e.target === messageModal) {
    closeModal();
  }
});

// ===== RTA FORM HANDLER =====
const rtaForm = document.getElementById('rtaForm');
const titleStatusRadios = document.querySelectorAll('input[name="title_status"]');
const previousTitleSection = document.getElementById('previousTitleSection');

function toggleTitleSectionVisibility(status) {
  if (!previousTitleSection) {
    return;
  }

  const hide = status === 'financed';
  previousTitleSection.style.display = hide ? 'none' : 'flex';
  previousTitleSection.setAttribute('aria-hidden', hide ? 'true' : 'false');

  const inputs = previousTitleSection.querySelectorAll('input');
  inputs.forEach((input) => {
    if (!input.dataset.originalRequired) {
      input.dataset.originalRequired = input.required ? 'true' : 'false';
    }

    input.disabled = hide;
    if (hide) {
      input.required = false;
      input.value = '';
    } else {
      input.required = input.dataset.originalRequired === 'true';
    }
  });
}

if (titleStatusRadios?.length) {
  titleStatusRadios.forEach((radio) => {
    radio.addEventListener('change', (event) => {
      if (event.target.checked) {
        toggleTitleSectionVisibility(event.target.value);
      }
    });
  });

  const initiallySelected = Array.from(titleStatusRadios).find((radio) => radio.checked)?.value ?? 'paid_off';
  toggleTitleSectionVisibility(initiallySelected);
}

if (rtaForm) {
  rtaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!window.rta) return;
    rtaStatus.textContent = 'Gerando...';

    // Coleta de campos do formulário
    const getVal = (id) => {
      const el = document.getElementById(id);
      return el ? el.value : '';
    };

    const titleStatus = Array.from(document.querySelectorAll('input[name="title_status"]')).find((input) => input.checked)?.value || 'paid_off';

    const data = {
      insurance_company: getVal('insurance_company'),
      purchase_date: getVal('purchase_date'),
      insurance_effective_date: getVal('insurance_effective_date'),
    insurance_policy_change_date: getVal('insurance_policy_change_date'),
      vehicle_title_status: titleStatus,
      seller_name: getVal('seller_name'),
      seller_street: getVal('seller_street'),
      seller_city: getVal('seller_city'),
      seller_state: getVal('seller_state'),
      seller_zipcode: getVal('seller_zipcode'),
      gross_sale_price: getVal('gross_sale_price'),
      owner_name: getVal('owner_name'),
      owner_dob: getVal('owner_dob'),
      owner_license: getVal('owner_license'),
      owner_street: getVal('owner_street'),
      owner_city: getVal('owner_city'),
      owner_state: getVal('owner_state'),
      owner_zipcode: getVal('owner_zipcode'),
      vin: getVal('vin'),
      body_style: getVal('body_style'),
      year: getVal('year'),
      make: getVal('make'),
      model: getVal('model'),
      cylinders: getVal('cylinders'),
      passengers: getVal('passengers'),
      doors: getVal('doors'),
      odometer: getVal('odometer'),
      previous_title_number: getVal('previous_title_number'),
      previous_title_state: getVal('previous_title_state'),
      previous_title_country: getVal('previous_title_country'),
      color: getVal('color')
    };

    try {
      const res = await window.rta.generate(data);
      if (res.success) {
        rtaStatus.textContent = 'Gerado';
        const { path: outPath, template } = res.output;
        lastGeneratedRtaPath = outPath;
        rtaOutput.textContent = `Template: ${template}\nSaída: ${outPath}`;
        appendLog(`RTA gerado: ${outPath}`);

        // Mostrar botões de ação
        if (rtaActions) {
          rtaActions.classList.remove('hidden');
        }

        if (window.files?.saveToDownloads) {
          const suggested = (outPath?.split('/')?.pop()) || 'rta.pdf';
          const dl = await window.files.saveToDownloads(outPath, suggested);
          if (dl?.success) {
            appendLog(`Arquivo salvo em Downloads: ${dl.path}`);
            rtaOutput.textContent += `\nBaixado: ${dl.path}`;
            await window.files.showInFolder(dl.path);
          } else if (dl?.error) {
            appendLog(`Falha ao baixar automaticamente: ${dl.error}`);
          }
        }
      } else {
        rtaStatus.textContent = 'Erro';
        rtaOutput.textContent = res.error || 'Falha desconhecida';
        if (rtaActions) rtaActions.classList.add('hidden');
      }
    } catch (error) {
      rtaStatus.textContent = 'Erro';
      rtaOutput.textContent = error.message;
      if (rtaActions) rtaActions.classList.add('hidden');
    }
  });
}

// RTA Action Buttons
if (rtaOpenBtn) {
  rtaOpenBtn.addEventListener('click', async () => {
    if (!lastGeneratedRtaPath) {
      appendLog('Nenhum PDF gerado ainda');
      return;
    }
    try {
      const res = await window.files.openPath(lastGeneratedRtaPath);
      if (res?.success) {
        appendLog(`Abrindo PDF: ${lastGeneratedRtaPath}`);
      } else {
        appendLog(`Erro ao abrir PDF: ${res?.error || 'Desconhecido'}`);
      }
    } catch (error) {
      appendLog(`Erro ao abrir PDF: ${error.message}`);
    }
  });
}

if (rtaDownloadBtn) {
  rtaDownloadBtn.addEventListener('click', async () => {
    if (!lastGeneratedRtaPath) {
      appendLog('Nenhum PDF gerado ainda');
      return;
    }
    try {
      const suggested = (lastGeneratedRtaPath?.split('/')?.pop()) || 'rta.pdf';
      const dl = await window.files.saveToDownloads(lastGeneratedRtaPath, suggested);
      if (dl?.success) {
        appendLog('Arquivo copiado para Downloads: ' + dl.path);
        await window.files.showInFolder(dl.path);
      } else {
        appendLog('Erro ao copiar: ' + (dl?.error || 'Desconhecido'));
      }
    } catch (error) {
      appendLog('Erro ao copiar: ' + (error.message || error));
    }
  });
}

// ===== TRELLO FORM HANDLER =====
const TRELLO_STATE_OPTIONS = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'DC', name: 'District of Columbia' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
  { code: 'INT', name: 'International' }
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Falha ao ler arquivo.'));
    reader.readAsDataURL(file);
  });
}

class TrelloFormManager {
  constructor() {
    this.form = document.getElementById('trelloForm');
    this.statusEl = document.getElementById('trelloStatus');
    this.resultEl = document.getElementById('trelloResult');
    this.resetBtn = document.getElementById('trelloResetBtn');
    this.submitBtn = document.getElementById('trelloSubmitBtn');
    this.spouseSection = document.getElementById('trelloSpouseSection');
    this.vehicleTemplate = document.getElementById('trelloVehicleTemplate');
    this.driverTemplate = document.getElementById('trelloDriverTemplate');
    this.vehiclesContainer = document.getElementById('trelloVehiclesContainer');
    this.driversContainer = document.getElementById('trelloDriversContainer');
    this.addVehicleBtn = document.getElementById('trelloAddVehicle');
    this.addDriverBtn = document.getElementById('trelloAddDriver');
    this.documentStateSelect = document.getElementById('trelloDocumentoEstado');
    this.addressStateSelect = document.getElementById('trelloEnderecoEstado');
    this.imageInput = document.getElementById('trelloImages');
    this.imageInfo = document.getElementById('trelloImagesInfo');
    this.imagePreview = document.getElementById('trelloImagePreview');
    this.selectedImages = [];
    this.previewUrls = [];
    this.initialized = false;
  }

  init() {
    if (!this.form || this.initialized) {
      return;
    }

    this.initialized = true;
    this.populateStateSelects();
    this.setupListeners();
    this.clearErrors();
    this.addVehicle();
    this.toggleSpouseSection();
    this.updateStatus('Aguardando');
    this.checkAuth();
  }

  populateStateSelects() {
    const selects = [this.documentStateSelect, this.addressStateSelect];
    selects.forEach((select) => {
      if (!select || select.dataset.populated === 'true') return;
      const frag = document.createDocumentFragment();
      TRELLO_STATE_OPTIONS.forEach(({ code, name }) => {
        const option = document.createElement('option');
        option.value = code;
        option.textContent = `${code} - ${name}`;
        frag.appendChild(option);
      });
      select.appendChild(frag);
      select.dataset.populated = 'true';
    });
  }

  setupListeners() {
    this.form.addEventListener('submit', (event) => {
      event.preventDefault();
      this.handleSubmit();
    });

    this.resetBtn.addEventListener('click', () => {
      this.form.reset();
      this.handleReset();
    });

    this.addVehicleBtn.addEventListener('click', () => this.addVehicle());
    this.addDriverBtn.addEventListener('click', () => this.addDriver());

    this.imageInput.addEventListener('change', (event) => {
      const files = Array.from(event.target.files || []);
      this.setSelectedImages(files);
    });

    const estadoCivilRadios = this.form.querySelectorAll('input[name="estado_civil"]');
    estadoCivilRadios.forEach((radio) => {
      radio.addEventListener('change', () => this.toggleSpouseSection());
    });
  }

  async checkAuth() {
    if (!window.trello?.authCheck) {
      return;
    }

    try {
      const result = await window.trello.authCheck();
      if (!result?.authenticated) {
        this.updateStatus('Credenciais inválidas ou ausentes.', 'error');
        this.setResult('Não foi possível validar o acesso ao Trello. Verifique as credenciais.', false);
      } else {
        this.updateStatus('Conectado ao Trello.');
      }
    } catch (error) {
      this.updateStatus('Erro ao validar credenciais.', 'error');
      this.setResult('Falha na autenticação: ' + (error.message || error), false);
    }
  }

  toggleSpouseSection() {
    if (!this.spouseSection) return;
    const value = this.getRadioValue('estado_civil');
    const visible = value === 'Casado(a)';
    this.spouseSection.style.display = visible ? 'block' : 'none';
  }

  clearErrors() {
    this.form.querySelectorAll('.trello-field-error').forEach((el) => {
      el.textContent = '';
    });
    this.form.querySelectorAll('.input-control.error').forEach((el) => {
      el.classList.remove('error');
    });
  }

  setFieldError(key, message) {
    const holder = this.form.querySelector(`.trello-field-error[data-error="${key}"]`);
    if (holder) {
      holder.textContent = message || '';
      const input = this.form.querySelector(`[name="${key}"]`);
      if (input) {
        input.classList.toggle('error', Boolean(message));
      }
    }
  }

  setResult(message, success = true, extra = '') {
    if (!this.resultEl) return;
    if (!message) {
      this.resultEl.classList.add('hidden');
      this.resultEl.textContent = '';
      return;
    }

    this.resultEl.classList.remove('hidden');
    this.resultEl.textContent = extra ? message + '\n' + extra : message;
    this.resultEl.classList.toggle('text-emerald-300', success);
    this.resultEl.classList.toggle('text-rose-300', !success);
  }

  updateStatus(text, variant = 'idle') {
    if (!this.statusEl) return;
    this.statusEl.textContent = text || '—';
    if (variant === 'error') {
      this.statusEl.classList.add('text-rose-300');
    } else {
      this.statusEl.classList.remove('text-rose-300');
    }
  }

  addVehicle() {
    if (!this.vehicleTemplate || !this.vehiclesContainer) {
      return;
    }

    const fragment = this.vehicleTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.trello-vehicle-card');
    const removeBtn = card.querySelector('.trello-remove-vehicle');
    const vinInput = card.querySelector('[data-field="vin"]');
    const errorHolder = card.querySelector('[data-role="error"]');

    removeBtn.addEventListener('click', () => {
      if (this.vehiclesContainer.children.length <= 1) {
        appendLog('É necessário manter ao menos um veículo.');
        return;
      }
      card.remove();
      this.updateVehicleIndices();
    });

    const updateVehicleLabel = () => {
      const year = card.querySelector('[data-field="ano"]').value;
      const make = card.querySelector('[data-field="marca"]').value;
      const model = card.querySelector('[data-field="modelo"]').value;
      const label = card.querySelector('[data-role="vehicle-label"]');
      if (label) {
        label.textContent = [year, make, model].filter(Boolean).join(' ').trim();
      }
    };

    const handleVinInput = async (event) => {
      const value = (event.target.value || '').toUpperCase().trim();
      event.target.value = value;
      errorHolder.textContent = '';
      vinInput.classList.remove('error');

      if (!value) {
        return;
      }

      if (value.length < 5) {
        errorHolder.textContent = 'VIN inválido';
        vinInput.classList.add('error');
        return;
      }

      if (value.length >= 5) {
        const allVehicles = this.collectVehicles();
        const cards = Array.from(this.vehiclesContainer.children);
        const currentIndex = cards.indexOf(card);
        const duplicates = allVehicles.filter((item, idx) => item.vin === value && idx !== currentIndex).length;
        if (duplicates > 0) {
          errorHolder.textContent = 'VIN duplicado com outro veículo';
          vinInput.classList.add('error');
          return;
        }

        if (value.length === 17) {
          const info = await this.decodeVin(value);
          if (info) {
            if (info.year) card.querySelector('[data-field="ano"]').value = info.year;
            if (info.make) card.querySelector('[data-field="marca"]').value = info.make;
            if (info.model) card.querySelector('[data-field="modelo"]').value = info.model;
            updateVehicleLabel();
          }
        }
      }
    };

    vinInput.addEventListener('change', handleVinInput);
    vinInput.addEventListener('blur', handleVinInput);

    card.querySelectorAll('[data-field]').forEach((input) => {
      input.addEventListener('input', updateVehicleLabel);
    });

    this.vehiclesContainer.appendChild(card);
    this.updateVehicleIndices();
  }

  updateVehicleIndices() {
    if (!this.vehiclesContainer) return;
    const cards = Array.from(this.vehiclesContainer.children);
    cards.forEach((card, index) => {
      const label = card.querySelector('[data-role="vehicle-index"]');
      if (label) label.textContent = index + 1;
    });
  }

  addDriver() {
    if (!this.driverTemplate || !this.driversContainer) {
      return;
    }

    const fragment = this.driverTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.trello-driver-card');
    const removeBtn = card.querySelector('.trello-remove-driver');
    removeBtn.addEventListener('click', () => {
      card.remove();
    });

    const radios = card.querySelectorAll('input[type="radio"][data-field="genero"]');
    const uniqueName = 'driver-genero-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    radios.forEach((radio) => {
      radio.name = uniqueName;
    });

    this.driversContainer.appendChild(card);
  }

  handleReset() {
    this.clearErrors();
    this.setResult('');
    this.updateStatus('Aguardando');
    this.toggleSpouseSection();
    this.vehiclesContainer.innerHTML = '';
    this.driversContainer.innerHTML = '';
    this.addVehicle();
    this.revokePreviews();
    this.selectedImages = [];
    if (this.imageInfo) this.imageInfo.textContent = '';
    if (this.imagePreview) this.imagePreview.innerHTML = '';
    if (this.imageInput) this.imageInput.value = '';
  }

  revokePreviews() {
    this.previewUrls.forEach((url) => URL.revokeObjectURL(url));
    this.previewUrls = [];
  }

  setSelectedImages(files) {
    this.revokePreviews();
    this.selectedImages = files;
    if (this.imageInfo) {
      this.imageInfo.textContent = files.length
        ? files.length + ' arquivo(s) selecionado(s).'
        : '';
    }
    if (!this.imagePreview) return;
    this.imagePreview.innerHTML = '';
    files.forEach((file, idx) => {
      const wrapper = document.createElement('div');
      wrapper.className = 'relative border border-slate-700 rounded-lg overflow-hidden';
      const img = document.createElement('img');
      const url = URL.createObjectURL(file);
      this.previewUrls.push(url);
      img.src = url;
      img.alt = file.name || 'imagem-' + (idx + 1);
      img.style.width = '100%';
      img.style.height = '120px';
      img.style.objectFit = 'cover';
      wrapper.appendChild(img);
      const caption = document.createElement('div');
      caption.className = 'px-2 py-1 text-[10px] text-slate-300 truncate';
      caption.textContent = file.name;
      wrapper.appendChild(caption);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = '✕';
      removeBtn.className = 'absolute top-1 right-1 bg-slate-900/80 text-xs px-1 rounded hover:bg-slate-800';
      removeBtn.addEventListener('click', () => {
        const next = this.selectedImages.filter((_, imageIndex) => imageIndex !== idx);
        this.setSelectedImages(next);
      });
      wrapper.appendChild(removeBtn);

      this.imagePreview.appendChild(wrapper);
    });
  }
  getInputValue(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  getRadioValue(name) {
    const el = this.form.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : '';
  }

  collectVehicles() {
    if (!this.vehiclesContainer) return [];
    const cards = Array.from(this.vehiclesContainer.children);
    return cards.map((card) => {
      const data = {};
      card.querySelectorAll('[data-field]').forEach((input) => {
        data[input.dataset.field] = input.value.trim();
      });
      return data;
    });
  }

  collectDrivers() {
    if (!this.driversContainer) return [];
    const cards = Array.from(this.driversContainer.children);
    return cards.map((card) => {
      const data = {};
      card.querySelectorAll('.trello-driver-input').forEach((input) => {
        const field = input.dataset.field;
        if (input.type === 'radio') {
          if (input.checked) {
            data[field] = input.value;
          }
        } else {
          data[field] = input.value.trim();
        }
      });
      return data;
    });
  }

  validate(formData) {
    const errors = {};
    if (!formData.nome || formData.nome.length < 2) {
      errors.nome = 'Informe o nome completo';
    }
    if (!formData.documento_estado) {
      errors.documento_estado = 'Selecione o estado da licença';
    }
    if (!formData.endereco_rua) {
      errors.endereco_rua = 'Informe a rua';
    }
    if (!formData.endereco_cidade) {
      errors.endereco_cidade = 'Informe a cidade';
    }
    if (!formData.endereco_estado) {
      errors.endereco_estado = 'Selecione o estado';
    }
    if (!formData.endereco_zipcode) {
      errors.endereco_zipcode = 'Informe o ZIP';
    }

    if (!formData.veiculos.length) {
      errors.veiculos = 'Adicione ao menos um veículo';
    } else {
      const seen = new Set();
      formData.veiculos.forEach((vehicle, index) => {
        const vin = (vehicle.vin || '').trim().toUpperCase();
        if (!vin || vin.length < 5) {
          this.setVehicleError(index, 'VIN inválido');
          errors.veiculos = 'Há veículos com VIN inválido';
        } else if (seen.has(vin)) {
          this.setVehicleError(index, 'VIN duplicado com outro veículo');
          errors.veiculos = 'Há veículos com VIN duplicado';
        }
        seen.add(vin);
      });
    }

    if (formData.observacoes && formData.observacoes.length > 2000) {
      errors.observacoes = 'Máximo de 2000 caracteres';
    }

    return errors;
  }

  setVehicleError(index, message) {
    const card = this.vehiclesContainer?.children?.[index];
    if (!card) return;
    const errorHolder = card.querySelector('[data-role="error"]');
    const vinInput = card.querySelector('[data-field="vin"]');
    if (errorHolder) {
      errorHolder.textContent = message;
    }
    if (vinInput) {
      vinInput.classList.toggle('error', Boolean(message));
    }
  }

  async handleSubmit() {
    if (!window.trello?.createCard) {
      appendLog('API trello indisponível no preload.');
      this.setResult('Integração Trello não está disponível.', false);
      return;
    }

    this.clearErrors();
    this.form.querySelectorAll('[data-role="error"]').forEach((el) => {
      el.textContent = '';
    });

    const formData = {
      nome: this.getInputValue('trelloNome'),
      estado_civil: this.getRadioValue('estado_civil'),
      genero: this.getRadioValue('genero'),
      documento: this.getInputValue('trelloDocumento'),
      documento_estado: this.getInputValue('trelloDocumentoEstado'),
      endereco_rua: this.getInputValue('trelloEnderecoRua'),
      endereco_apt: this.getInputValue('trelloEnderecoApt'),
      endereco_cidade: this.getInputValue('trelloEnderecoCidade'),
      endereco_estado: this.getInputValue('trelloEnderecoEstado'),
      endereco_zipcode: this.getInputValue('trelloEnderecoZip'),
      data_nascimento: this.getInputValue('trelloNascimento'),
      tempo_de_seguro: this.getInputValue('trelloTempoSeguro'),
      tempo_no_endereco: this.getInputValue('trelloTempoEndereco'),
      nome_conjuge: this.getInputValue('trelloNomeConjuge'),
      documento_conjuge: this.getInputValue('trelloDocumentoConjuge'),
      data_nascimento_conjuge: this.getInputValue('trelloNascimentoConjuge'),
      observacoes: document.getElementById('trelloObservacoes')?.value.trim() || '',
      veiculos: this.collectVehicles(),
      pessoas: this.collectDrivers()
    };

    const errors = this.validate(formData);
    Object.entries(errors).forEach(([key, message]) => this.setFieldError(key, message));
    if (Object.keys(errors).length) {
      this.updateStatus('Verifique os campos informados.', 'error');
      this.setResult('Existem erros no formulário. Corrija para continuar.', false);
      return;
    }

    try {
      this.updateStatus('Criando card...', 'running');
      this.submitBtn.disabled = true;
      this.setResult('');

      const attachments = await this.prepareAttachments();
      const payload = {
        ...formData,
        attachments
      };

      const response = await window.trello.createCard(payload);
      if (!response?.success) {
        const message = response?.error || 'Falha ao criar o card.';
        this.updateStatus('Erro ao criar card.', 'error');
        this.setResult(message, false);
        appendLog('Trello: ' + message);
        return;
      }

      const cardInfo = response.card || {};
      const url = cardInfo.url || '';
      const attachmentsInfo = cardInfo.attachments;
      let extra = '';
      if (attachmentsInfo?.total) {
        const ok = attachmentsInfo.sucesso?.length || 0;
        const fail = attachmentsInfo.falha?.length || 0;
        const failMessage = fail ? ', erros: ' + fail : '';
        extra = 'Anexos enviados: ' + ok + failMessage;
      }

      const message = url ? 'Card criado com sucesso: ' + url : 'Card criado com sucesso.';
      this.updateStatus('Card criado com sucesso.');
      this.setResult(message, true, extra);
      appendLog('Trello: ' + message);
      this.form.reset();
      this.handleReset();
    } catch (error) {
      this.updateStatus('Erro ao criar card.', 'error');
      this.setResult(error.message || String(error), false);
      appendLog('Trello erro: ' + (error.message || error));
    } finally {
      this.submitBtn.disabled = false;
    }
  }

  async prepareAttachments() {
    if (!this.selectedImages.length) {
      return [];
    }

    const entries = await Promise.all(
      this.selectedImages.map(async (file) => {
        const dataUrl = await readFileAsDataUrl(file);
        return {
          name: file.name,
          dataUrl
        };
      })
    );

    return entries;
  }

  async decodeVin(vin) {
    if (!vin || vin.length < 11) {
      return null;
    }
    const url = 'https://vpic.nhtsa.dot.gov/api/vehicles/decodevinvalues/' + encodeURIComponent(vin) + '?format=json';
    try {
      const resp = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!resp.ok) return null;
      const data = await resp.json();
      const row = data?.Results?.[0] || {};
      return {
        year: row?.ModelYear || row?.Model_Year || '',
        make: row?.Make || '',
        model: row?.Model || ''
      };
    } catch (_) {
      return null;
    }
  }
}

function initializeTrelloForm() {
  if (!trelloFormManager) {
    trelloFormManager = new TrelloFormManager();
    trelloFormManager.init();
  }
}
