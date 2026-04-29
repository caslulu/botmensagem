import { useEffect, useState } from 'react';
import { Download, Eye, FileText, ImageIcon, Plus, Save, Trash2, X } from 'lucide-react';
import { api, downloadFile } from '../../api/client';
import { Field, FormSection, SelectInput, TextArea, TextInput } from '../../components/Field';
import type { FileAsset, KanbanCard, KanbanColumn } from '../../types';

type Vehicle = {
  ano: string;
  marca: string;
  modelo: string;
  vin: string;
  placa: string;
  financiado: string;
  tempo_com_veiculo: string;
};

type Driver = {
  nome: string;
  data_nascimento: string;
  genero: string;
  estado_civil: string;
  parentesco: string;
  documento: string;
  documento_estado: string;
};

type CardPayload = {
  nome: string;
  documento: string;
  documento_estado: string;
  endereco_rua: string;
  endereco_apt: string;
  endereco_cidade: string;
  endereco_estado: string;
  endereco_zipcode: string;
  data_nascimento: string;
  tempo_de_seguro: string;
  tempo_no_endereco: string;
  estado_civil: string;
  genero: string;
  nome_conjuge: string;
  documento_conjuge: string;
  documento_estado_conjuge: string;
  data_nascimento_conjuge: string;
  email: string;
  observacoes: string;
  veiculos: Vehicle[];
  pessoas: Driver[];
};

type Props = {
  open: boolean;
  columns: KanbanColumn[];
  initialColumnId?: string;
  card?: KanbanCard | null;
  onClose: () => void;
  onSaved: () => void;
  onCreatePrice?: (card: KanbanCard) => void;
};

const states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'IL', 'MA', 'NJ', 'NY', 'OH', 'PA', 'TX', 'WA', 'IT'];

const initialVehicle: Vehicle = { ano: '', marca: '', modelo: '', vin: '', placa: '', financiado: '', tempo_com_veiculo: '' };
const initialDriver: Driver = { nome: '', data_nascimento: '', genero: '', estado_civil: '', parentesco: '', documento: '', documento_estado: '' };

function createInitialForm(): CardPayload {
  return {
    nome: '',
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
    estado_civil: '',
    genero: '',
    nome_conjuge: '',
    documento_conjuge: '',
    documento_estado_conjuge: '',
    data_nascimento_conjuge: '',
    email: '',
    observacoes: '',
    veiculos: [{ ...initialVehicle }],
    pessoas: []
  };
}

function readString(value: unknown): string {
  if (value === undefined || value === null) return '';
  return String(value);
}

function parseList<T>(input: unknown): Partial<T>[] {
  if (Array.isArray(input)) return input as Partial<T>[];
  if (typeof input !== 'string' || !input.trim()) return [];

  try {
    const parsed = JSON.parse(input);
    return Array.isArray(parsed) ? (parsed as Partial<T>[]) : [];
  } catch (_) {
    return [];
  }
}

function normalizeVehicle(vehicle: Partial<Vehicle>): Vehicle {
  return {
    ano: readString(vehicle.ano),
    marca: readString(vehicle.marca),
    modelo: readString(vehicle.modelo),
    vin: readString(vehicle.vin),
    placa: readString(vehicle.placa),
    financiado: readString(vehicle.financiado),
    tempo_com_veiculo: readString(vehicle.tempo_com_veiculo)
  };
}

function normalizeDriver(driver: Partial<Driver>): Driver {
  return {
    nome: readString(driver.nome),
    data_nascimento: readString(driver.data_nascimento),
    genero: readString(driver.genero),
    estado_civil: readString(driver.estado_civil),
    parentesco: readString(driver.parentesco),
    documento: readString(driver.documento),
    documento_estado: readString(driver.documento_estado)
  };
}

function formFromCard(card: KanbanCard): CardPayload {
  const payload = card.payload || {};
  const veiculos = parseList<Vehicle>(payload.veiculos).map(normalizeVehicle);
  const pessoas = parseList<Driver>(payload.pessoas).map(normalizeDriver);

  return {
    nome: readString(payload.nome || card.title),
    documento: readString(payload.documento),
    documento_estado: readString(payload.documento_estado),
    endereco_rua: readString(payload.endereco_rua),
    endereco_apt: readString(payload.endereco_apt),
    endereco_cidade: readString(payload.endereco_cidade),
    endereco_estado: readString(payload.endereco_estado),
    endereco_zipcode: readString(payload.endereco_zipcode),
    data_nascimento: readString(payload.data_nascimento),
    tempo_de_seguro: readString(payload.tempo_de_seguro),
    tempo_no_endereco: readString(payload.tempo_no_endereco),
    estado_civil: readString(payload.estado_civil),
    genero: readString(payload.genero),
    nome_conjuge: readString(payload.nome_conjuge),
    documento_conjuge: readString(payload.documento_conjuge),
    documento_estado_conjuge: readString(payload.documento_estado_conjuge),
    data_nascimento_conjuge: readString(payload.data_nascimento_conjuge),
    email: readString(payload.email),
    observacoes: readString(payload.observacoes),
    veiculos: veiculos.length ? veiculos : [{ ...initialVehicle }],
    pessoas
  };
}

function isImageFile(file: FileAsset): boolean {
  return file.mimeType.startsWith('image/');
}

function filePreviewUrl(file: FileAsset): string {
  return file.previewUrl || file.downloadUrl;
}

export function CardFormModal({ open, columns, initialColumnId, card, onClose, onSaved, onCreatePrice }: Props) {
  const [form, setForm] = useState<CardPayload>(createInitialForm);
  const [columnId, setColumnId] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previewFile, setPreviewFile] = useState<FileAsset | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isEditing = Boolean(card);

  useEffect(() => {
    if (open) {
      setForm(card ? formFromCard(card) : createInitialForm());
      setColumnId(card?.columnId || initialColumnId || columns[0]?.id || '');
      setAttachments([]);
      setPreviewFile(null);
      setConfirmDelete(false);
      setError('');
    }
  }, [card, columns, initialColumnId, open]);

  if (!open) return null;

  const updateField = (name: keyof CardPayload, value: string) => setForm((prev) => ({ ...prev, [name]: value }));

  const updateVehicle = async (index: number, field: keyof Vehicle, value: string) => {
    const normalized = field === 'vin' ? value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : value;
    setForm((prev) => {
      const veiculos = [...prev.veiculos];
      veiculos[index] = { ...veiculos[index], [field]: normalized };
      return { ...prev, veiculos };
    });

    if (field === 'vin' && normalized.length === 17) {
      try {
        const res = await api.get<{ data: { year: string; make: string; model: string } }>(`/vehicles/vin/${normalized}`);
        setForm((prev) => {
          const veiculos = [...prev.veiculos];
          veiculos[index] = {
            ...veiculos[index],
            ano: res.data.year || veiculos[index].ano,
            marca: res.data.make || veiculos[index].marca,
            modelo: res.data.model || veiculos[index].modelo
          };
          return { ...prev, veiculos };
        });
      } catch (_) {
        // VIN decode is a helper only; manual fields remain available.
      }
    }
  };

  const updateDriver = (index: number, field: keyof Driver, value: string) => {
    setForm((prev) => {
      const pessoas = [...prev.pessoas];
      pessoas[index] = { ...pessoas[index], [field]: value };
      return { ...prev, pessoas };
    });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.nome.trim()) {
      setError('Nome do cliente e obrigatorio.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const savedCard = card
        ? await api.patch<KanbanCard>(`/kanban/cards/${card.id}`, { payload: form })
        : await api.post<KanbanCard>('/kanban/cards', {
          columnId: columnId || columns[0]?.id,
          payload: form
        });

      if (card && columnId && columnId !== card.columnId) {
        const targetColumn = columns.find((column) => column.id === columnId);
        const targetPosition = targetColumn?.cards?.filter((item) => item.id !== card.id).length ?? 0;
        await api.patch(`/kanban/cards/${card.id}/move`, { columnId, position: targetPosition });
      }

      for (const file of attachments) {
        const payload = new FormData();
        payload.append('file', file);
        await api.upload(`/kanban/cards/${savedCard.id}/attachments`, payload);
      }

      setForm(createInitialForm());
      setAttachments([]);
      setColumnId(initialColumnId || '');
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : isEditing ? 'Erro ao salvar card.' : 'Erro ao criar card.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!card || loading) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.delete(`/kanban/cards/${card.id}`);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao excluir card.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={() => !loading && onClose()}>
      <form className="modal-sheet" onSubmit={handleSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="eyebrow">{isEditing ? 'Detalhes da cotacao' : 'Nova cotacao'}</p>
            <h2>{isEditing ? form.nome || card?.title || 'Editar card' : 'Criar card no Kanban'}</h2>
          </div>
          <button type="button" className="icon-command" onClick={onClose} title="Fechar" disabled={loading}>
            <X size={18} />
          </button>
        </header>

        <div className="modal-body">
          <FormSection title="Cliente">
            <Field label="Coluna">
              <SelectInput value={columnId} onChange={(event) => setColumnId(event.target.value)}>
                <option value="">Primeira coluna</option>
                {columns.map((column) => <option key={column.id} value={column.id}>{column.title}</option>)}
              </SelectInput>
            </Field>
            <Field label="Nome completo"><TextInput value={form.nome} onChange={(event) => updateField('nome', event.target.value)} required /></Field>
            <Field label="Documento"><TextInput value={form.documento} onChange={(event) => updateField('documento', event.target.value)} /></Field>
            <Field label="Estado documento">
              <SelectInput value={form.documento_estado} onChange={(event) => updateField('documento_estado', event.target.value)}>
                <option value="">Selecione</option>
                {states.map((state) => <option key={state}>{state}</option>)}
              </SelectInput>
            </Field>
            <Field label="Nascimento"><TextInput type="date" value={form.data_nascimento} onChange={(event) => updateField('data_nascimento', event.target.value)} /></Field>
            <Field label="Estado civil">
              <SelectInput value={form.estado_civil} onChange={(event) => updateField('estado_civil', event.target.value)}>
                <option value="">Selecione</option>
                <option>Solteiro(a)</option>
                <option>Casado(a)</option>
                <option>Divorciado(a)</option>
              </SelectInput>
            </Field>
            <Field label="Genero">
              <SelectInput value={form.genero} onChange={(event) => updateField('genero', event.target.value)}>
                <option value="">Selecione</option>
                <option>Masculino</option>
                <option>Feminino</option>
              </SelectInput>
            </Field>
            <Field label="Email"><TextInput type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} /></Field>
          </FormSection>

          <FormSection title="Endereco e seguro">
            <Field label="Rua" wide><TextInput value={form.endereco_rua} onChange={(event) => updateField('endereco_rua', event.target.value)} /></Field>
            <Field label="Apt"><TextInput value={form.endereco_apt} onChange={(event) => updateField('endereco_apt', event.target.value)} /></Field>
            <Field label="Cidade"><TextInput value={form.endereco_cidade} onChange={(event) => updateField('endereco_cidade', event.target.value)} /></Field>
            <Field label="Estado">
              <SelectInput value={form.endereco_estado} onChange={(event) => updateField('endereco_estado', event.target.value)}>
                <option value="">Selecione</option>
                {states.map((state) => <option key={state}>{state}</option>)}
              </SelectInput>
            </Field>
            <Field label="ZIP"><TextInput value={form.endereco_zipcode} onChange={(event) => updateField('endereco_zipcode', event.target.value)} /></Field>
            <Field label="Tempo seguro">
              <SelectInput value={form.tempo_de_seguro} onChange={(event) => updateField('tempo_de_seguro', event.target.value)}>
                <option value="">Selecione</option>
                <option>Menos de 6 meses</option>
                <option>6 meses/1 ano</option>
                <option>1-3 anos</option>
                <option>3-5 anos</option>
                <option>5+ anos</option>
              </SelectInput>
            </Field>
            <Field label="Tempo endereco">
              <SelectInput value={form.tempo_no_endereco} onChange={(event) => updateField('tempo_no_endereco', event.target.value)}>
                <option value="">Selecione</option>
                <option>Menos de 1 ano</option>
                <option>Mais de 1 ano</option>
              </SelectInput>
            </Field>
          </FormSection>

          {form.estado_civil === 'Casado(a)' ? (
            <FormSection title="Conjuge">
              <Field label="Nome"><TextInput value={form.nome_conjuge} onChange={(event) => updateField('nome_conjuge', event.target.value)} /></Field>
              <Field label="Documento"><TextInput value={form.documento_conjuge} onChange={(event) => updateField('documento_conjuge', event.target.value)} /></Field>
              <Field label="Estado documento"><SelectInput value={form.documento_estado_conjuge} onChange={(event) => updateField('documento_estado_conjuge', event.target.value)}><option value="">Selecione</option>{states.map((state) => <option key={state}>{state}</option>)}</SelectInput></Field>
              <Field label="Nascimento"><TextInput type="date" value={form.data_nascimento_conjuge} onChange={(event) => updateField('data_nascimento_conjuge', event.target.value)} /></Field>
            </FormSection>
          ) : null}

          <FormSection title="Veiculos">
            <div className="form-list">
              {form.veiculos.map((vehicle, index) => (
                <div className="embedded-row" key={index}>
                  <div className="embedded-row-header">
                    <strong>Veiculo {index + 1}</strong>
                    {form.veiculos.length > 1 ? (
                      <button type="button" className="text-command" onClick={() => setForm((prev) => ({ ...prev, veiculos: prev.veiculos.filter((_, i) => i !== index) }))}>
                        <Trash2 size={14} /> Remover
                      </button>
                    ) : null}
                  </div>
                  <div className="form-grid">
                    <Field label="VIN"><TextInput value={vehicle.vin} maxLength={17} onChange={(event) => updateVehicle(index, 'vin', event.target.value)} /></Field>
                    <Field label="Ano"><TextInput value={vehicle.ano} onChange={(event) => updateVehicle(index, 'ano', event.target.value)} /></Field>
                    <Field label="Marca"><TextInput value={vehicle.marca} onChange={(event) => updateVehicle(index, 'marca', event.target.value)} /></Field>
                    <Field label="Modelo"><TextInput value={vehicle.modelo} onChange={(event) => updateVehicle(index, 'modelo', event.target.value)} /></Field>
                    <Field label="Placa"><TextInput value={vehicle.placa} onChange={(event) => updateVehicle(index, 'placa', event.target.value)} /></Field>
                    <Field label="Estado"><SelectInput value={vehicle.financiado} onChange={(event) => updateVehicle(index, 'financiado', event.target.value)}><option value="">Selecione</option><option>Financiado</option><option>Quitado</option></SelectInput></Field>
                    <Field label="Tempo com veiculo" wide><TextInput value={vehicle.tempo_com_veiculo} onChange={(event) => updateVehicle(index, 'tempo_com_veiculo', event.target.value)} /></Field>
                  </div>
                </div>
              ))}
              <button type="button" className="secondary-button" onClick={() => setForm((prev) => ({ ...prev, veiculos: [...prev.veiculos, { ...initialVehicle }] }))}>
                <Plus size={16} /> Adicionar veiculo
              </button>
            </div>
          </FormSection>

          <FormSection title="Drivers adicionais">
            <div className="form-list">
              {form.pessoas.map((driver, index) => (
                <div className="embedded-row" key={index}>
                  <div className="embedded-row-header">
                    <strong>Driver {index + 1}</strong>
                    <button type="button" className="text-command" onClick={() => setForm((prev) => ({ ...prev, pessoas: prev.pessoas.filter((_, i) => i !== index) }))}>
                      <Trash2 size={14} /> Remover
                    </button>
                  </div>
                  <div className="form-grid">
                    <Field label="Nome"><TextInput value={driver.nome} onChange={(event) => updateDriver(index, 'nome', event.target.value)} /></Field>
                    <Field label="Documento"><TextInput value={driver.documento} onChange={(event) => updateDriver(index, 'documento', event.target.value)} /></Field>
                    <Field label="Estado"><SelectInput value={driver.documento_estado} onChange={(event) => updateDriver(index, 'documento_estado', event.target.value)}><option value="">Selecione</option>{states.map((state) => <option key={state}>{state}</option>)}</SelectInput></Field>
                    <Field label="Nascimento"><TextInput type="date" value={driver.data_nascimento} onChange={(event) => updateDriver(index, 'data_nascimento', event.target.value)} /></Field>
                    <Field label="Parentesco"><TextInput value={driver.parentesco} onChange={(event) => updateDriver(index, 'parentesco', event.target.value)} /></Field>
                    <Field label="Genero"><TextInput value={driver.genero} onChange={(event) => updateDriver(index, 'genero', event.target.value)} /></Field>
                  </div>
                </div>
              ))}
              <button type="button" className="secondary-button" onClick={() => setForm((prev) => ({ ...prev, pessoas: [...prev.pessoas, { ...initialDriver }] }))}>
                <Plus size={16} /> Adicionar driver
              </button>
            </div>
          </FormSection>

          {isEditing ? (
            <FormSection title="Anexos do card">
              <div className="attachment-gallery">
                {card?.files?.length ? card.files.map((file) => {
                  const image = isImageFile(file);
                  return (
                    <article className="attachment-tile" key={file.id}>
                      <button
                        type="button"
                        className="attachment-preview-button"
                        onClick={() => image ? setPreviewFile(file) : void downloadFile(file.downloadUrl, file.filename)}
                      >
                        <span className="attachment-thumb">
                          {image ? <img src={filePreviewUrl(file)} alt={file.filename} loading="lazy" /> : <FileText size={28} />}
                        </span>
                        <span className="attachment-name">{file.filename}</span>
                      </button>
                      <div className="attachment-actions">
                        {image ? (
                          <button type="button" className="inline-icon-button" onClick={() => setPreviewFile(file)} title="Ver imagem">
                            <Eye size={15} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="inline-icon-button"
                          onClick={() => void downloadFile(file.downloadUrl, file.filename)}
                          title="Baixar anexo"
                        >
                          <Download size={15} />
                        </button>
                      </div>
                    </article>
                  );
                }) : (
                  <div className="attachment-empty">
                    <ImageIcon size={20} />
                    Nenhum anexo neste card.
                  </div>
                )}
              </div>
            </FormSection>
          ) : null}

          <FormSection title={isEditing ? 'Observacoes e novos anexos' : 'Observacoes e anexos'}>
            <Field label="Observacoes" wide><TextArea rows={4} value={form.observacoes} onChange={(event) => updateField('observacoes', event.target.value)} /></Field>
            <Field label={isEditing ? 'Adicionar anexos' : 'Anexos'} wide>
              <input className="control" type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => setAttachments(Array.from(event.target.files || []))} />
            </Field>
          </FormSection>
        </div>

        <footer className="modal-footer">
          {error ? <span className="form-error">{error}</span> : null}
          {isEditing ? (
            <button type="button" className={`danger-button ${confirmDelete ? 'is-confirming' : ''}`} onClick={handleDelete} disabled={loading}>
              <Trash2 size={16} /> {confirmDelete ? 'Confirmar exclusao' : 'Excluir card'}
            </button>
          ) : null}
          {isEditing && card && onCreatePrice ? (
            <button type="button" className="secondary-button" onClick={() => onCreatePrice(card)} disabled={loading}>
              <ImageIcon size={16} /> Gerar preco
            </button>
          ) : null}
          <button type="button" className="secondary-button" onClick={onClose} disabled={loading}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={loading}>
            {isEditing ? <Save size={16} /> : null}
            {loading ? (isEditing ? 'Salvando...' : 'Criando...') : (isEditing ? 'Salvar alteracoes' : 'Criar card')}
          </button>
        </footer>

        {previewFile ? (
          <div
            className="image-preview-backdrop"
            onMouseDown={(event) => {
              event.stopPropagation();
              setPreviewFile(null);
            }}
          >
            <section className="image-preview-sheet" onMouseDown={(event) => event.stopPropagation()}>
              <header>
                <strong>{previewFile.filename}</strong>
                <div>
                  <button
                    type="button"
                    className="icon-command"
                    onClick={() => void downloadFile(previewFile.downloadUrl, previewFile.filename)}
                    title="Baixar imagem"
                  >
                    <Download size={17} />
                  </button>
                  <button type="button" className="icon-command" onClick={() => setPreviewFile(null)} title="Fechar imagem">
                    <X size={17} />
                  </button>
                </div>
              </header>
              <img src={filePreviewUrl(previewFile)} alt={previewFile.filename} />
            </section>
          </div>
        ) : null}
      </form>
    </div>
  );
}
