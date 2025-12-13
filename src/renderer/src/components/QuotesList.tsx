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
  const [stopLoading, setStopLoading] = useState(false);
  const [selectedInsurer, setSelectedInsurer] = useState<string>('progressive');

  const fetchQuotes = async () => {
    setLoading(true);
    setError(null);
    try {
      // @ts-ignore - call IPC through preload
      const res = await window.price?.listQuotes();
      // IPC handler returns { success: true, quotes: [...] } in main
      const list = Array.isArray(res) ? res : (res && Array.isArray(res.quotes) ? res.quotes : []);
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
    if (!window.price?.deleteQuote) return;
    setLoading(true);
    setError(null);
    try {
      // @ts-ignore
      await window.price.deleteQuote(id);
      await fetchQuotes();
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
      // @ts-ignore
      if (!window.quotes?.runAutomation) throw new Error('API de automação não disponível');
      // @ts-ignore
      const insurer = String(selectedInsurer || 'progressive').toLowerCase();
      const res = await window.quotes.runAutomation({ quoteId: id, insurer, headless: false });
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

  const handleStopAutomation = async () => {
    setStopLoading(true);
    setRunError(null);
    try {
      // @ts-ignore
      if (!window.automation?.stop) throw new Error('API de automação não disponível');
      // @ts-ignore
      const res = await window.automation.stop();
      console.log('stopAutomation result:', res);
    } catch (e: any) {
      const msg = e?.message || 'Erro ao parar automação.';
      setRunError(msg);
      setError(msg);
    } finally {
      setStopLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Cotações Salvas</h2>
        <button className="btn-secondary" onClick={fetchQuotes} disabled={loading}>Atualizar</button>
      </div>
      {loading && <div className="text-slate-400">Carregando…</div>}
      {error && <div className="text-rose-400">{error}</div>}
      {!loading && !error && quotes.length === 0 && (
        <div className="text-slate-400">Nenhuma cotação salva.</div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quotes.map((q) => (
          <div
            key={q.id}
            className={`card p-4 cursor-pointer ${selected?.id === q.id ? 'ring-2 ring-blue-500' : 'hover:bg-slate-800'}`}
            onClick={() => setSelected(q)}
          >
            <div className="font-semibold text-slate-200">{q.nome}</div>
            {q.seguradora ? <div className="text-slate-400 text-sm">{q.seguradora}</div> : null}
            {q.valor ? <div className="text-slate-300 text-xs">{q.valor}</div> : null}
            {q.data ? <div className="text-slate-500 text-xs mt-1">{q.data}</div> : null}
          </div>
        ))}
      </div>
      {selected && (
        <div className="card p-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-lg text-white">{selected.nome}</div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:block text-slate-300 text-xs pr-2">{selectedInsurer ? (selectedInsurer.charAt(0).toUpperCase() + selectedInsurer.slice(1)) : ''}</div>
              <select className="input-control text-xs" value={selectedInsurer} onChange={(e) => setSelectedInsurer(e.target.value)} style={{height: '28px', minWidth: '120px'}}>
                <option value="progressive">Progressive</option>
                <option value="liberty">Liberty</option>
              </select>
              <button className="btn-primary text-xs" onClick={() => handleRunAutomation(selected.id)} disabled={loading || runLoading || stopLoading}>{runLoading ? 'Abrindo…' : 'Iniciar cotação'}</button>
              <button className="btn-warning text-xs" onClick={handleStopAutomation} disabled={!runLoading || stopLoading}>{stopLoading ? 'Parando…' : 'Parar cotação'}</button>
              <button className="btn-danger text-xs" onClick={() => handleDelete(selected.id)} disabled={loading || runLoading || stopLoading}>Excluir</button>
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
