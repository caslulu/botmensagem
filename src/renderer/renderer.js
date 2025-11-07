// DOM Elements
const profilesContainer = document.getElementById('profilesContainer');
const selectionView = document.getElementById('selectionView');
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

startButton.disabled = true;
selectionView.classList.remove('hidden');
controlView.classList.add('hidden');

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
    selectionView.classList.add('hidden');
    controlView.classList.remove('hidden');
    setStatus('Pronto para iniciar os envios.');
    updateStatusBadge('stopped');
    
    // Load messages and settings for this profile
    loadMessages(profileId);
    loadProfileSettings(profileId);
  } else {
    startButton.disabled = true;
    setStatus('Selecione um operador para começar.');
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
  controlView.classList.add('hidden');
  selectionView.classList.remove('hidden');
  setStatus('Selecione um operador para começar.');
  updateStatusBadge('idle');
  setSelectionEnabled(true);
  updateProfilesActiveState();
});

loadProfiles();

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
