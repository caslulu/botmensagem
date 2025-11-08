import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { decodeVin } from '../utils/vin';
import { US_STATES, INTERNATIONAL_STATE } from '../utils/usStates';

const API_BASE_URL = import.meta.env.PROD ? '/api' : 'http://localhost:5000/api';

const veiculoSchema = z.object({
  vin: z.string().trim().min(5, 'VIN inválido'),
  placa: z.string().trim().optional().or(z.literal('')),
  ano: z.string().trim().optional().or(z.literal('')),
  marca: z.string().trim().optional().or(z.literal('')),
  modelo: z.string().trim().optional().or(z.literal('')),
  financiado: z.string().trim().optional().or(z.literal('')),
  tempo_com_veiculo: z.string().trim().optional().or(z.literal('')),
});

const pessoaSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome'),
  documento: z.string().trim().optional().or(z.literal('')),
  data_nascimento: z.string().trim().optional().or(z.literal('')),
  parentesco: z.string().trim().optional().or(z.literal('')),
  genero: z.enum(['Masculino', 'Feminino']).optional(),
});

const trelloSchema = z.object({
  nome: z.string().trim().min(2, 'Informe o nome completo'),
  estado_civil: z.enum(['Solteiro(a)', 'Casado(a)', 'Divorciado(a)']).default('Solteiro(a)'),
  genero: z.enum(['Masculino', 'Feminino']).default('Masculino'),
  documento: z.string().trim().optional().or(z.literal('')),
  documento_estado: z.string().trim().min(1, 'Selecione o estado da licença'),
  endereco_rua: z.string().trim().min(2, 'Informe a rua'),
  endereco_apt: z.string().trim().optional().or(z.literal('')),
  endereco_cidade: z.string().trim().min(2, 'Informe a cidade'),
  endereco_estado: z.string().trim().min(2, 'Selecione o estado'),
  endereco_zipcode: z.string().trim().min(3, 'Informe o ZIP'),
  data_nascimento: z.string().trim().optional().or(z.literal('')),
  tempo_de_seguro: z.string().trim().optional().or(z.literal('')),
  tempo_no_endereco: z.string().trim().optional().or(z.literal('')),
  nome_conjuge: z.string().trim().optional().or(z.literal('')),
  documento_conjuge: z.string().trim().optional().or(z.literal('')),
  data_nascimento_conjuge: z.string().trim().optional().or(z.literal('')),
  veiculos: z.array(veiculoSchema).min(1, 'Adicione ao menos um veículo'),
  pessoas: z.array(pessoaSchema).default([]),
  observacoes: z.string().trim().max(2000, 'Máximo de 2000 caracteres').optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  // Validar VINs únicos
  const vins = (data.veiculos || []).map(v => (v.vin || '').trim().toUpperCase());
  const seen = new Set<string>();
  vins.forEach((vin, index) => {
    if (!vin) return;
    if (seen.has(vin)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['veiculos', index, 'vin'],
        message: 'VIN duplicado com outro veículo'
      });
    }
    seen.add(vin);
  });
});

type TrelloFormData = z.infer<typeof trelloSchema>;

export const TrelloForm: React.FC = () => {
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting }, watch, setValue, setError, clearErrors } = useForm<TrelloFormData>({
    resolver: zodResolver(trelloSchema) as any,
    defaultValues: {
      nome: '',
      estado_civil: 'Solteiro(a)',
      genero: 'Masculino',
      documento: '',
      documento_estado: '',
      endereco_rua: '',
      endereco_apt: '',
      endereco_cidade: '',
      endereco_estado: '',
      endereco_zipcode: '',
      data_nascimento: '',
      tempo_de_seguro: '',
      tempo_no_endereco: '',
      nome_conjuge: '',
      documento_conjuge: '',
      data_nascimento_conjuge: '',
      veiculos: [{ vin: '', placa: '', ano: '', marca: '', modelo: '', financiado: '', tempo_com_veiculo: '' }],
      pessoas: [],
      observacoes: ''
    }
  });

  const { fields: veiculos, append: addVeiculo, remove: removeVeiculo } = useFieldArray({ control, name: 'veiculos' });
  const { fields: pessoas, append: addPessoa, remove: removePessoa } = useFieldArray({ control, name: 'pessoas' });

  const [result, setResult] = useState<string | null>(null);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  // Limpeza de ObjectURLs quando a lista muda ou no unmount
  useEffect(() => {
    return () => {
      previews.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [previews]);

  const setSelectedFiles = (files: File[]) => {
    // limpar previews antigos
    previews.forEach((u) => URL.revokeObjectURL(u));
    setImages(files);
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
  };

  const onSubmit = async (data: TrelloFormData) => {
    setResult(null);

    try {
      const hasImages = images && images.length > 0;
      let resp: Response;
      if (hasImages) {
        const form = new FormData();
        form.append('payload', JSON.stringify(data));
        images.forEach((f) => form.append('images', f, f.name));
        resp = await fetch(`${API_BASE_URL}/trello`, { method: 'POST', body: form });
      } else {
        resp = await fetch(`${API_BASE_URL}/trello`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Erro desconhecido' }));
        setResult(`Erro: ${err.error || resp.statusText}`);
      } else {
        const json = await resp.json().catch(() => null);
        if (json && json.card_id) {
          const attOk = (json.attachments || []).length || 0;
          const attErr = (json.attachment_errors || []).length || 0;
          const attMsg = hasImages ? ` (anexos OK: ${attOk}${attErr ? `, erros: ${attErr}` : ''})` : '';
          setResult(`Card criado com ID: ${json.card_id}${attMsg}`);
          reset();
          setImages([]);
        } else {
          setResult('Card criado com sucesso');
          reset();
          setImages([]);
        }
      }
    } catch (e: any) {
      setResult(`Erro de conexão: ${e.message || String(e)}`);
    } finally {
    }
  };

  // String auxiliar para exibir o rótulo do veículo decodificado
  const vehicleLabel = (i: number) => {
    const a = watch(`veiculos.${i}.ano` as const) as any;
    const mk = watch(`veiculos.${i}.marca` as const) as any;
    const md = watch(`veiculos.${i}.modelo` as const) as any;
    return `${a || ''} ${mk || ''} ${md || ''}`.trim();
  };

  // Handler para mudança do VIN: preenche marca/modelo/ano e valida duplicidade
  const handleVinChange = async (idx: number, raw: string) => {
    const value = (raw || '').toUpperCase();
    setValue(`veiculos.${idx}.vin` as const, value, { shouldValidate: true, shouldDirty: true });

    const list = watch('veiculos') || [];
    const hasDuplicate = list.some((v, i) => i !== idx && (v.vin || '').trim().toUpperCase() === value.trim());
    if (hasDuplicate) {
      setError(`veiculos.${idx}.vin` as any, { type: 'validate', message: 'VIN duplicado com outro veículo' });
    } else {
      clearErrors(`veiculos.${idx}.vin` as any);
    }

    if (value.length === 17) {
      const info = await decodeVin(value);
      if (info) {
        if (info.year) setValue(`veiculos.${idx}.ano` as const, String(info.year), { shouldDirty: true });
        if (info.make) setValue(`veiculos.${idx}.marca` as const, info.make, { shouldDirty: true });
        if (info.model) setValue(`veiculos.${idx}.modelo` as const, info.model, { shouldDirty: true });
      }
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-xl p-6">
      <header className="mb-6">
        <h2 className="text-2xl font-bold">Auto-Trello</h2>
        <p className="text-sm text-gray-600">Preencha os dados do cliente, veículos e drivers para criar o card</p>
      </header>

  <form onSubmit={handleSubmit(onSubmit as any) as any} className="space-y-8">
        {/* Dados do cliente */}
        <section>
          <h3 className="text-lg font-semibold mb-3">Dados do Cliente</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Estado Civil</label>
              <div className="flex gap-4 py-2">
                {['Solteiro(a)', 'Casado(a)', 'Divorciado(a)'].map((opt) => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <input type="radio" value={opt} {...register('estado_civil')} className="h-4 w-4" />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Gênero</label>
              <div className="flex gap-4 py-2">
                {['Masculino', 'Feminino'].map((opt) => (
                  <label key={opt} className="inline-flex items-center gap-2">
                    <input type="radio" value={opt} {...register('genero')} className="h-4 w-4" />
                    <span className="text-sm">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="form-label">Nome</label>
              <input {...register('nome')} className="form-input" placeholder="Nome completo" />
              {errors.nome && <p className="text-red-600 text-sm mt-1 font-medium">{errors.nome.message}</p>}
            </div>
            <div>
              <label className="form-label">Documento</label>
              <input {...register('documento')} className="form-input" placeholder="Driver License / CNH" />
            </div>
            <div>
              <label className="form-label">Estado do Documento</label>
              <select {...register('documento_estado')} className="form-select">
                <option value="">Selecione...</option>
                {[...US_STATES, INTERNATIONAL_STATE].map((s) => (
                  <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                ))}
              </select>
              {errors.documento_estado && <p className="text-red-600 text-sm mt-1 font-medium">{errors.documento_estado.message}</p>}
            </div>
            <div>
              <label className="form-label">Data de Nascimento</label>
              <input type="date" {...register('data_nascimento')} className="form-input" />
            </div>
            <div className="md:col-span-2">
              <label className="form-label">Rua</label>
              <input {...register('endereco_rua')} className="form-input" placeholder="Rua / Street" />
              {errors.endereco_rua && <p className="text-red-600 text-sm mt-1 font-medium">{errors.endereco_rua.message}</p>}
            </div>
            <div>
              <label className="form-label">Apt/Suite</label>
              <input {...register('endereco_apt')} className="form-input" placeholder="Apt, Suite, etc. (opcional)" />
            </div>
            <div>
              <label className="form-label">Cidade</label>
              <input {...register('endereco_cidade')} className="form-input" placeholder="Cidade / City" />
              {errors.endereco_cidade && <p className="text-red-600 text-sm mt-1 font-medium">{errors.endereco_cidade.message}</p>}
            </div>
            <div>
              <label className="form-label">Estado</label>
              <select {...register('endereco_estado')} className="form-select">
                <option value="">Selecione...</option>
                {[...US_STATES, INTERNATIONAL_STATE].map((s) => (
                  <option key={s.code} value={s.code}>{s.code} - {s.name}</option>
                ))}
              </select>
              {errors.endereco_estado && <p className="text-red-600 text-sm mt-1 font-medium">{errors.endereco_estado.message}</p>}
            </div>
            <div>
              <label className="form-label">ZIP Code</label>
              <input {...register('endereco_zipcode')} className="form-input" placeholder="ZIP" />
              {errors.endereco_zipcode && <p className="text-red-600 text-sm mt-1 font-medium">{errors.endereco_zipcode.message}</p>}
            </div>
            <div>
              <label className="form-label">Tempo de Seguro</label>
              <input {...register('tempo_de_seguro')} className="form-input" placeholder="Ex: 2 anos" />
            </div>
            <div>
              <label className="form-label">Tempo no Endereço</label>
              <input {...register('tempo_no_endereco')} className="form-input" placeholder="Ex: 1 ano" />
            </div>
          </div>
        </section>

        {/* Cônjuge - mostrar apenas se casado */}
        {watch('estado_civil') === 'Casado(a)' && (
        <section>
          <h3 className="text-lg font-semibold mb-3">Cônjuge</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="form-label">Nome</label>
              <input {...register('nome_conjuge')} className="form-input" />
            </div>
            <div>
              <label className="form-label">Documento</label>
              <input {...register('documento_conjuge')} className="form-input" />
            </div>
            <div>
              <label className="form-label">Data de Nascimento</label>
              <input type="date" {...register('data_nascimento_conjuge')} className="form-input" />
            </div>
          </div>
        </section>
        )}

        {/* Veículos */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Veículos</h3>
            <button type="button" className="btn-outline" onClick={() => addVeiculo({ vin: '', placa: '', ano: '', marca: '', modelo: '', financiado: '', tempo_com_veiculo: '' })}>+ Adicionar veículo</button>
          </div>
          {errors.veiculos && <p className="text-red-600 text-sm mb-2">{(errors.veiculos as any)?.message || 'Revise os campos dos veículos'}</p>}
          <div className="space-y-4">
            {veiculos.map((field, idx) => (
              <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/60">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="form-label">VIN</label>
                    <input
                      {...register(`veiculos.${idx}.vin` as const)}
                      className="form-input"
                      placeholder="VIN"
                      onChange={(e) => handleVinChange(idx, e.target.value)}
                      onBlur={(e) => handleVinChange(idx, e.target.value)}
                    />
                    {(errors.veiculos?.[idx] as any)?.vin && <p className="text-red-600 text-sm mt-1">{(errors.veiculos?.[idx] as any)?.vin?.message}</p>}
                    {/* Preview do veículo detectado */}
                    <p className="text-xs text-gray-600 mt-1 italic">{vehicleLabel(idx)}</p>
                  </div>
                  <div>
                    <label className="form-label">Placa</label>
                    <input {...register(`veiculos.${idx}.placa` as const)} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Financiado / Pago</label>
                    <select {...register(`veiculos.${idx}.financiado` as const)} className="form-select">
                      <option value="">Selecione</option>
                      <option value="Financiado">Financiado</option>
                      <option value="Quitado">Quitado</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="form-label">Tempo com o veículo</label>
                    <select {...register(`veiculos.${idx}.tempo_com_veiculo` as const)} className="form-select">
                      <option value="">Selecione</option>
                      <option value="Menos de 1 ano">Menos de 1 ano</option>
                      <option value="1-3 Anos">Entre 1 e 3 anos</option>
                      <option value="Mais de 5 Anos">5 Anos ou mais</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 text-right">
                  <button type="button" className="btn-outline disabled:opacity-50 disabled:cursor-not-allowed" onClick={() => removeVeiculo(idx)} disabled={veiculos.length <= 1}>Remover</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Drivers adicionais */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Drivers Adicionais</h3>
            <button type="button" className="btn-outline" onClick={() => addPessoa({ nome: '', documento: '', data_nascimento: '', parentesco: '' })}>+ Adicionar driver</button>
          </div>
          <div className="space-y-4">
            {pessoas.map((field, idx) => (
              <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800/60">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="md:col-span-2">
                    <label className="form-label">Nome</label>
                    <input {...register(`pessoas.${idx}.nome` as const)} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Gênero</label>
                    <div className="flex gap-3 py-3">
                      {['Masculino', 'Feminino'].map((opt) => (
                        <label key={opt} className="inline-flex items-center gap-2">
                          <input type="radio" value={opt} {...register(`pessoas.${idx}.genero` as const)} className="h-4 w-4" />
                          <span className="text-sm">{opt}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Documento</label>
                    <input {...register(`pessoas.${idx}.documento` as const)} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Data de Nascimento</label>
                    <input type="date" {...register(`pessoas.${idx}.data_nascimento` as const)} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label">Parentesco</label>
                    <select {...register(`pessoas.${idx}.parentesco` as const)} className="form-select">
                      <option value="">Selecione</option>
                      <option value="Cônjuge">Cônjuge</option>
                      <option value="Filho(a)">Filho(a)</option>
                      <option value="Pai/Mãe">Pai/Mãe</option>
                      <option value="Outro">Outro</option>
                    </select>
                  </div>
                </div>
                <div className="mt-3 text-right">
                  <button type="button" className="btn-outline" onClick={() => removePessoa(idx)}>Remover</button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Observações */}
        <section>
          <h3 className="text-lg font-semibold mb-2">Observações</h3>
          <textarea {...register('observacoes')} className="form-input h-28" placeholder="Informações adicionais" />
        </section>

        {/* Imagens (opcional) */}
        <section>
          <h3 className="text-lg font-semibold mb-2">Imagens (opcional)</h3>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              setSelectedFiles(files);
            }}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {images.length > 0 && (
            <>
              <p className="text-xs text-gray-600 mt-2">{images.length} arquivo(s) selecionado(s).</p>
              <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {previews.map((src, i) => (
                  <div key={src} className="relative group border rounded-lg overflow-hidden bg-white shadow-sm">
                    <img src={src} alt={images[i]?.name || `imagem-${i+1}`} className="w-full h-24 object-cover" />
                    <div className="px-2 py-1 text-[10px] text-gray-700 truncate" title={images[i]?.name}>{images[i]?.name}</div>
                    <button
                      type="button"
                      className="absolute top-1 right-1 hidden group-hover:block bg-white/90 border rounded px-1 text-xs"
                      onClick={() => {
                        const nextImgs = images.filter((_, idx) => idx !== i);
                        const toRevoke = previews[i];
                        if (toRevoke) URL.revokeObjectURL(toRevoke);
                        const nextPrev = previews.filter((_, idx) => idx !== i);
                        setImages(nextImgs);
                        setPreviews(nextPrev);
                      }}
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Criar card no Trello'}
          </button>
          <button type="button" onClick={() => { reset(); setResult(null); }} className="btn-outline">
            Limpar
          </button>
        </div>

        {result && (
          <div className="mt-4 p-3 rounded bg-gray-50 border">
            <strong>Resultado:</strong> <span>{result}</span>
          </div>
        )}
      </form>
    </div>
  );
};

export default TrelloForm;
