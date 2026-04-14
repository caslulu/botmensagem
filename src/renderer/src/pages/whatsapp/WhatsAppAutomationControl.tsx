import React, { useEffect, useRef, useState } from 'react';
import { MessageManager } from './components/MessageManager';

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
    if (!window.automation?.onLog) return;
    const handler = (payload: any) => {
      const msg = typeof payload === 'string' ? payload : JSON.stringify(payload);
      setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message: msg }]);
    };
    window.automation.onLog(handler);
    return () => {
      // API atual não expõe unsubscribe.
    };
  }, []);

  useEffect(() => {
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
      const settings = await window.profile?.getSettings(id);
      if (settings?.send_limit) {
        setSendLimit(settings.send_limit);
      }
    } catch (error) {
      console.error('Erro ao carregar settings', error);
    }
  };

  const handleSaveLimit = async () => {
    if (!profileId) return;
    setLimitLoading(true);
    try {
      await window.profile?.updateSendLimit(profileId, sendLimit);
      setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message: `Configuração salva: ${sendLimit} grupos` }]);
    } catch (error: any) {
      setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message: `Erro ao salvar configuração: ${error.message}` }]);
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
      setStatus('Automação em execução');
      setAutomationRunning(true);
      setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message: response?.message || 'Automação iniciada.' }]);
    } catch (error: any) {
      setStatus('Erro ao iniciar automação');
      setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message: error?.message || 'Erro ao iniciar automação.' }]);
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
      setStatus('Automação parada');
      setAutomationRunning(false);
      setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message: response?.message || 'Automação interrompida.' }]);
    } catch (error: any) {
      setStatus('Erro ao parar automação');
      setLogs((prev) => [...prev, { timestamp: new Date().toLocaleTimeString('pt-BR', { hour12: false }), message: error?.message || 'Erro ao parar automação.' }]);
    } finally {
      setStopLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="page-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-300">
              WhatsApp automático
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
              Controle os envios do operador ativo
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
              Ajuste o limite, acompanhe logs em tempo real e mantenha uma única mensagem ativa por perfil.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="mini-stat">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Operador</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{profileName || 'Nenhum perfil'}</p>
            </div>
            <div className="mini-stat">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Status</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{status}</p>
            </div>
            <div className="mini-stat">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Permissão</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">{isAdmin ? 'Administrador' : 'Bloqueado para operador'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,350px)_minmax(0,1fr)]">
        <article className="card p-5 sm:p-6">
          <div className="space-y-5">
            <header className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Controle da automação</p>
              <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">{status}</h3>
              <p className="text-sm leading-6 text-slate-500 dark:text-slate-400">
                Inicie ou interrompa o fluxo manualmente e ajuste o alcance máximo antes de disparar.
              </p>
            </header>

            <div className="surface-subtle">
              <label className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Limite de envios (grupos)</label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="number"
                  value={sendLimit}
                  onChange={(event) => setSendLimit(Number(event.target.value))}
                  className="input-control"
                  min="1"
                  max="1000"
                />
                <button
                  onClick={handleSaveLimit}
                  disabled={limitLoading || !profileId}
                  className="btn-secondary whitespace-nowrap"
                  type="button"
                >
                  {limitLoading ? 'Salvando…' : 'Salvar limite'}
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                className="btn-primary"
                onClick={handleStart}
                disabled={!profileId || !isAdmin || automationRunning || startLoading}
                type="button"
              >
                {startLoading ? 'Iniciando…' : 'Iniciar envios'}
              </button>
              <button
                className="btn-secondary"
                onClick={handleStop}
                disabled={!automationRunning || stopLoading}
                type="button"
              >
                {stopLoading ? 'Parando…' : 'Parar envios'}
              </button>
            </div>

            <div className="surface-subtle">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Regras importantes</p>
              <ul className="mt-3 space-y-3 text-sm text-slate-500 dark:text-slate-400">
                <li>Somente administradores podem iniciar a automação.</li>
                <li>O limite de grupos fica salvo por operador.</li>
                <li>Os logs ajudam a entender falhas e confirmar execução.</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Logs recentes</h4>
              <div ref={logRef} className="custom-scrollbar max-h-80 overflow-y-auto rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 text-xs leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
                {logs.length === 0 ? <div className="text-slate-400 dark:text-slate-500">Nenhum log ainda.</div> : null}
                {logs.map((log, idx) => (
                  <div key={idx} className="border-b border-slate-200/80 pb-2 last:border-none last:pb-0 dark:border-white/5">
                    [{log.timestamp}] {log.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </article>

        <section className="card p-5 sm:p-6">
          <header className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Biblioteca do operador</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">Mensagens salvas</h3>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Escolha a mensagem ativa, crie novas variações e mantenha o repertório organizado por perfil.
            </p>
          </header>
          <MessageManager profileId={profileId} />
        </section>
      </section>
    </div>
  );
};
