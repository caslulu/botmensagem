const QuotesModule = (() => {
  const elements = {
    view: document.getElementById('quotesView'),
    list: document.getElementById('quotesList')
  };

  function formatDate(datetime) {
    if (!datetime) return '—';
    try {
      const d = new Date(datetime);
      return d.toLocaleString();
    } catch (_) {
      return String(datetime);
    }
  }

  function emitStatus(text, badge = 'idle') {
    window.dispatchEvent(new CustomEvent('quotes-module:status', { detail: { text, badge } }));
  }

  function createCard(quote) {
    const card = document.createElement('div');
    card.className = 'module-card p-4 flex items-start justify-between';

    const info = document.createElement('div');
    info.className = 'flex-1';

    const title = document.createElement('div');
    title.className = 'text-sm font-semibold text-white';
    title.textContent = quote.nome || '(Sem nome)';

    const subtitle = document.createElement('div');
    subtitle.className = 'text-xs text-slate-400';
    subtitle.textContent = quote.documento ? `Documento: ${quote.documento}` : '';

    const meta = document.createElement('div');
    meta.className = 'text-xs text-slate-400 mt-2';
    meta.textContent = `Criado: ${formatDate(quote.createdAt)}`;

    const status = document.createElement('p');
    status.className = 'text-xs text-slate-300 mt-2';
    status.textContent = '';

    info.appendChild(title);
    info.appendChild(subtitle);
    info.appendChild(meta);
    info.appendChild(status);

    const actions = document.createElement('div');
    actions.className = 'flex gap-2';

    const cotarBtn = document.createElement('button');
    cotarBtn.type = 'button';
    cotarBtn.className = 'btn-primary';
    cotarBtn.textContent = 'Cotar';
    cotarBtn.addEventListener('click', async () => {
      if (!window.quotes?.runAutomation) {
        alert('Automação de cotação não disponível.');
        return;
      }

      const insurer = 'Progressive';
      const previousLabel = cotarBtn.textContent;
      cotarBtn.disabled = true;
      cotarBtn.textContent = 'Executando…';
      status.textContent = 'Iniciando automação na Progressive…';
      emitStatus('Iniciando automação na Progressive…', 'running');

      try {
        const response = await window.quotes.runAutomation({ quoteId: quote.id, insurer });
        if (!response?.success) {
          throw new Error(response?.error || 'Falha ao iniciar a automação.');
        }

        const automationResult = response.result?.result;
        if (!automationResult?.success) {
          throw new Error(automationResult?.error || 'Automação finalizou com erro.');
        }

        status.textContent = 'Automação concluída com sucesso.';
        emitStatus('Cotação automática concluída.', 'stopped');
      } catch (error) {
        console.error('[QuotesModule] Automação falhou:', error);
        status.textContent = error.message || 'Erro ao executar automação.';
        emitStatus('Erro ao executar cotação automática.', 'error');
        alert(error.message || 'Erro ao executar automação.');
      } finally {
        cotarBtn.disabled = false;
        cotarBtn.textContent = previousLabel;
      }
    });

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-secondary';
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => {
      // Open Trello module and prefill basic fields
      if (window.rendererModules?.select) {
        window.rendererModules.select('trello');
      }
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('trello:prefill', { detail: { quote } }));
      }, 150);
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-secondary';
    deleteBtn.textContent = 'Apagar';
    deleteBtn.addEventListener('click', async () => {
      const ok = confirm('Deseja apagar esta cotação?');
      if (!ok) return;
      try {
        const resp = await window.price.deleteQuote(quote.id);
        if (resp?.success) {
          loadQuotes();
        } else {
          alert(resp?.error || 'Falha ao apagar a cotação');
        }
      } catch (error) {
        console.error('Erro ao apagar cotação', error);
        alert(error.message || String(error));
      }
    });

    actions.appendChild(cotarBtn);
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    card.appendChild(info);
    card.appendChild(actions);

    return card;
  }

  async function renderList(quotes) {
    if (!elements.list) return;
    elements.list.innerHTML = '';

    if (!Array.isArray(quotes) || !quotes.length) {
      const empty = document.createElement('p');
      empty.className = 'text-slate-400';
      empty.textContent = 'Nenhuma cotação encontrada.';
      elements.list.appendChild(empty);
      return;
    }

    const frag = document.createDocumentFragment();
    quotes.forEach((q) => {
      const card = createCard(q);
      frag.appendChild(card);
    });
    elements.list.appendChild(frag);
  }

  async function loadQuotes() {
    if (!window.price?.listQuotes) {
      console.warn('[QuotesModule] API price.listQuotes não disponível.');
      return;
    }
    try {
      const resp = await window.price.listQuotes();
      if (!resp?.success) {
        throw new Error(resp?.error || 'Falha ao carregar cotações');
      }
      await renderList(resp.quotes || []);
    } catch (error) {
      console.error('[QuotesModule] Erro ao carregar cotações:', error);
      if (elements.list) {
        elements.list.innerHTML = '<p class="text-rose-400">Erro ao carregar cotações.</p>';
      }
    }
  }

  function onEnter() {
    if (elements.view) elements.view.style.display = 'flex';
    emitStatus('Selecione uma cotação para automatizar ou editar.', 'idle');
    loadQuotes();
  }

  function onExit() {
    if (elements.view) elements.view.style.display = 'none';
  }

  function init() {
    // register module in rendererModules API
    if (window.rendererModules?.enable) {
      window.rendererModules.enable({
        id: 'cotacoes',
        name: 'Cotações',
        icon: '📑',
        description: 'Gerencie cotações salvas: cotar, editar (prefill Trello) ou apagar.',
        requiresAdmin: false,
        requiresProfile: false
      });
    }

    // expose minimal API for other modules
    window.addEventListener('quotes:refresh', () => loadQuotes());
  }

  return { init, onEnter, onExit };
})();

if (typeof QuotesModule !== 'undefined') {
  QuotesModule.init();
}

window.addEventListener('quotes-module:enter', () => {
  QuotesModule.onEnter();
});

window.addEventListener('quotes-module:exit', () => {
  QuotesModule.onExit();
});
