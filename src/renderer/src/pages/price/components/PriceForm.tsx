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

export const PriceForm: React.FC = () => {
  const [form, setForm] = useState<PriceFormData>(initialForm);
  const [cards, setCards] = useState<KanbanCard[]>([]);
  const [selectedCardId, setSelectedCardId] = useState('');
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

  const handleCardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCardId = e.target.value;
    setSelectedCardId(nextCardId);
    setSelectedPersonKey(OTHER_PERSON_KEY);
    setForm((prev) => ({ ...prev, nome: '' }));
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

    if (!selectedCardId) {
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
          await attachImageToKanbanCard(selectedCardId, generatedPath);
          setResult(`Imagem gerada e anexada ao card: ${generatedPath}`);
        } else {
          setResult('Imagem gerada, mas sem caminho de arquivo retornado para anexar no card.');
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
            <p className="rta-section-description">Selecione o card e a pessoa para gerar e anexar a imagem no Kanban.</p>
          </div>
        </div>

        <div className="rta-grid rta-grid-auto gap-4">
          <div className="input-group">
            <label>Card do Kanban</label>
            <select value={selectedCardId} onChange={handleCardChange} className="input-control" disabled={loadingCards}>
              <option value="">Selecione um card</option>
              {cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {readString(card.payload?.nome, card.title, card.id)}
                </option>
              ))}
            </select>
            {loadingCards ? <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Carregando cards...</p> : null}
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
            <div className="flex gap-4 flex-wrap">
              {['Allstate', 'Progressive', 'Geico', 'Direct', 'StateFarm', 'Liberty'].map((ins) => (
                <label key={ins} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="seguradora" value={ins} checked={form.seguradora === ins} onChange={handleChange} className="accent-brand-500" />
                  {ins}
                </label>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label>Idioma</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="idioma" value="pt" checked={form.idioma === 'pt'} onChange={handleChange} className="accent-brand-500" />
                Português
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="idioma" value="en" checked={form.idioma === 'en'} onChange={handleChange} className="accent-brand-500" />
                Inglês
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="idioma" value="es" checked={form.idioma === 'es'} onChange={handleChange} className="accent-brand-500" />
                Espanhol
              </label>
            </div>
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
