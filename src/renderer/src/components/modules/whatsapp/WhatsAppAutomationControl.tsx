import React, { useEffect, useRef, useState } from 'react';
import { MessageManager } from './MessageManager';

interface LogEntry {
  timestamp: string;
  message: string;
}

export interface WhatsAppAutomationControlProps {
  profileId: string | null;
  profileName: string | null;
  isAdmin: boolean;
}

export const WhatsAppAutomationControl: React.FC<WhatsAppAutomationControlProps> = ({ profileId, profileName, isAdmin }) => {
  const [automationRunning, setAutomationRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [status, setStatus] = useState('Aguardando');
  const [startLoading, setStartLoading] = useState(false);
  const [stopLoading, setStopLoading] = useState(false);
  const [sendLimit, setSendLimit] = useState<number>(200);
  const [limitLoading, setLimitLoading] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen to logs from preload
    if (!window.automation?.onLog) return;
    const handler = (payload: any) => {
      const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
      setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message: msg }]);
    };
    window.automation.onLog(handler);
    return () => {
      // No off method in legacy, so nothing to clean up
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom on new log
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (profileId) {
        loadSettings(profileId);
    }
  }, [profileId]);

  const loadSettings = async (id: string) => {
      try {
          // @ts-ignore
          const settings = await window.profile?.getSettings(id);
          if (settings?.send_limit) {
              setSendLimit(settings.send_limit);
          }
      } catch (e) {
          console.error('Erro ao carregar settings', e);
      }
  };

  const handleSaveLimit = async () => {
      if (!profileId) return;
      setLimitLoading(true);
      try {
          // @ts-ignore
          await window.profile?.updateSendLimit(profileId, sendLimit);
          setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message: `Configuração salva: ${sendLimit} grupos` }]);
      } catch (e: any) {
          setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message: `Erro ao salvar configuração: ${e.message}` }]);
      } finally {
          setLimitLoading(false);
      }
  };

  const handleStart = async () => {
    if (!profileId || !isAdmin || !window.automation) return;
    setStartLoading(true);
    setStatus('Iniciando automação…');
    try {
      const response = await window.automation.start(profileId);
      setStatus('Automação em execução.');
      setAutomationRunning(true);
      setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message: response?.message || 'Automação iniciada.' }]);
    } catch (e: any) {
      setStatus('Erro ao iniciar automação. Veja os logs.');
      setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message: e?.message || 'Erro ao iniciar automação.' }]);
    } finally {
      setStartLoading(false);
    }
  };

  const handleStop = async () => {
    if (!window.automation) return;
    setStopLoading(true);
    setStatus('Encerrando automação…');
    try {
      const response = await window.automation.stop();
      setStatus('Automação parada.');
      setAutomationRunning(false);
      setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message: response?.message || 'Automação interrompida.' }]);
    } catch (e: any) {
      setStatus('Erro ao parar automação. Veja os logs.');
      setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message: e?.message || 'Erro ao parar automação.' }]);
    } finally {
      setStopLoading(false);
    }
  };

  return (
    <section className="card p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Operador selecionado</p>
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">{profileName || '—'}</h2>
        </div>
        <div className="flex items-center gap-4">
          <button
            className="btn-primary"
            onClick={handleStart}
            disabled={!profileId || !isAdmin || automationRunning || startLoading}
          >
            {startLoading ? 'Iniciando…' : 'Iniciar envios'}
          </button>
          <button
            className="btn-secondary"
            onClick={handleStop}
            disabled={!automationRunning || stopLoading}
          >
            {stopLoading ? 'Parando…' : 'Parar envios'}
          </button>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
        <article className="card space-y-4">
          <header className="space-y-1">
            <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Status</p>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">{status}</h3>
          </header>
          
          {/* Send Limit Configuration */}
          <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">Limite de Envios (Grupos)</label>
              <div className="flex gap-2">
                  <input 
                    type="number" 
                    value={sendLimit} 
                    onChange={(e) => setSendLimit(Number(e.target.value))} 
                    className="input-control py-1 px-2 text-sm"
                    min="1"
                    max="1000"
                  />
                  <button 
                    onClick={handleSaveLimit} 
                    disabled={limitLoading || !profileId}
                    className="btn-secondary text-xs px-3"
                  >
                      {limitLoading ? '...' : 'Salvar'}
                  </button>
              </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Logs recentes</h4>
            <div ref={logRef} className="max-h-72 overflow-y-auto rounded-xl bg-slate-50 dark:bg-slate-950/60 p-4 text-xs text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-transparent">
              {logs.length === 0 && <div className="text-slate-400 dark:text-slate-500">Nenhum log ainda.</div>}
              {logs.map((log, idx) => (
                <div key={idx} className="border-b border-slate-200 dark:border-white/5 pb-2 last:border-none last:pb-0">
                  [{log.timestamp}] {log.message}
                </div>
              ))}
            </div>
          </div>
        </article>
        <section className="card space-y-4">
          <header>
            <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Mensagens salvas</p>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">Gerenciar mensagens</h3>
          </header>
          <MessageManager profileId={profileId} />
        </section>
      </div>
    </section>
  );
};
