import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { api } from '../../api/client';
import { Field, FormSection, SelectInput, TextArea, TextInput } from '../../components/Field';
import type { KanbanCard, KanbanColumn } from '../../types';

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
  onClose: () => void;
  onCreated: () => void;
};

const states = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'IL', 'MA', 'NJ', 'NY', 'OH', 'PA', 'TX', 'WA', 'IT'];

const initialVehicle: Vehicle = { ano: '', marca: '', modelo: '', vin: '', placa: '', financiado: '', tempo_com_veiculo: '' };
const initialDriver: Driver = { nome: '', data_nascimento: '', genero: '', estado_civil: '', parentesco: '', documento: '', documento_estado: '' };
const initialForm: CardPayload = {
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

export function CardFormModal({ open, columns, initialColumnId, onClose, onCreated }: Props) {
  const [form, setForm] = useState<CardPayload>(initialForm);
  const [columnId, setColumnId] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setColumnId(initialColumnId || columns[0]?.id || '');
      setError('');
    }
  }, [columns, initialColumnId, open]);

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
      const card = await api.post<KanbanCard>('/kanban/cards', {
        columnId: columnId || columns[0]?.id,
        payload: form
      });

      for (const file of attachments) {
        const payload = new FormData();
        payload.append('file', file);
        await api.upload(`/kanban/cards/${card.id}/attachments`, payload);
      }

      setForm(initialForm);
      setAttachments([]);
      setColumnId(initialColumnId || '');
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar card.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal-sheet" onSubmit={handleSubmit} onMouseDown={(event) => event.stopPropagation()}>
        <header className="modal-header">
          <div>
            <p className="eyebrow">Nova cotacao</p>
            <h2>Criar card no Kanban</h2>
          </div>
          <button type="button" className="icon-command" onClick={onClose} title="Fechar">
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

          <FormSection title="Observacoes e anexos">
            <Field label="Observacoes" wide><TextArea rows={4} value={form.observacoes} onChange={(event) => updateField('observacoes', event.target.value)} /></Field>
            <Field label="Anexos" wide>
              <input className="control" type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => setAttachments(Array.from(event.target.files || []))} />
            </Field>
          </FormSection>
        </div>

        <footer className="modal-footer">
          {error ? <span className="form-error">{error}</span> : null}
          <button type="button" className="secondary-button" onClick={onClose}>Cancelar</button>
          <button type="submit" className="primary-button" disabled={loading}>{loading ? 'Criando...' : 'Criar card'}</button>
        </footer>
      </form>
    </div>
  );
}
