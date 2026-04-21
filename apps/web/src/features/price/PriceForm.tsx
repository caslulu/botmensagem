import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { api, downloadFile } from '../../api/client';
import { Field, FormSection, SelectInput, TextInput } from '../../components/Field';
import type { QuoteOption } from '../../types';

type PriceFormData = {
  formType: 'quitado' | 'financiado';
  seguradora: string;
  idioma: 'pt' | 'en' | 'es';
  taxaCotacao: number;
  nome: string;
  entrada_basico: string;
  mensal_basico: string;
  valor_total_basico: string;
  entrada_completo: string;
  mensal_completo: string;
  valor_total_completo: string;
};

const initialForm: PriceFormData = {
  formType: 'quitado',
  seguradora: 'Allstate',
  idioma: 'pt',
  taxaCotacao: 320,
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
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
}

function payloadFields(payload: Record<string, any>): Record<string, any> {
  const candidates = [payload.campos, payload.fields, payload.data, payload.processed];
  return candidates.find((item) => item && typeof item === 'object') || {};
}

export function PriceForm() {
  const [form, setForm] = useState<PriceFormData>(initialForm);
  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadQuotes = async () => {
    const response = await api.get<{ quotes: QuoteOption[] }>('/quotes');
    setQuotes(response.quotes);
  };

  useEffect(() => {
    void loadQuotes().catch(() => setQuotes([]));
  }, []);

  const update = <K extends keyof PriceFormData>(name: K, value: PriceFormData[K]) => setForm((prev) => ({ ...prev, [name]: value }));

  const selectQuote = (id: string) => {
    setSelectedId(id);
    const quote = quotes.find((item) => item.id === id);
    if (!quote) return;

    const latestPayload = quote.latestPrice?.payload || {};
    const source = Object.keys(latestPayload).length ? latestPayload : quote.payload || {};
    const fields = payloadFields(source);
    setForm((prev) => ({
      ...prev,
      nome: readString(fields.nome, source.nome, quote.title, prev.nome),
      formType: readString(source.formType, fields.formType) === 'financiado' ? 'financiado' : prev.formType,
      seguradora: readString(source.seguradora, fields.seguradora, prev.seguradora),
      idioma: (readString(source.idioma, fields.idioma, prev.idioma).toLowerCase() || 'pt') as PriceFormData['idioma'],
      taxaCotacao: Number(readString(source.taxaCotacao, fields.taxaCotacao, prev.taxaCotacao)) || prev.taxaCotacao,
      entrada_basico: readString(fields.entrada_basico, source.entrada_basico, prev.entrada_basico),
      mensal_basico: readString(fields.mensal_basico, source.mensal_basico, prev.mensal_basico),
      valor_total_basico: readString(fields.valor_total_basico, source.valor_total_basico, prev.valor_total_basico),
      entrada_completo: readString(fields.entrada_completo, source.entrada_completo, prev.entrada_completo),
      mensal_completo: readString(fields.mensal_completo, source.mensal_completo, prev.mensal_completo),
      valor_total_completo: readString(fields.valor_total_completo, source.valor_total_completo, prev.valor_total_completo)
    }));
  };

  const validate = () => {
    const required = form.formType === 'quitado'
      ? ['nome', 'entrada_basico', 'mensal_basico', 'valor_total_basico', 'entrada_completo', 'mensal_completo', 'valor_total_completo']
      : ['nome', 'entrada_completo', 'mensal_completo', 'valor_total_completo'];
    return required.every((field) => readString(form[field as keyof PriceFormData]));
  };

  const selectedQuote = quotes.find((quote) => quote.id === selectedId);

  const saveQuote = async () => {
    setLoading(true);
    setError('');
    try {
      await api.post('/quotes', {
        cardId: selectedQuote?.cardId || null,
        payload: {
          formType: form.formType,
          seguradora: form.seguradora,
          idioma: form.idioma,
          taxaCotacao: form.taxaCotacao,
          campos: { ...form }
        }
      });
      await loadQuotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar cotacao.');
    } finally {
      setLoading(false);
    }
  };

  const generate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      setError('Preencha todos os campos obrigatorios.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.post<{ downloadUrl: string; filename: string; processed: Record<string, any> }>('/price/generate', {
        formType: form.formType,
        seguradora: form.seguradora,
        idioma: form.idioma,
        taxaCotacao: form.taxaCotacao,
        cardId: selectedQuote?.cardId || null,
        campos: { ...form }
      });
      downloadFile(response.downloadUrl, response.filename);
      await loadQuotes();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar imagem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="tool-form" onSubmit={generate}>
      <section className="command-band">
        <div>
          <p className="eyebrow">Arte comercial</p>
          <h2>Gerar imagem de preco</h2>
          <p>Selecione um card do Kanban ou preencha manualmente; a imagem final fica disponivel por download.</p>
        </div>
        <div className="command-row">
          <button className="secondary-button" type="button" onClick={saveQuote} disabled={loading}><Save size={16} /> Salvar</button>
          <button className="primary-button" type="submit" disabled={loading}>{loading ? 'Gerando...' : 'Gerar imagem'}</button>
        </div>
      </section>

      <FormSection title="Cotacao">
        <Field label="Card do Kanban" wide>
          <SelectInput value={selectedId} onChange={(event) => selectQuote(event.target.value)}>
            <option value="">Manual</option>
            {quotes.map((quote) => <option key={quote.id} value={quote.id}>{quote.label}</option>)}
          </SelectInput>
        </Field>
        <Field label="Tipo">
          <SelectInput value={form.formType} onChange={(event) => update('formType', event.target.value as PriceFormData['formType'])}>
            <option value="quitado">Quitado</option>
            <option value="financiado">Financiado</option>
          </SelectInput>
        </Field>
        <Field label="Seguradora">
          <SelectInput value={form.seguradora} onChange={(event) => update('seguradora', event.target.value)}>
            {['Allstate', 'Progressive', 'Geico', 'Direct', 'StateFarm', 'Liberty'].map((item) => <option key={item}>{item}</option>)}
          </SelectInput>
        </Field>
        <Field label="Idioma">
          <SelectInput value={form.idioma} onChange={(event) => update('idioma', event.target.value as PriceFormData['idioma'])}>
            <option value="pt">Portugues</option>
            <option value="en">Ingles</option>
            <option value="es">Espanhol</option>
          </SelectInput>
        </Field>
        <Field label="Taxa"><TextInput type="number" value={form.taxaCotacao} onChange={(event) => update('taxaCotacao', Number(event.target.value))} /></Field>
        <Field label="Nome do cliente"><TextInput value={form.nome} onChange={(event) => update('nome', event.target.value)} required /></Field>
      </FormSection>

      {form.formType === 'quitado' ? (
        <FormSection title="Plano basico">
          <Field label="Entrada"><TextInput value={form.entrada_basico} onChange={(event) => update('entrada_basico', event.target.value)} /></Field>
          <Field label="Mensal"><TextInput value={form.mensal_basico} onChange={(event) => update('mensal_basico', event.target.value)} /></Field>
          <Field label="Total"><TextInput value={form.valor_total_basico} onChange={(event) => update('valor_total_basico', event.target.value)} /></Field>
        </FormSection>
      ) : null}

      <FormSection title="Plano completo">
        <Field label="Entrada"><TextInput value={form.entrada_completo} onChange={(event) => update('entrada_completo', event.target.value)} /></Field>
        <Field label="Mensal"><TextInput value={form.mensal_completo} onChange={(event) => update('mensal_completo', event.target.value)} /></Field>
        <Field label="Total"><TextInput value={form.valor_total_completo} onChange={(event) => update('valor_total_completo', event.target.value)} /></Field>
      </FormSection>

      <div className="result-line">
        {error ? <span className="form-error">{error}</span> : null}
      </div>
    </form>
  );
}
