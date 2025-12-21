import React, { useEffect, useState } from 'react';

interface Quote {
  id: string;
  nome: string;
  seguradora: string;
  valor: string;
  data: string;
}

export const QuotesList: React.FC = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Quote | null>(null);
  const [runLoading, setRunLoading] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [selectedInsurer, setSelectedInsurer] = useState<string>('progressive');

  const fetchQuotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await window.price?.listQuotes();
      const list = Array.isArray(res)
        ? res
        : res && typeof res === 'object' && 'success' in res
          ? (res.success && Array.isArray((res as any).quotes) ? (res as any).quotes : [])
          : (res && Array.isArray((res as any).quotes) ? (res as any).quotes : []);
      // Map the raw response to the interface expected by the view
      const mapped = list.map((item: any) => {
        const payload = item.payload || {};
        const campos = payload.campos || payload.fields || payload.data || {};

        const seguradora = (payload.seguradora || payload.insurance_company || payload.insurer || campos.seguradora || campos.insurance_company || campos.insurer || '').trim();

        const valor = (campos.valor_total_completo || campos.valor_total_basico || payload.valor_total_completo || payload.valor_total_basico || payload.processed?.valor_total_completo || payload.processed?.valor_total_basico || '').trim();

        return {
          id: item.id,
          nome: item.nome || payload.nome || 'Sem Nome',
          seguradora: seguradora || '',
          valor: valor || '',
          data: item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''
        };
      });
      setQuotes(mapped);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar cotações.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.price?.deleteQuote) {
      setError('API de exclusão não disponível.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await window.price.deleteQuote(id);
      const success = res && typeof res === 'object' && 'success' in res ? Boolean((res as any).success) : true;
      const deleted = res && typeof res === 'object' && 'deleted' in res ? Boolean((res as any).deleted) : success;

      if (!success || !deleted) {
        throw new Error((res as any)?.error || 'Erro ao excluir cotação.');
      }

      setQuotes((prev) => prev.filter((quote) => quote.id !== id));
      setSelected(null);
    } catch (e: any) {
      setError(e?.message || 'Erro ao excluir cotação.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunAutomation = async (id: string) => {
    setRunLoading(true);
    setRunError(null);
    try {
      if (!window.quotes?.runAutomation) throw new Error('API de automação não disponível');
      const insurer = String(selectedInsurer || 'progressive').toLowerCase();
      const res = await window.quotes.runAutomation({ quoteId: id, insurer, headless: false });
      if (res && typeof res === 'object' && 'success' in res && !res.success) {
        throw new Error((res as any).error || 'Erro ao iniciar automação.');
      }
      // Log the result for debugging and surface any errors via the common `error` banner
      console.log('runAutomation result:', res);
    } catch (e: any) {
      const msg = e?.message || 'Erro ao iniciar automação.';
      setRunError(msg);
      setError(msg);
    } finally {
      setRunLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Cotações Salvas</h2>
        <button className="btn-secondary" onClick={fetchQuotes} disabled={loading}>Atualizar</button>
      </div>
      {loading && <div className="text-slate-500 dark:text-slate-400">Carregando…</div>}
      {error && <div className="text-rose-500 dark:text-rose-400">{error}</div>}
      {!loading && !error && quotes.length === 0 && (
        <div className="text-slate-500 dark:text-slate-400">Nenhuma cotação salva.</div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quotes.map((q) => (
          <div
            key={q.id}
            className={`card p-4 cursor-pointer transition-all ${selected?.id === q.id ? 'ring-2 ring-brand-500 border-brand-500' : 'hover:border-brand-300 dark:hover:border-brand-700 hover:shadow-md'}`}
            onClick={() => setSelected(q)}
          >
            <div className="font-semibold text-slate-800 dark:text-slate-200">{q.nome}</div>
            {q.seguradora ? <div className="text-slate-500 dark:text-slate-400 text-sm">{q.seguradora}</div> : null}
            {q.valor ? <div className="text-slate-600 dark:text-slate-300 text-xs">{q.valor}</div> : null}
            {q.data ? <div className="text-slate-400 dark:text-slate-500 text-xs mt-1">{q.data}</div> : null}
          </div>
        ))}
      </div>
      {selected && (
        <div className="card p-5 mt-4 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="font-bold text-lg text-slate-800 dark:text-white">{selected.nome}</div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex flex-col gap-1">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Seguradora</span>
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-sm">
                  <select
                    className="bg-transparent w-full outline-none text-sm text-slate-800 dark:text-slate-100"
                    value={selectedInsurer}
                    onChange={(e) => setSelectedInsurer(e.target.value)}
                  >
                    <option value="progressive">Progressive</option>
                    <option value="liberty">Liberty</option>
                  </select>
                </div>
              </div>
              <button className="btn-primary text-sm px-4 py-2" onClick={() => handleRunAutomation(selected.id)} disabled={loading || runLoading}>{runLoading ? 'Abrindo…' : 'Iniciar cotação'}</button>
              <button className="btn-danger text-sm px-4 py-2" onClick={() => handleDelete(selected.id)} disabled={loading || runLoading}>Excluir</button>
            </div>
          </div>
          {selected.seguradora ? <div className="text-slate-400 text-sm mb-1">Seguradora: {selected.seguradora}</div> : null}
          {selected.valor ? <div className="text-slate-400 text-sm mb-1">Valor: {selected.valor}</div> : null}
          {selected.data ? <div className="text-slate-400 text-sm mb-1">Data: {selected.data}</div> : null}
          {/* Inline run result removed — errors are shown via the main error banner */}
        </div>
      )}
    </div>
  );
};
