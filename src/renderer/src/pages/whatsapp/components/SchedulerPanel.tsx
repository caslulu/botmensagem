import React, { useEffect, useRef, useState } from 'react';

interface SchedulerPanelProps {
  isAdmin: boolean;
}

interface StatusData {
  times: string[];
  instance: string;
  instance_state: string;
  image_exists: boolean;
  caption_length: number;
  log_tail: string;
  updated_at: string;
}

const TIME_REGEX = /^([01]?\d|2[0-3]):([0-5]\d)$/;

function sortTimes(times: string[]): string[] {
  return [...times].sort((a, b) => {
    const [ah, am] = a.split(':').map(Number);
    const [bh, bm] = b.split(':').map(Number);
    return ah * 60 + am - (bh * 60 + bm);
  });
}

export const SchedulerPanel: React.FC<SchedulerPanelProps> = ({ isAdmin }) => {
  const [times, setTimes] = useState<string[]>([]);
  const [newTime, setNewTime] = useState('');
  const [caption, setCaption] = useState('');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [status, setStatus] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState<'times' | 'caption' | 'image' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [dirtyCaption, setDirtyCaption] = useState(false);
  const [dirtyTimes, setDirtyTimes] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const flashSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3500);
  };

  const loadAll = async () => {
    setError(null);
    try {
      const healthRes = await window.schedulerApi?.health();
      const ok = healthRes?.success && healthRes.ok;
      setConnected(Boolean(ok));
      if (!ok) {
        setError('Não foi possível conectar à VPS do scheduler. Verifique a configuração.');
        return;
      }
      const [statusRes, configRes, captionRes, imageRes] = await Promise.all([
        window.schedulerApi?.getStatus(),
        window.schedulerApi?.getConfig(),
        window.schedulerApi?.getCaption(),
        window.schedulerApi?.getImage()
      ]);
      if (statusRes?.success && statusRes.status) {
        setStatus(statusRes.status);
      }
      if (configRes?.success && configRes.config?.times) {
        setTimes(sortTimes(configRes.config.times));
      }
      if (captionRes?.success && captionRes.caption) {
        setCaption(captionRes.caption.text || '');
      }
      if (imageRes?.success && imageRes.image) {
        setImageDataUrl(`data:${imageRes.image.mimetype};base64,${imageRes.image.base64}`);
        setImageMime(imageRes.image.mimetype);
      } else {
        setImageDataUrl(null);
      }
      setDirtyCaption(false);
      setDirtyTimes(false);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar configuração do scheduler.');
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addTime = () => {
    const t = newTime.trim();
    if (!TIME_REGEX.test(t)) {
      setError('Horário inválido. Use o formato HH:MM (24h), ex: 06:30.');
      return;
    }
    const norm = `${t.padStart(5, '0')}`;
    if (times.includes(norm)) {
      setError('Esse horário já está na lista.');
      return;
    }
    setTimes(sortTimes([...times, norm]));
    setNewTime('');
    setDirtyTimes(true);
    setError(null);
  };

  const removeTime = (t: string) => {
    setTimes(times.filter((x) => x !== t));
    setDirtyTimes(true);
  };

  const handleSaveTimes = async () => {
    if (times.length === 0) {
      setError('Defina ao menos um horário de envio.');
      return;
    }
    setLoading('times');
    setError(null);
    try {
      const res = await window.schedulerApi?.saveConfig(times);
      if (!res?.success) throw new Error(res?.error || 'Erro ao salvar horários.');
      setDirtyTimes(false);
      flashSuccess('Horários salvos na VPS.');
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar horários.');
    } finally {
      setLoading(null);
    }
  };

  const handleSaveCaption = async () => {
    if (!caption.trim()) {
      setError('O texto da mensagem não pode estar vazio.');
      return;
    }
    setLoading('caption');
    setError(null);
    try {
      const res = await window.schedulerApi?.saveCaption(caption);
      if (!res?.success) throw new Error(res?.error || 'Erro ao salvar texto.');
      setDirtyCaption(false);
      flashSuccess('Texto da mensagem salvo na VPS.');
    } catch (e: any) {
      setError(e?.message || 'Erro ao salvar texto.');
    } finally {
      setLoading(null);
    }
  };

  const handleSelectImage = async () => {
    try {
      const result = await window.files?.selectImage();
      if (result?.success && result.path) {
        const dataUrlRes = await window.files?.readImageAsDataUrl(result.path);
        if (dataUrlRes?.success && dataUrlRes.dataUrl) {
          setImageDataUrl(dataUrlRes.dataUrl);
          const mime = dataUrlRes.dataUrl.match(/^data:([^;]+);/)?.[1] || 'image/jpeg';
          setImageMime(mime);
          await uploadImage(dataUrlRes.dataUrl, mime);
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao selecionar imagem.');
    }
  };

  const uploadImage = async (dataUrl: string, mime: string) => {
    setLoading('image');
    setError(null);
    try {
      const base64 = dataUrl.split(',')[1] || '';
      const res = await window.schedulerApi?.saveImage(base64, mime);
      if (!res?.success) throw new Error(res?.error || 'Erro ao enviar imagem.');
      flashSuccess('Imagem atualizada na VPS.');
      const statusRes = await window.schedulerApi?.getStatus();
      if (statusRes?.success && statusRes.status) setStatus(statusRes.status);
    } catch (e: any) {
      setError(e?.message || 'Erro ao enviar imagem.');
    } finally {
      setLoading(null);
    }
  };

  const handleSendNow = async () => {
    if (!window.confirm('Disparar o envio agora para todos os grupos?')) return;
    setLoading('send');
    setError(null);
    try {
      const res = await window.schedulerApi?.sendNow();
      if (!res?.success) throw new Error(res?.error || 'Erro ao disparar envio.');
      if (!res.result?.ok) throw new Error(res.result?.error || 'Falha no disparo.');
      flashSuccess('Envio disparado em segundo plano. Acompanhe o log abaixo.');
      setTimeout(loadAll, 3000);
    } catch (e: any) {
      setError(e?.message || 'Erro ao disparar envio.');
    } finally {
      setLoading(null);
    }
  };

  const instanceOk = status?.instance_state === 'open' || status?.instance_state === 'connected';

  return (
    <article className="card p-5 sm:p-6">
      <header className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">
          Agendamento automático
        </p>
        <h3 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">
          Envios programados
        </h3>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Configure os horários, o texto e a imagem que a VPS envia automaticamente. Não é preciso deixar o app aberto.
        </p>
      </header>

      {/* Status da conexão */}
      <div className="surface-subtle mb-5">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className={`inline-flex items-center gap-1.5 font-semibold ${connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
            <span className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-rose-500'}`} />
            {connected ? 'VPS conectada' : 'VPS offline'}
          </span>
          {status && (
            <>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-slate-500 dark:text-slate-400">
                Instância <strong className="text-slate-700 dark:text-slate-200">{status.instance}</strong>:{' '}
                <strong className={instanceOk ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {status.instance_state}
                </strong>
              </span>
              <span className="text-slate-300 dark:text-slate-600">|</span>
              <span className="text-slate-500 dark:text-slate-400">
                {status.image_exists ? 'Imagem configurada' : 'Sem imagem'}
              </span>
            </>
          )}
        </div>
      </div>

      {!isAdmin && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          Apenas administradores podem alterar o agendamento.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-3xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-3xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
          {success}
        </div>
      )}

      {/* Horários */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Horários de envio (Brasília)</h4>
          {dirtyTimes && <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">não salvo</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {times.map((t) => (
            <span key={t} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {t}
              {isAdmin && (
                <button type="button" onClick={() => removeTime(t)} className="text-slate-400 hover:text-rose-500" disabled={!isAdmin}>
                  ×
                </button>
              )}
            </span>
          ))}
          {times.length === 0 && <span className="text-sm text-slate-400">Nenhum horário definido.</span>}
        </div>
        {isAdmin && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="time"
              className="input-control sm:w-40"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTime())}
              disabled={!isAdmin}
            />
            <button type="button" className="btn-secondary text-xs" onClick={addTime} disabled={!isAdmin}>
              + Adicionar horário
            </button>
            <button type="button" className="btn-primary text-xs" onClick={handleSaveTimes} disabled={!isAdmin || loading === 'times' || !dirtyTimes}>
              {loading === 'times' ? 'Salvando…' : 'Salvar horários'}
            </button>
          </div>
        )}
      </div>

      <div className="my-6 h-px bg-slate-200/80 dark:bg-slate-800" />

      {/* Texto da mensagem */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Texto da mensagem</h4>
          {dirtyCaption && <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">não salvo</span>}
        </div>
        <textarea
          className="input-control"
          rows={6}
          value={caption}
          onChange={(e) => { setCaption(e.target.value); setDirtyCaption(true); }}
          disabled={!isAdmin}
          placeholder="Digite o texto que será enviado com a imagem…"
        />
        {isAdmin && (
          <button type="button" className="btn-primary text-xs" onClick={handleSaveCaption} disabled={!isAdmin || loading === 'caption' || !dirtyCaption}>
            {loading === 'caption' ? 'Salvando…' : 'Salvar texto'}
          </button>
        )}
      </div>

      <div className="my-6 h-px bg-slate-200/80 dark:bg-slate-800" />

      {/* Imagem */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Imagem do envio</h4>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-40 w-40 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800">
            {imageDataUrl ? (
              <img src={imageDataUrl} alt="Imagem do envio" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-slate-400">Sem imagem</span>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {isAdmin && (
              <>
                <button type="button" className="btn-secondary text-xs" onClick={handleSelectImage} disabled={!isAdmin || loading === 'image'}>
                  {loading === 'image' ? 'Enviando…' : '📁 Escolher imagem'}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
              </>
            )}
            <p className="text-xs text-slate-400 dark:text-slate-500">
              JPG, PNG, WEBP ou GIF. Máximo 8 MB. Substitui a imagem atual na VPS.
            </p>
          </div>
        </div>
      </div>

      <div className="my-6 h-px bg-slate-200/80 dark:bg-slate-800" />

      {/* Enviar agora + log */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Envio imediato</h4>
        <button type="button" className="btn-secondary text-xs" onClick={handleSendNow} disabled={!isAdmin || loading === 'send' || !instanceOk}>
          {loading === 'send' ? 'Disparando…' : 'Disparar envio agora'}
        </button>
        {status?.log_tail && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">Últimos envios</p>
            <div className="custom-scrollbar max-h-40 overflow-y-auto rounded-2xl border border-slate-200/80 bg-slate-50/90 p-3 text-xs leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
              {status.log_tail.split('\n').filter(Boolean).slice(-15).map((line, i) => (
                <div key={i} className="border-b border-slate-200/60 pb-1 last:border-none dark:border-white/5">{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
};