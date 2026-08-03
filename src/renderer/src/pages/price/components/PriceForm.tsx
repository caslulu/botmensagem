import React, { useEffect, useMemo, useState } from 'react';

interface PriceFormData {
  formType: 'quitado' | 'financiado';
  seguradora: string;
  idioma: string;
  taxaCotacao: number;
  taxaType: '320' | '400' | '500' | 'custom';
  nome: string;
  entrada_basico: string;
  mensal_basico: string;
  valor_total_basico: string;
  entrada_completo: string;
  mensal_completo: string;
  valor_total_completo: string;
}

type KanbanCard = {
  id: string;
  title: string;
  payload: Record<string, any>;
  columnId: string;
};

type KanbanColumn = {
  id: string;
  title: string;
  cards: KanbanCard[];
};

type BoardResponse = {
  columns: KanbanColumn[];
};

type CardPersonOption = {
  key: string;
  name: string;
  label: string;
};

const OTHER_PERSON_KEY = '__other_person__';

const insurerOptions = ['Allstate', 'Progressive', 'Geico', 'Direct', 'StateFarm', 'Liberty'];

const languageOptions = [
  { value: 'pt', label: 'Português' },
  { value: 'en', label: 'Inglês' },
  { value: 'es', label: 'Espanhol' }
];

const initialForm: PriceFormData = {
  formType: 'quitado',
  seguradora: 'Allstate',
  idioma: 'pt',
  taxaCotacao: 320,
  taxaType: '320',
  nome: '',
  entrada_basico: '',
  mensal_basico: '',
  valor_total_basico: '',
  entrada_completo: '',
  mensal_completo: '',
  valor_total_completo: ''
};

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (value !== undefined && value !== null && String(value).trim()) {
      return String(value).trim();
    }
  }
  return '';
}

function normalizeBoard(data: any): BoardResponse {
  return {
    columns: Array.isArray(data?.columns)
      ? data.columns.map((column: KanbanColumn) => ({ ...column, cards: Array.isArray(column.cards) ? column.cards : [] }))
      : []
  };
}

async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await window.desktopWebApi?.request({ method, path, body });
  if (!response?.success) {
    throw new Error(response?.error || 'Erro ao acessar a API cloud.');
  }
  return response.data as T;
}

function extractPeopleFromCard(card: KanbanCard | null): CardPersonOption[] {
  if (!card) return [];

  const payload = card.payload || {};
  const people: CardPersonOption[] = [];
  const seen = new Set<string>();
  const addPerson = (key: string, name: string, label: string) => {
    const normalizedName = name.trim();
    if (!normalizedName) return;
    const dedupeKey = normalizedName.toLowerCase();
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    people.push({ key, name: normalizedName, label });
  };

  addPerson('titular', readString(payload.nome, card.title), `Titular: ${readString(payload.nome, card.title)}`);

  const spouseName = readString(payload?.conjuge?.nome);
  if (spouseName) {
    addPerson('conjuge', spouseName, `Cônjuge: ${spouseName}`);
  }

  if (Array.isArray(payload.pessoas)) {
    payload.pessoas.forEach((person: any, index: number) => {
      const personName = readString(person?.nome);
      if (personName) {
        addPerson(`pessoa-${index}`, personName, `Pessoa ${index + 1}: ${personName}`);
      }
    });
  }

  return people;
}

function pickFileName(filePath: string): string {
  const clean = String(filePath || '').trim();
  if (!clean) return `preco-${Date.now()}.png`;
  const parts = clean.split(/[/\\]/).filter(Boolean);
  return parts[parts.length - 1] || `preco-${Date.now()}.png`;
}

function getCardLabel(card: KanbanCard): string {
  return readString(card.payload?.nome, card.title, card.id);
}

export const PriceForm: React.FC = () => {
  const [form, setForm] = useState<PriceFormData>(initialForm);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [attachToKanban, setAttachToKanban] = useState(true);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [cardSearch, setCardSearch] = useState('');
  const [cardComboboxOpen, setCardComboboxOpen] = useState(false);
  const [selectedPersonKey, setSelectedPersonKey] = useState<string>(OTHER_PERSON_KEY);
  const [loadingCards, setLoadingCards] = useState(false);
  const [cardsError, setCardsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedCardId) || null,
    [cards, selectedCardId]
  );

  const peopleOptions = useMemo(
    () => extractPeopleFromCard(selectedCard),
    [selectedCard]
  );

  const filteredCards = useMemo(() => {
    const query = cardSearch.trim().toLowerCase();
    if (!query) return cards.slice(0, 12);
    return cards
      .filter((card) => getCardLabel(card).toLowerCase().includes(query))
      .slice(0, 12);
  }, [cards, cardSearch]);

  const customNameMode = selectedPersonKey === OTHER_PERSON_KEY;

  const loadKanbanCards = async () => {
    setLoadingCards(true);
    setCardsError(null);
    try {
      const board = await apiRequest<BoardResponse>('GET', '/kanban');
      const normalized = normalizeBoard(board);
      const flatCards = normalized.columns
        .flatMap((column) => column.cards || [])
        .filter((card) => card?.id)
        .sort((a, b) => readString(a.title).localeCompare(readString(b.title), 'pt-BR'));

      setCards(flatCards);
      setSelectedCardId((current) => {
        if (current && flatCards.some((card) => card.id === current)) return current;
        return flatCards[0]?.id || '';
      });
    } catch (err) {
      setCards([]);
      setSelectedCardId('');
      setCardsError(err instanceof Error ? err.message : 'Erro ao carregar cards do Kanban.');
    } finally {
      setLoadingCards(false);
    }
  };

  useEffect(() => {
    void loadKanbanCards();
  }, []);

  useEffect(() => {
    if (selectedCard) {
      setCardSearch(getCardLabel(selectedCard));
    }
  }, [selectedCard]);

  useEffect(() => {
    if (!selectedCard) {
      setSelectedPersonKey(OTHER_PERSON_KEY);
      setForm((prev) => ({ ...prev, nome: '' }));
      return;
    }

    if (peopleOptions.length > 0) {
      setSelectedPersonKey(peopleOptions[0].key);
      setForm((prev) => ({ ...prev, nome: peopleOptions[0].name }));
      return;
    }

    setSelectedPersonKey(OTHER_PERSON_KEY);
    setForm((prev) => ({ ...prev, nome: '' }));
  }, [selectedCardId, selectedCard, peopleOptions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const selectCard = (nextCardId: string) => {
    const nextCard = cards.find((card) => card.id === nextCardId);
    setAttachToKanban(true);
    setSelectedCardId(nextCardId);
    setCardSearch(nextCard ? getCardLabel(nextCard) : '');
    setCardComboboxOpen(false);
    setSelectedPersonKey(OTHER_PERSON_KEY);
    setForm((prev) => ({ ...prev, nome: '' }));
  };

  const handleCardSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAttachToKanban(true);
    setCardSearch(value);
    setCardComboboxOpen(true);

    const exactCard = cards.find((card) => getCardLabel(card).toLowerCase() === value.trim().toLowerCase());
    setSelectedCardId(exactCard?.id || '');
    if (!exactCard) {
      setSelectedPersonKey(OTHER_PERSON_KEY);
      setForm((prev) => ({ ...prev, nome: '' }));
    }
  };

  const handleCardComboboxBlur = (event: React.FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setCardComboboxOpen(false);
      if (selectedCard) {
        setCardSearch(getCardLabel(selectedCard));
      }
    }
  };

  const handleCardSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      setCardComboboxOpen(false);
      return;
    }

    if (event.key === 'Enter' && cardComboboxOpen && filteredCards[0]) {
      event.preventDefault();
      selectCard(filteredCards[0].id);
    }
  };

  const handleAttachToKanbanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const shouldAttach = e.target.checked;
    setAttachToKanban(shouldAttach);
    setCardComboboxOpen(false);

    if (!shouldAttach) {
      setSelectedCardId('');
      setCardSearch('');
      setSelectedPersonKey(OTHER_PERSON_KEY);
      setForm((prev) => ({ ...prev, nome: '' }));
      return;
    }

    const fallbackCard = selectedCard || cards[0];
    if (fallbackCard) {
      selectCard(fallbackCard.id);
    }
  };

  const handlePersonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPersonKey = e.target.value;
    setSelectedPersonKey(nextPersonKey);
    if (nextPersonKey === OTHER_PERSON_KEY) {
      setForm((prev) => ({ ...prev, nome: '' }));
      return;
    }
    const selectedPerson = peopleOptions.find((person) => person.key === nextPersonKey);
    if (selectedPerson) {
      setForm((prev) => ({ ...prev, nome: selectedPerson.name }));
    }
  };

  const handleTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value as '320' | '400' | '500' | 'custom';
    setForm((prev) => ({
      ...prev,
      taxaType: value,
      taxaCotacao: value === 'custom' ? prev.taxaCotacao : Number(value)
    }));
  };

  const handleCustomTaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, taxaCotacao: Number(e.target.value) }));
  };

  const attachImageToKanbanCard = async (cardId: string, imagePath: string) => {
    const board = await apiRequest<BoardResponse>('GET', '/kanban');
    const normalized = normalizeBoard(board);
    const currentCard = normalized.columns
      .flatMap((column) => column.cards || [])
      .find((card) => card.id === cardId);

    if (!currentCard) {
      throw new Error('Card do Kanban não encontrado para anexar a imagem.');
    }

    const payload = (currentCard.payload || {}) as Record<string, any>;
    const existingImages = Array.isArray(payload.priceImages) ? payload.priceImages : [];
    const nextImage = {
      kind: 'price-image',
      source: 'desktop-price',
      path: imagePath,
      filename: pickFileName(imagePath),
      createdAt: new Date().toISOString()
    };

    await apiRequest<KanbanCard>('PATCH', `/kanban/cards/${cardId}`, {
      payload: {
        ...payload,
        priceImages: [nextImage, ...existingImages].slice(0, 30),
        lastPriceImage: nextImage
      }
    });

    setCards((prev) => prev.map((card) => {
      if (card.id !== cardId) return card;
      return {
        ...card,
        payload: {
          ...payload,
          priceImages: [nextImage, ...existingImages].slice(0, 30),
          lastPriceImage: nextImage
        }
      };
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    if (attachToKanban && !selectedCardId) {
      setError('Selecione um card do Kanban.');
      setLoading(false);
      return;
    }

    const requiredFields = form.formType === 'quitado'
      ? ['nome', 'entrada_basico', 'mensal_basico', 'valor_total_basico', 'entrada_completo', 'mensal_completo', 'valor_total_completo']
      : ['nome', 'entrada_completo', 'mensal_completo', 'valor_total_completo'];

    const missing = requiredFields.filter((field) => !form[field as keyof PriceFormData]);
    if (missing.length > 0) {
      setError('Preencha todos os campos obrigatórios.');
      setLoading(false);
      return;
    }

    try {
      const payload = {
        formType: form.formType,
        seguradora: form.seguradora,
        idioma: form.idioma,
        taxaCotacao: form.taxaCotacao,
        apenasPrever: false,
        campos: {
          nome: form.nome,
          entrada_basico: form.entrada_basico,
          mensal_basico: form.mensal_basico,
          valor_total_basico: form.valor_total_basico,
          entrada_completo: form.entrada_completo,
          mensal_completo: form.mensal_completo,
          valor_total_completo: form.valor_total_completo
        }
      };

      const res = await window.price?.generate?.(payload);
      if (res && typeof res === 'object' && 'success' in res && res.success) {
        const generatedPath = res.result?.outputPath || res.output?.outputPath;
        if (generatedPath) {
          window.lastGeneratedPricePath = generatedPath;
          if (attachToKanban && selectedCardId) {
            await attachImageToKanbanCard(selectedCardId, generatedPath);
            setResult(`Imagem gerada e anexada ao card: ${generatedPath}`);
          } else {
            setResult(`Imagem gerada: ${generatedPath}`);
          }
        } else {
          setResult(attachToKanban
            ? 'Imagem gerada, mas sem caminho de arquivo retornado para anexar no card.'
            : 'Imagem gerada, mas sem caminho de arquivo retornado.');
        }
      } else {
        setError((res as any)?.error || 'Erro ao gerar imagem.');
      }
    } catch (submitError: any) {
      setError(submitError?.message || 'Erro ao gerar imagem.');
    } finally {
      setLoading(false);
    }
  };

  const openFile = () => {
    if (window.lastGeneratedPricePath) window.files?.openPath(window.lastGeneratedPricePath);
  };

  const showInFolder = () => {
    if (window.lastGeneratedPricePath) window.files?.showInFolder(window.lastGeneratedPricePath);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="rta-section">
        <div className="rta-section-header">
          <span className="rta-section-icon">💵</span>
          <div>
            <h2 className="rta-section-title">Gerar Imagem de Preço</h2>
            <p className="rta-section-description">Gere a imagem e, se quiser, anexe em um card do Kanban.</p>
          </div>
        </div>

        <div className="rta-grid rta-grid-auto gap-4">
          <div className="input-group">
            <label className="flex items-center justify-between gap-3">
              <span>Card do Kanban</span>
              <span className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <input
                  type="checkbox"
                  checked={attachToKanban}
                  onChange={handleAttachToKanbanChange}
                  className="accent-brand-500"
                />
                Anexar
              </span>
            </label>
            <div className="relative" onBlur={handleCardComboboxBlur}>
              <input
                value={cardSearch}
                onChange={handleCardSearchChange}
                onKeyDown={handleCardSearchKeyDown}
                onFocus={() => setCardComboboxOpen(true)}
                className="input-control pr-10"
                placeholder={attachToKanban ? 'Digite para buscar um card' : 'Geração sem vínculo com Kanban'}
                disabled={loadingCards || !attachToKanban}
                role="combobox"
                aria-expanded={cardComboboxOpen}
                aria-controls="price-card-options"
                aria-autocomplete="list"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xl leading-none text-slate-400 transition hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setCardComboboxOpen((current) => !current)}
                disabled={loadingCards || !attachToKanban}
                aria-label="Abrir lista de cards"
              >
                ˅
              </button>
              {cardComboboxOpen && !loadingCards && attachToKanban ? (
                <div
                  id="price-card-options"
                  role="listbox"
                  className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-950/95 p-2 shadow-2xl shadow-black/30 backdrop-blur"
                >
                  {filteredCards.map((card) => {
                    const label = getCardLabel(card);
                    return (
                      <button
                        key={card.id}
                        type="button"
                        role="option"
                        aria-selected={card.id === selectedCardId}
                        className={`block w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                          card.id === selectedCardId
                            ? 'bg-brand-500/20 text-brand-100'
                            : 'text-slate-200 hover:bg-slate-800/90'
                        }`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => selectCard(card.id)}
                      >
                        <span className="block truncate font-semibold">{label}</span>
                        {card.title && card.title !== label ? (
                          <span className="mt-0.5 block truncate text-xs text-slate-500">{card.title}</span>
                        ) : null}
                      </button>
                    );
                  })}
                  {!filteredCards.length ? (
                    <div className="px-3 py-4 text-sm text-slate-500">
                      Nenhum card encontrado.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {loadingCards ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Carregando cards...</p> : null}
            {!attachToKanban ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">A imagem será gerada sem anexar ao Kanban.</p> : null}
            {cardsError ? <p className="mt-2 text-xs text-rose-500 dark:text-rose-300">{cardsError}</p> : null}
          </div>

          <div className="input-group">
            <label>Tipo</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="formType" value="quitado" checked={form.formType === 'quitado'} onChange={handleChange} className="accent-brand-500" />
                Quitado
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="formType" value="financiado" checked={form.formType === 'financiado'} onChange={handleChange} className="accent-brand-500" />
                Financiado
              </label>
            </div>
          </div>

          <div className="input-group">
            <label>Seguradora</label>
            <select name="seguradora" value={form.seguradora} onChange={handleChange} className="input-control">
              {insurerOptions.map((insurer) => (
                <option key={insurer} value={insurer}>
                  {insurer}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Idioma</label>
            <select name="idioma" value={form.idioma} onChange={handleChange} className="input-control">
              {languageOptions.map((language) => (
                <option key={language.value} value={language.value}>
                  {language.label}
                </option>
              ))}
            </select>
          </div>

          <div className="input-group">
            <label>Taxa de Cotação</label>
            <div className="flex gap-4 items-center flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="taxaType" value="320" checked={form.taxaType === '320'} onChange={handleTaxChange} className="accent-brand-500" />
                $320
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="taxaType" value="400" checked={form.taxaType === '400'} onChange={handleTaxChange} className="accent-brand-500" />
                $400
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="taxaType" value="500" checked={form.taxaType === '500'} onChange={handleTaxChange} className="accent-brand-500" />
                $500
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="taxaType" value="custom" checked={form.taxaType === 'custom'} onChange={handleTaxChange} className="accent-brand-500" />
                Outro
              </label>
              {form.taxaType === 'custom' ? (
                <input type="number" value={form.taxaCotacao} onChange={handleCustomTaxChange} className="input-control w-24 py-1 px-2" placeholder="Valor" />
              ) : null}
            </div>
          </div>

          {attachToKanban ? (
            <div className="input-group">
              <label>Pessoa do Card</label>
              <select
                value={selectedPersonKey}
                onChange={handlePersonChange}
                className="input-control"
                disabled={!selectedCardId}
              >
                {peopleOptions.map((person) => (
                  <option key={person.key} value={person.key}>
                    {person.label}
                  </option>
                ))}
                <option value={OTHER_PERSON_KEY}>Outro</option>
              </select>
            </div>
          ) : null}

          {customNameMode ? (
            <div className="input-group">
              <label>Nome do Cliente</label>
              <input
                name="nome"
                value={form.nome}
                onChange={handleChange}
                className="input-control"
                placeholder="Digite o nome desejado"
                required
              />
            </div>
          ) : null}
        </div>
      </div>

      {form.formType === 'quitado' ? (
        <div className="rta-section">
          <div className="rta-section-header">
            <span className="rta-section-icon">📊</span>
            <div>
              <h2 className="rta-section-title">Plano Básico</h2>
            </div>
          </div>
          <div className="rta-grid rta-grid-auto gap-4">
            <div className="input-group"><label>Entrada</label><input name="entrada_basico" value={form.entrada_basico} onChange={handleChange} className="input-control" /></div>
            <div className="input-group"><label>Mensal</label><input name="mensal_basico" value={form.mensal_basico} onChange={handleChange} className="input-control" /></div>
            <div className="input-group"><label>Total</label><input name="valor_total_basico" value={form.valor_total_basico} onChange={handleChange} className="input-control" /></div>
          </div>
        </div>
      ) : null}

      <div className="rta-section">
        <div className="rta-section-header">
          <span className="rta-section-icon">📈</span>
          <div>
            <h2 className="rta-section-title">Plano Completo</h2>
          </div>
        </div>
        <div className="rta-grid rta-grid-auto gap-4">
          <div className="input-group"><label>Entrada</label><input name="entrada_completo" value={form.entrada_completo} onChange={handleChange} className="input-control" /></div>
          <div className="input-group"><label>Mensal</label><input name="mensal_completo" value={form.mensal_completo} onChange={handleChange} className="input-control" /></div>
          <div className="input-group"><label>Total</label><input name="valor_total_completo" value={form.valor_total_completo} onChange={handleChange} className="input-control" /></div>
        </div>
      </div>

      <div className="flex gap-4 mt-6 items-center flex-wrap">
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Gerando…' : 'Gerar Imagem'}</button>
        {result ? (
          <div className="flex items-center gap-4">
            <div className="text-emerald-400 font-semibold text-sm">{result}</div>
            <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={openFile}>Abrir</button>
            <button type="button" className="btn-secondary text-xs px-2 py-1" onClick={showInFolder}>Pasta</button>
          </div>
        ) : null}
        {error ? <div className="text-rose-400 font-semibold text-sm">{error}</div> : null}
      </div>
    </form>
  );
};
