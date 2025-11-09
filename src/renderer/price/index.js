const PriceModule = (() => {
  const state = {
    insurer: 'Allstate',
    tax: 320,
    language: 'pt',
    quoteId: '',
    quotesLoaded: false
  };

  const elements = {
    view: document.getElementById('priceView'),
    alert: document.getElementById('priceGlobalAlert'),
    quoteSelect: document.getElementById('priceQuoteSelect'),
    quoteHint: document.getElementById('priceQuoteHint'),
    taxRadios: Array.from(document.querySelectorAll('input[name="priceTax"]')),
    insurerRadios: Array.from(document.querySelectorAll('input[name="priceInsurer"]')),
    languageRadios: Array.from(document.querySelectorAll('input[name="priceLanguage"]')),
    quitadoForm: document.getElementById('priceQuitadoForm'),
    financiadoForm: document.getElementById('priceFinanciadoForm'),
    resultPanel: document.getElementById('priceResultPanel'),
    resultStatus: document.getElementById('priceResultStatus'),
    resultMessage: document.getElementById('priceResultMessage'),
    resultPath: document.getElementById('priceResultPath'),
    resultTrello: document.getElementById('priceResultTrello'),
    openBtn: document.getElementById('priceOpenFileBtn'),
    downloadBtn: document.getElementById('priceDownloadFileBtn'),
    showFolderBtn: document.getElementById('priceShowFolderBtn')
  };

  function emitStatus(text, badge) {
    window.dispatchEvent(new CustomEvent('price-module:status', { detail: { text, badge } }));
  }

  function showAlert(message) {
    if (!elements.alert) return;
    if (!message) {
      elements.alert.classList.add('hidden');
      return;
    }
    const textNode = elements.alert.querySelector('span:last-child');
    if (textNode) {
      textNode.textContent = message;
    }
    elements.alert.classList.remove('hidden');
  }

  function clearAlert() {
    showAlert(null);
  }

  function populateQuotes(quotes) {
    if (!elements.quoteSelect) return;
    const select = elements.quoteSelect;
    const previous = state.quoteId;

    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = 'Selecione uma cotação';
    select.appendChild(placeholder);

    if (!quotes.length) {
      if (elements.quoteHint) {
        elements.quoteHint.textContent = 'Nenhuma cotação encontrada. Importe dados via Trello ou cadastre manualmente no arquivo price/quotes.json.';
      }
      state.quoteId = '';
      return;
    }

    quotes.forEach((quote) => {
      const option = document.createElement('option');
      option.value = quote.id;
      const subtitle = quote.documento ? ` | ${quote.documento}` : '';
      option.textContent = `${quote.nome}${subtitle}`;
      if (quote.id === previous) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    if (previous && !quotes.find((q) => q.id === previous)) {
      state.quoteId = '';
    }
  }

  async function loadQuotes() {
    if (!window.price?.listQuotes) {
      if (elements.quoteHint) {
        elements.quoteHint.textContent = 'API de preços não disponível.';
      }
      return;
    }

    try {
      const response = await window.price.listQuotes();
      if (!response?.success || !Array.isArray(response.quotes)) {
        throw new Error(response?.error || 'Falha ao carregar cotações.');
      }
      populateQuotes(response.quotes);
      state.quotesLoaded = true;
    } catch (error) {
      console.error('[PriceModule] Erro ao carregar cotações:', error);
      if (elements.quoteHint) {
        elements.quoteHint.textContent = error.message;
      }
    }
  }

  function setResultLoading(isLoading) {
    if (!elements.resultPanel) return;
    elements.resultPanel.classList.remove('hidden');
    elements.resultStatus.textContent = isLoading ? 'Gerando…' : 'Concluído';

    if (isLoading) {
      elements.resultStatus.style.background = 'rgba(59,130,246,0.15)';
      elements.resultStatus.style.color = 'rgb(191,219,254)';
      elements.resultMessage.textContent = 'Gerando imagem com os dados informados. Aguarde…';
      elements.resultPath.textContent = '—';
      elements.resultTrello.textContent = '—';
    }

    [elements.openBtn, elements.downloadBtn, elements.showFolderBtn].forEach((btn) => {
      if (btn) {
        btn.disabled = true;
        btn.dataset.path = '';
      }
    });
  }

  function updateResult(result) {
    if (!elements.resultPanel || !result) return;
    elements.resultPanel.classList.remove('hidden');

    const { outputPath, downloadPath, attachedToTrello, cotacao } = result;

    elements.resultStatus.textContent = attachedToTrello
      ? 'Anexado ao Trello'
      : 'Imagem gerada';

    if (attachedToTrello) {
      elements.resultStatus.style.background = 'rgba(16,185,129,0.18)';
      elements.resultStatus.style.color = 'rgb(167,243,208)';
    } else {
      elements.resultStatus.style.background = 'rgba(59,130,246,0.15)';
      elements.resultStatus.style.color = 'rgb(191,219,254)';
    }

    if (attachedToTrello) {
      elements.resultMessage.textContent = 'Imagem anexada ao card do Trello selecionado com sucesso. Uma cópia também foi salva na pasta de downloads.';
    } else if (cotacao?.trelloCardId) {
      elements.resultMessage.textContent = 'A imagem foi gerada e salva na pasta de downloads, mas não foi possível anexar ao Trello. Verifique as credenciais.';
    } else {
      elements.resultMessage.textContent = 'Imagem gerada com sucesso e salva na pasta de downloads.';
    }

    elements.resultPath.textContent = downloadPath || outputPath || '—';
    elements.resultTrello.textContent = attachedToTrello ? 'Sim' : 'Não';

    const primaryPath = downloadPath || outputPath || '';
    const originalPath = outputPath || downloadPath || '';

    if (elements.openBtn) {
      elements.openBtn.disabled = !primaryPath;
      elements.openBtn.dataset.path = primaryPath;
    }

    if (elements.showFolderBtn) {
      elements.showFolderBtn.disabled = !primaryPath;
      elements.showFolderBtn.dataset.path = primaryPath;
    }

    if (elements.downloadBtn) {
      elements.downloadBtn.disabled = !originalPath;
      elements.downloadBtn.dataset.path = originalPath;
    }
  }

  function collectFields(form, fields) {
    return fields.reduce((acc, fieldName) => {
      const input = form.querySelector(`[name="${fieldName}"]`);
      acc[fieldName] = input ? input.value.trim() : '';
      return acc;
    }, {});
  }

  async function handleSubmit(formType, form) {
    const button = form.querySelector('button[type="submit"]');

    if (!state.insurer) {
      showAlert('Selecione uma seguradora antes de continuar.');
      return;
    }

    clearAlert();

    const requiredFields = formType === 'quitado'
      ? ['nome', 'entrada_basico', 'mensal_basico', 'valor_total_basico', 'entrada_completo', 'mensal_completo', 'valor_total_completo']
      : ['nome', 'entrada_completo', 'mensal_completo', 'valor_total_completo'];

    const campos = collectFields(form, requiredFields);
    const missing = requiredFields.filter((field) => !campos[field]);
    if (missing.length) {
      showAlert('Preencha todos os campos obrigatórios antes de gerar a imagem.');
      const firstMissing = form.querySelector(`[name="${missing[0]}"]`);
      firstMissing?.focus();
      return;
    }

    if (button) {
      button.disabled = true;
    }

    setResultLoading(true);
    emitStatus('Gerando imagem de preço…', 'running');

    const payload = {
      formType,
      seguradora: state.insurer,
      idioma: state.language,
      taxaCotacao: state.tax,
      apenasPrever: false,
      cotacaoId: state.quoteId || null,
      campos
    };

    try {
      const response = await window.price.generate(payload);
      if (!response?.success) {
        throw new Error(response?.error || 'Falha ao gerar a imagem.');
      }
      updateResult(response.result);
      if (response.result.attachedToTrello) {
        emitStatus('Imagem anexada ao Trello com sucesso.', 'stopped');
      } else {
        emitStatus('Imagem gerada com sucesso.', 'stopped');
      }
    } catch (error) {
      console.error('[PriceModule] Falha na geração do preço:', error);
      showAlert(error.message);
      emitStatus('Erro ao gerar o preço automático.', 'error');
      if (elements.resultPanel) {
        elements.resultPanel.classList.remove('hidden');
        elements.resultStatus.textContent = 'Erro';
        elements.resultStatus.style.background = 'rgba(248,113,113,0.2)';
        elements.resultStatus.style.color = 'rgb(254,226,226)';
        elements.resultMessage.textContent = error.message;
        elements.resultPath.textContent = '—';
        elements.resultTrello.textContent = '—';
        [elements.openBtn, elements.downloadBtn, elements.showFolderBtn].forEach((btn) => {
          if (btn) btn.disabled = true;
        });
      }
    } finally {
      if (button) {
        button.disabled = false;
      }
    }
  }

  function openPath(pathValue) {
    if (!pathValue) return;
    window.files?.openPath?.(pathValue);
  }

  function saveToDownloads(pathValue) {
    if (!pathValue) return;
    const fileName = pathValue.split(/[\\/]/).pop();
    window.files?.saveToDownloads?.(pathValue, fileName);
  }

  function showInFolder(pathValue) {
    if (!pathValue) return;
    window.files?.showInFolder?.(pathValue);
  }

  function registerButtonActions() {
    if (elements.openBtn) {
      elements.openBtn.addEventListener('click', () => {
        openPath(elements.openBtn.dataset.path);
      });
    }

    if (elements.downloadBtn) {
      elements.downloadBtn.addEventListener('click', () => {
        saveToDownloads(elements.downloadBtn.dataset.path);
      });
    }

    if (elements.showFolderBtn) {
      elements.showFolderBtn.addEventListener('click', () => {
        showInFolder(elements.showFolderBtn.dataset.path);
      });
    }
  }

  function registerInputMasks() {
    if (!elements.view) return;
    const inputs = elements.view.querySelectorAll('input[inputmode="decimal"]');
    inputs.forEach((input) => {
      input.addEventListener('input', () => {
        const clean = input.value.replace(/[^0-9.,$\s-]/g, '');
        input.value = clean;
      });
    });
  }

  function registerListeners() {
    if (elements.quoteSelect) {
      elements.quoteSelect.addEventListener('change', (event) => {
        state.quoteId = event.target.value;
      });
    }

    elements.taxRadios.forEach((radio) => {
      radio.addEventListener('change', (event) => {
        if (event.target.checked) {
          state.tax = Number.parseFloat(event.target.value) || 0;
        }
      });
    });

    elements.insurerRadios.forEach((radio) => {
      radio.addEventListener('change', (event) => {
        if (event.target.checked) {
          state.insurer = event.target.value;
          clearAlert();
        }
      });
    });

    elements.languageRadios.forEach((radio) => {
      radio.addEventListener('change', (event) => {
        if (event.target.checked) {
          state.language = event.target.value;
        }
      });
    });

    if (elements.quitadoForm) {
      elements.quitadoForm.addEventListener('submit', (event) => {
        event.preventDefault();
        handleSubmit('quitado', elements.quitadoForm);
      });
    }

    if (elements.financiadoForm) {
      elements.financiadoForm.addEventListener('submit', (event) => {
        event.preventDefault();
        handleSubmit('financiado', elements.financiadoForm);
      });
    }

    registerButtonActions();
    registerInputMasks();
  }

  function onEnter() {
    clearAlert();
    emitStatus('Preencha os dados para gerar a imagem de preço.', 'idle');
    if (!state.quotesLoaded) {
      loadQuotes();
    }
  }

  function onExit() {
    clearAlert();
  }

  function init() {
    if (!elements.view) {
      console.warn('[PriceModule] View não encontrada.');
      return;
    }
    registerListeners();
    if (elements.insurerRadios?.length) {
      state.insurer = elements.insurerRadios.find((radio) => radio.checked)?.value || state.insurer;
    }
  }

  return {
    init,
    onEnter,
    onExit
  };
})();

if (window.rendererModules?.enable) {
  window.rendererModules.enable({
    id: 'price',
    name: 'Preço automático',
    icon: '💵',
    description: 'Gere imagens de preço multilíngues e anexe ao Trello quando necessário.',
    requiresAdmin: true,
    requiresProfile: true
  });
}

PriceModule.init();

window.addEventListener('price-module:enter', () => PriceModule.onEnter());
window.addEventListener('price-module:exit', () => PriceModule.onExit());