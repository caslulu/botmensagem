import React, { useCallback, useEffect, useMemo, useState } from 'react';

type KanbanCard = {
  id: string;
  columnId: string;
  title: string;
  description: string;
  payload: Record<string, any>;
  position: number;
  latestPrice?: {
    processed?: Record<string, any>;
  } | null;
};

type KanbanColumn = {
  id: string;
  title: string;
  position: number;
  cards: KanbanCard[];
};

type BoardResponse = {
  columns: KanbanColumn[];
};

type PersonDraft = {
  nome: string;
  documento: string;
  documento_estado: string;
  data_nascimento: string;
  email: string;
  genero: string;
  estado_civil: string;
  tempo_de_seguro: string;
  tempo_no_endereco: string;
};

type VehicleDraft = {
  vin: string;
  placa: string;
  ano: string;
  marca: string;
  modelo: string;
};

type CardDraft = {
  nome: string;
  documento: string;
  documento_estado: string;
  data_nascimento: string;
  email: string;
  endereco_rua: string;
  endereco_apt: string;
  endereco_cidade: string;
  endereco_estado: string;
  endereco_zipcode: string;
  genero: string;
  estado_civil: string;
  tempo_de_seguro: string;
  tempo_no_endereco: string;
  observacoes: string;
  pessoas: PersonDraft[];
  veiculos: VehicleDraft[];
};

const emptyPerson: PersonDraft = {
  nome: '',
  documento: '',
  documento_estado: '',
  data_nascimento: '',
  email: '',
  genero: '',
  estado_civil: '',
  tempo_de_seguro: '',
  tempo_no_endereco: ''
};

const emptyVehicle: VehicleDraft = {
  vin: '',
  placa: '',
  ano: '',
  marca: '',
  modelo: ''
};

const emptyDraft: CardDraft = {
  nome: '',
  documento: '',
  documento_estado: '',
  data_nascimento: '',
  email: '',
  endereco_rua: '',
  endereco_apt: '',
  endereco_cidade: '',
  endereco_estado: '',
  endereco_zipcode: '',
  genero: '',
  estado_civil: '',
  tempo_de_seguro: '',
  tempo_no_endereco: '',
  observacoes: '',
  pessoas: [],
  veiculos: []
};

const insurers = [
  { value: 'progressive', label: 'Progressive' },
  { value: 'liberty', label: 'Liberty Mutual' }
];

const documentStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
];

const genderOptions = [
  { value: 'male', label: 'Masculino' },
  { value: 'female', label: 'Feminino' },
  { value: 'other', label: 'Outro' }
];

const maritalStatusOptions = [
  { value: 'single', label: 'Solteiro(a)' },
  { value: 'married', label: 'Casado(a)' },
  { value: 'divorced', label: 'Divorciado(a)' },
  { value: 'widowed', label: 'Viúvo(a)' }
];

const insuranceDurationOptions = [
  { value: 'lt_6m', label: 'Menos de 6 meses' },
  { value: '6m_1y', label: '6 meses a 1 ano' },
  { value: '1y_3y', label: '1 a 3 anos' },
  { value: '3y_5y', label: '3 a 5 anos' },
  { value: '5y_plus', label: 'Mais de 5 anos' }
];

const addressDurationOptions = [
  { value: 'lt_1y', label: 'Menos de 1 ano' },
  { value: '1y_2y', label: '1 a 2 anos' },
  { value: '3y_5y', label: '3 a 5 anos' },
  { value: '5y_plus', label: 'Mais de 5 anos' }
];

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
      ? data.columns.map((column: KanbanColumn) => ({ ...column, cards: column.cards || [] }))
      : []
  };
}

function normalizePerson(raw: Record<string, any>): PersonDraft {
  return {
    nome: readString(raw.nome),
    documento: readString(raw.documento),
    documento_estado: readString(raw.documento_estado),
    data_nascimento: readString(raw.data_nascimento),
    email: readString(raw.email),
    genero: readString(raw.genero),
    estado_civil: readString(raw.estado_civil),
    tempo_de_seguro: readString(raw.tempo_de_seguro),
    tempo_no_endereco: readString(raw.tempo_no_endereco)
  };
}

function normalizeVehicle(raw: Record<string, any>): VehicleDraft {
  return {
    vin: readString(raw.vin),
    placa: readString(raw.placa, raw.plate),
    ano: readString(raw.ano),
    marca: readString(raw.marca),
    modelo: readString(raw.modelo)
  };
}

function personHasData(person: PersonDraft): boolean {
  return Boolean(
    person.nome.trim() ||
    person.documento.trim() ||
    person.documento_estado.trim() ||
    person.data_nascimento.trim() ||
    person.email.trim() ||
    person.genero.trim() ||
    person.estado_civil.trim() ||
    person.tempo_de_seguro.trim() ||
    person.tempo_no_endereco.trim()
  );
}

function vehicleHasData(vehicle: VehicleDraft): boolean {
  return Boolean(
    vehicle.vin.trim() ||
    vehicle.placa.trim() ||
    vehicle.ano.trim() ||
    vehicle.marca.trim() ||
    vehicle.modelo.trim()
  );
}

function peopleFromPayload(payload: Record<string, any>): PersonDraft[] {
  if (!Array.isArray(payload.pessoas)) return [];
  return payload.pessoas
    .map((entry: Record<string, any>) => normalizePerson(entry || {}))
    .filter((person: PersonDraft) => personHasData(person));
}

function vehiclesFromPayload(payload: Record<string, any>): VehicleDraft[] {
  if (Array.isArray(payload.veiculos)) {
    return payload.veiculos
      .map((entry: Record<string, any>) => normalizeVehicle(entry || {}))
      .filter((vehicle: VehicleDraft) => vehicleHasData(vehicle));
  }

  const legacyVehicle = {
    vin: readString(payload.veiculo_vin),
    placa: readString(payload.veiculo_placa, payload.placa),
    ano: readString(payload.veiculo_ano),
    marca: readString(payload.veiculo_marca),
    modelo: readString(payload.veiculo_modelo)
  };
  return vehicleHasData(legacyVehicle) ? [legacyVehicle] : [];
}

function draftFromCard(card: KanbanCard | null): CardDraft {
  if (!card) return { ...emptyDraft };
  const payload = card.payload || {};

  return {
    nome: readString(payload.nome, card.title),
    documento: readString(payload.documento),
    documento_estado: readString(payload.documento_estado),
    data_nascimento: readString(payload.data_nascimento),
    email: readString(payload.email),
    endereco_rua: readString(payload.endereco_rua),
    endereco_apt: readString(payload.endereco_apt),
    endereco_cidade: readString(payload.endereco_cidade),
    endereco_estado: readString(payload.endereco_estado),
    endereco_zipcode: readString(payload.endereco_zipcode),
    genero: readString(payload.genero),
    estado_civil: readString(payload.estado_civil),
    tempo_de_seguro: readString(payload.tempo_de_seguro),
    tempo_no_endereco: readString(payload.tempo_no_endereco),
    observacoes: readString(payload.observacoes),
    pessoas: peopleFromPayload(payload),
    veiculos: vehiclesFromPayload(payload)
  };
}

function payloadFromDraft(draft: CardDraft): Record<string, any> {
  return {
    nome: draft.nome,
    documento: draft.documento,
    documento_estado: draft.documento_estado,
    data_nascimento: draft.data_nascimento,
    email: draft.email,
    endereco_rua: draft.endereco_rua,
    endereco_apt: draft.endereco_apt,
    endereco_cidade: draft.endereco_cidade,
    endereco_estado: draft.endereco_estado,
    endereco_zipcode: draft.endereco_zipcode,
    genero: draft.genero,
    estado_civil: draft.estado_civil,
    tempo_de_seguro: draft.tempo_de_seguro,
    tempo_no_endereco: draft.tempo_no_endereco,
    observacoes: draft.observacoes,
    veiculos: draft.veiculos
      .map((vehicle) => ({
        vin: vehicle.vin.trim().toUpperCase(),
        placa: vehicle.placa.trim().toUpperCase(),
        ano: vehicle.ano.trim(),
        marca: vehicle.marca.trim(),
        modelo: vehicle.modelo.trim()
      }))
      .filter((vehicle) => vehicleHasData(vehicle)),
    pessoas: draft.pessoas
      .map((person) => ({
        nome: person.nome.trim(),
        documento: person.documento.trim(),
        documento_estado: person.documento_estado.trim(),
        data_nascimento: person.data_nascimento.trim(),
        email: person.email.trim(),
        genero: person.genero.trim(),
        estado_civil: person.estado_civil.trim(),
        tempo_de_seguro: person.tempo_de_seguro.trim(),
        tempo_no_endereco: person.tempo_no_endereco.trim()
      }))
      .filter((person) => personHasData(person))
  };
}

function isRouteNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error || '');
  const normalized = message.toLowerCase();
  return (
    normalized.includes('rota nao encontrada') ||
    normalized.includes('rota não encontrada') ||
    normalized.includes('not found') ||
    normalized.includes('http 404')
  );
}

function parseVehicleLookup(payload: any): Partial<VehicleDraft> {
  const candidates = [
    payload,
    Array.isArray(payload) ? payload[0] : null,
    payload?.vehicle,
    payload?.data,
    payload?.result,
    payload?.results?.[0],
    Array.isArray(payload?.results) ? payload.results[0] : null
  ].filter(Boolean);

  for (const candidate of candidates) {
    const year = readString(candidate.ano, candidate.year, candidate.modelYear, candidate.ModelYear);
    const make = readString(candidate.marca, candidate.make, candidate.Make);
    const model = readString(candidate.modelo, candidate.model, candidate.Model);
    if (year || make || model) {
      return {
        ano: year,
        marca: make,
        modelo: model
      };
    }
  }

  return {};
}

async function lookupVehicleByVin(vin: string): Promise<Partial<VehicleDraft>> {
  const normalizedVin = vin.trim().toUpperCase();
  if (!normalizedVin || normalizedVin.length < 6) return {};

  const encodedVin = encodeURIComponent(normalizedVin);
  const paths = [
    `/vehicles/decode-vin/${encodedVin}`,
    `/vehicles/decode/${encodedVin}`,
    `/vehicles/vin/${encodedVin}`,
    `/vehicles/lookup?vin=${encodedVin}`,
    `/vehicles?vin=${encodedVin}`
  ];

  for (const path of paths) {
    try {
      const data = await apiRequest<any>('GET', path);
      const vehicle = parseVehicleLookup(data);
      if (vehicle.ano || vehicle.marca || vehicle.modelo) {
        return vehicle;
      }
    } catch (error) {
      if (!isRouteNotFoundError(error)) {
        throw error;
      }
    }
  }

  return {};
}

async function apiRequest<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await window.desktopWebApi?.request({ method, path, body });
  if (!response?.success) {
    throw new Error(response?.error || 'Erro ao acessar a API cloud.');
  }
  return response.data as T;
}

function CardEditor({
  card,
  columns,
  initialColumnId,
  saving,
  onClose,
  onSave
}: {
  card: KanbanCard | null;
  columns: KanbanColumn[];
  initialColumnId: string;
  saving: boolean;
  onClose: () => void;
  onSave: (draft: CardDraft, columnId: string) => void;
}) {
  const [draft, setDraft] = useState<CardDraft>(() => draftFromCard(card));
  const [columnId, setColumnId] = useState(card?.columnId || initialColumnId || columns[0]?.id || '');
  const [vinLoadingKey, setVinLoadingKey] = useState('');
  const [vinNotice, setVinNotice] = useState('');

  useEffect(() => {
    setDraft(draftFromCard(card));
    setColumnId(card?.columnId || initialColumnId || columns[0]?.id || '');
  }, [card, columns, initialColumnId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !saving) {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose, saving]);

  const update = (key: keyof CardDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updatePerson = (index: number, key: keyof PersonDraft, value: string) => {
    setDraft((current) => ({
      ...current,
      pessoas: current.pessoas.map((person, itemIndex) => {
        if (itemIndex !== index) return person;
        return { ...person, [key]: value };
      })
    }));
  };

  const addPerson = () => {
    setDraft((current) => ({ ...current, pessoas: [...current.pessoas, { ...emptyPerson }] }));
  };

  const removePerson = (index: number) => {
    setDraft((current) => ({ ...current, pessoas: current.pessoas.filter((_, itemIndex) => itemIndex !== index) }));
  };

  const updateVehicle = (index: number, key: keyof VehicleDraft, value: string) => {
    setVinNotice('');
    setDraft((current) => ({
      ...current,
      veiculos: current.veiculos.map((vehicle, itemIndex) => {
        if (itemIndex !== index) return vehicle;
        return { ...vehicle, [key]: value };
      })
    }));
  };

  const addVehicle = () => {
    setDraft((current) => ({ ...current, veiculos: [...current.veiculos, { ...emptyVehicle }] }));
  };

  const removeVehicle = (index: number) => {
    setDraft((current) => ({ ...current, veiculos: current.veiculos.filter((_, itemIndex) => itemIndex !== index) }));
  };

  const resolveVin = async (index: number) => {
    const row = draft.veiculos[index];
    const vin = row?.vin?.trim().toUpperCase();
    if (!vin || vin.length < 6) return;

    setVinLoadingKey(`${index}:${vin}`);
    setVinNotice('');
    try {
      const resolved = await lookupVehicleByVin(vin);
      if (!resolved.ano && !resolved.marca && !resolved.modelo) {
        setVinNotice(`VIN ${vin}: sem retorno automático para modelo/marca/ano.`);
        return;
      }

      setDraft((current) => ({
        ...current,
        veiculos: current.veiculos.map((vehicle, itemIndex) => {
          if (itemIndex !== index) return vehicle;
          return {
            ...vehicle,
            vin,
            ano: readString(resolved.ano, vehicle.ano),
            marca: readString(resolved.marca, vehicle.marca),
            modelo: readString(resolved.modelo, vehicle.modelo)
          };
        })
      }));
      setVinNotice(`VIN ${vin}: veículo preenchido automaticamente.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao consultar o VIN.';
      setVinNotice(`VIN ${vin}: ${message}`);
    } finally {
      setVinLoadingKey('');
    }
  };

  return (
    <div
      className="modal-overlay opacity-100"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) {
          onClose();
        }
      }}
    >
      <form
        className="modal-content max-h-[92vh] max-w-6xl overflow-hidden"
        onSubmit={(event) => {
          event.preventDefault();
          onSave(draft, columnId);
        }}
      >
        <div className="modal-header">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-300">
              {card ? 'Editar cotação' : 'Nova cotação'}
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">
              {draft.nome || 'Dados do card'}
            </h3>
          </div>
          <button type="button" className="btn-secondary px-3" onClick={onClose} disabled={saving}>
            Fechar
          </button>
        </div>

        <div className="modal-body max-h-[72vh] overflow-y-auto custom-scrollbar">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section className="surface-subtle">
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Dados principais
                </h4>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Nome completo" value={draft.nome} onChange={(value) => update('nome', value)} required />
                  <Field label="Documento" value={draft.documento} onChange={(value) => update('documento', value)} />
                  <SelectField
                    label="Estado documento"
                    value={draft.documento_estado}
                    onChange={(value) => update('documento_estado', value)}
                    options={documentStates.map((state) => ({ value: state, label: state }))}
                    placeholder="Selecione"
                  />
                  <Field label="Nascimento" type="date" value={draft.data_nascimento} onChange={(value) => update('data_nascimento', value)} />
                  <Field label="Email" type="email" value={draft.email} onChange={(value) => update('email', value)} />
                  <ChoiceField
                    label="Gênero"
                    value={draft.genero}
                    onChange={(value) => update('genero', value)}
                    options={genderOptions}
                  />
                  <ChoiceField
                    label="Estado civil"
                    value={draft.estado_civil}
                    onChange={(value) => update('estado_civil', value)}
                    options={maritalStatusOptions}
                  />
                  <SelectField
                    label="Tempo de seguro"
                    value={draft.tempo_de_seguro}
                    onChange={(value) => update('tempo_de_seguro', value)}
                    options={insuranceDurationOptions}
                    placeholder="Selecione"
                  />
                  <SelectField
                    label="Tempo no endereço"
                    value={draft.tempo_no_endereco}
                    onChange={(value) => update('tempo_no_endereco', value)}
                    options={addressDurationOptions}
                    placeholder="Selecione"
                  />
                </div>
              </section>

              <section className="surface-subtle">
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Endereço
                </h4>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <Field label="Rua" value={draft.endereco_rua} onChange={(value) => update('endereco_rua', value)} />
                  <Field label="Apt" value={draft.endereco_apt} onChange={(value) => update('endereco_apt', value)} />
                  <Field label="Cidade" value={draft.endereco_cidade} onChange={(value) => update('endereco_cidade', value)} />
                  <Field label="Estado" value={draft.endereco_estado} onChange={(value) => update('endereco_estado', value)} />
                  <Field label="ZIP" value={draft.endereco_zipcode} onChange={(value) => update('endereco_zipcode', value)} />
                </div>
              </section>

              <section className="surface-subtle">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Veículos ({draft.veiculos.length})
                  </h4>
                  <button type="button" className="btn-secondary min-h-[36px] px-3 text-xs" onClick={addVehicle}>
                    Adicionar veículo
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {draft.veiculos.map((vehicle, index) => (
                    <div key={`vehicle-${index}`} className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 dark:border-slate-800/80 dark:bg-slate-900/85">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          Veículo {index + 1}
                        </p>
                        <button
                          type="button"
                          className="btn-secondary min-h-[32px] px-2 text-xs"
                          onClick={() => removeVehicle(index)}
                        >
                          Remover
                        </button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <label className="block md:col-span-2">
                          <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">VIN</span>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <input
                              className="input-control"
                              value={vehicle.vin}
                              maxLength={17}
                              placeholder="17 caracteres"
                              onChange={(event) => updateVehicle(index, 'vin', event.target.value.toUpperCase())}
                              onBlur={() => void resolveVin(index)}
                            />
                            <button
                              type="button"
                              className="btn-secondary min-h-[44px] px-3 text-xs"
                              onClick={() => void resolveVin(index)}
                              disabled={vinLoadingKey === `${index}:${vehicle.vin.trim().toUpperCase()}`}
                            >
                              {vinLoadingKey === `${index}:${vehicle.vin.trim().toUpperCase()}` ? 'Buscando...' : 'Preencher'}
                            </button>
                          </div>
                        </label>
                        <Field label="Placa (opcional)" value={vehicle.placa} onChange={(value) => updateVehicle(index, 'placa', value.toUpperCase())} />
                        <ReadOnlyField label="Marca" value={vehicle.marca || 'Automático pelo VIN'} />
                        <ReadOnlyField label="Modelo" value={vehicle.modelo || 'Automático pelo VIN'} />
                        <ReadOnlyField label="Ano" value={vehicle.ano || 'Automático pelo VIN'} />
                      </div>
                    </div>
                  ))}
                  {!draft.veiculos.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      Nenhum veículo adicionado.
                    </div>
                  ) : null}
                </div>
                {vinNotice ? (
                  <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">{vinNotice}</p>
                ) : null}
              </section>
            </div>

            <aside className="space-y-6">
              <section className="surface-subtle">
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">Status</h4>
                <label className="mt-4 block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">Coluna</span>
                  <select className="input-control" value={columnId} onChange={(event) => setColumnId(event.target.value)}>
                    {columns.map((column) => <option key={column.id} value={column.id}>{column.title}</option>)}
                  </select>
                </label>
              </section>

              <section className="surface-subtle">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                    Pessoas ({draft.pessoas.length})
                  </h4>
                  <button type="button" className="btn-secondary min-h-[36px] px-3 text-xs" onClick={addPerson}>
                    Adicionar pessoa
                  </button>
                </div>
                <div className="mt-4 space-y-3">
                  {draft.pessoas.map((person, index) => (
                    <div key={`person-${index}`} className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 dark:border-slate-800/80 dark:bg-slate-900/85">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                          Pessoa {index + 1}
                        </p>
                        <button
                          type="button"
                          className="btn-secondary min-h-[32px] px-2 text-xs"
                          onClick={() => removePerson(index)}
                        >
                          Remover
                        </button>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <Field label="Nome" value={person.nome} onChange={(value) => updatePerson(index, 'nome', value)} />
                        <Field label="Documento" value={person.documento} onChange={(value) => updatePerson(index, 'documento', value)} />
                        <SelectField
                          label="Estado documento"
                          value={person.documento_estado}
                          onChange={(value) => updatePerson(index, 'documento_estado', value)}
                          options={documentStates.map((state) => ({ value: state, label: state }))}
                          placeholder="Selecione"
                        />
                        <Field label="Nascimento" type="date" value={person.data_nascimento} onChange={(value) => updatePerson(index, 'data_nascimento', value)} />
                        <Field label="Email" type="email" value={person.email} onChange={(value) => updatePerson(index, 'email', value)} />
                        <ChoiceField
                          label="Gênero"
                          value={person.genero}
                          onChange={(value) => updatePerson(index, 'genero', value)}
                          options={genderOptions}
                        />
                        <ChoiceField
                          label="Estado civil"
                          value={person.estado_civil}
                          onChange={(value) => updatePerson(index, 'estado_civil', value)}
                          options={maritalStatusOptions}
                        />
                        <SelectField
                          label="Tempo de seguro"
                          value={person.tempo_de_seguro}
                          onChange={(value) => updatePerson(index, 'tempo_de_seguro', value)}
                          options={insuranceDurationOptions}
                          placeholder="Selecione"
                        />
                        <SelectField
                          label="Tempo no endereço"
                          value={person.tempo_no_endereco}
                          onChange={(value) => updatePerson(index, 'tempo_no_endereco', value)}
                          options={addressDurationOptions}
                          placeholder="Selecione"
                        />
                      </div>
                    </div>
                  ))}
                  {!draft.pessoas.length ? (
                    <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      Nenhuma pessoa adicional cadastrada.
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="surface-subtle">
                <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                  Observações
                </h4>
                <textarea
                  className="input-control mt-4 min-h-[140px]"
                  value={draft.observacoes}
                  onChange={(event) => update('observacoes', event.target.value)}
                />
              </section>
            </aside>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary px-5" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className="btn-primary px-6" disabled={saving || !draft.nome.trim()}>
            {saving ? 'Salvando...' : 'Salvar no Kanban'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <input className="input-control" type={type} value={value} required={required} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <select className="input-control" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder || 'Selecione'}</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ChoiceField({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="block md:col-span-2">
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`rounded-2xl border px-3 py-2 text-sm font-semibold transition-all ${
              value === option.value
                ? 'border-brand-400 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-200'
                : 'border-slate-200 bg-white/90 text-slate-600 hover:border-brand-200 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300'
            }`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
      <div className="input-control cursor-not-allowed bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
        {value}
      </div>
    </label>
  );
}

export const DesktopKanbanView: React.FC = () => {
  const [board, setBoard] = useState<BoardResponse>({ columns: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedInsurer, setSelectedInsurer] = useState('progressive');
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [editingColumnId, setEditingColumnId] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [columnDrafts, setColumnDrafts] = useState<Record<string, string>>({});
  const [renamingColumnId, setRenamingColumnId] = useState('');
  const [deletingColumnId, setDeletingColumnId] = useState('');
  const [draggingCardId, setDraggingCardId] = useState('');
  const [dragOverColumnId, setDragOverColumnId] = useState('');

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest<BoardResponse>('GET', '/kanban');
      setBoard(normalizeBoard(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar Kanban.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  useEffect(() => {
    setColumnDrafts((current) => {
      const next: Record<string, string> = {};
      for (const column of board.columns) {
        next[column.id] = current[column.id] ?? column.title;
      }
      return next;
    });
  }, [board.columns]);

  const allCards = useMemo(() => board.columns.flatMap((column) => column.cards || []), [board.columns]);

  const openNewCard = (columnId: string) => {
    setEditingCard(null);
    setEditingColumnId(columnId);
    setShowEditor(true);
  };

  const openCard = (card: KanbanCard) => {
    setEditingCard(card);
    setEditingColumnId(card.columnId);
    setShowEditor(true);
  };

  const saveCard = async (draft: CardDraft, columnId: string) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = payloadFromDraft(draft);
      if (editingCard) {
        await apiRequest<KanbanCard>('PATCH', `/kanban/cards/${editingCard.id}`, { payload });
        if (columnId && columnId !== editingCard.columnId) {
          const target = board.columns.find((column) => column.id === columnId);
          await apiRequest('PATCH', `/kanban/cards/${editingCard.id}/move`, { columnId, position: target?.cards?.length || 0 });
        }
      } else {
        await apiRequest<KanbanCard>('POST', '/kanban/cards', { columnId, payload });
      }
      setShowEditor(false);
      await loadBoard();
      setNotice('Card salvo no Kanban.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar card.');
    } finally {
      setSaving(false);
    }
  };

  const createColumn = async () => {
    const title = newColumnTitle.trim();
    if (!title) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await apiRequest('POST', '/kanban/columns', { title });
      setNewColumnTitle('');
      await loadBoard();
      setNotice('Coluna criada com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar coluna.');
    } finally {
      setSaving(false);
    }
  };

  const renameColumn = async (column: KanbanColumn) => {
    const next = (columnDrafts[column.id] || '').trim();
    if (!next || next === column.title) return;
    setRenamingColumnId(column.id);
    setError('');
    setNotice('');
    try {
      await apiRequest('PATCH', `/kanban/columns/${column.id}`, { title: next });
      await loadBoard();
      setNotice('Coluna renomeada com sucesso.');
    } catch (err) {
      setColumnDrafts((current) => ({ ...current, [column.id]: column.title }));
      setError(err instanceof Error ? err.message : 'Erro ao renomear coluna.');
    } finally {
      setRenamingColumnId('');
    }
  };

  const deleteColumn = async (column: KanbanColumn) => {
    if (column.cards.length > 0) {
      setError('Esvazie a coluna antes de deletar para evitar perda de cards.');
      return;
    }

    const confirmed = window.confirm(`Deseja deletar a coluna "${column.title}"?`);
    if (!confirmed) return;

    setDeletingColumnId(column.id);
    setError('');
    setNotice('');
    try {
      await apiRequest('DELETE', `/kanban/columns/${column.id}`);
      await loadBoard();
      setNotice('Coluna deletada com sucesso.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao deletar coluna.');
    } finally {
      setDeletingColumnId('');
    }
  };

  const moveCard = async (card: KanbanCard, columnId: string) => {
    if (!columnId || columnId === card.columnId) return;
    try {
      const target = board.columns.find((column) => column.id === columnId);
      await apiRequest('PATCH', `/kanban/cards/${card.id}/move`, { columnId, position: target?.cards?.length || 0 });
      await loadBoard();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao mover card.');
    }
  };

  const handleCardDrop = async (columnId: string) => {
    const card = allCards.find((item) => item.id === draggingCardId);
    setDragOverColumnId('');
    setDraggingCardId('');
    if (!card) return;
    await moveCard(card, columnId);
  };

  const runQuote = async (card: KanbanCard, insurer: string = selectedInsurer) => {
    setRunningId(card.id);
    setError('');
    setNotice('');
    try {
      const payload = card.payload || {};
      const saved = await window.price?.upsertQuote?.({
        id: card.id,
        nome: readString(payload.nome, card.title),
        documento: readString(payload.documento),
        payload,
        cardId: card.id
      });

      if (saved && typeof saved === 'object' && 'success' in saved && !saved.success) {
        throw new Error(saved.error || 'Erro ao salvar espelho local da cotação.');
      }

      const result = await window.quotes?.runAutomation?.({
        quoteId: card.id,
        insurer,
        headless: false
      });

      if (result && typeof result === 'object' && 'success' in result && !result.success) {
        throw new Error(result.error || 'Erro ao iniciar cotação.');
      }
      setNotice(`Cotação iniciada para ${card.title}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao iniciar cotação.');
    } finally {
      setRunningId('');
    }
  };

  return (
    <div className="space-y-6 pb-6">
      <section className="page-hero">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-600 dark:text-brand-300">
              Kanban cloud no desktop
            </p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
              Cotações do banco cloud com automação local
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-500 dark:text-slate-400 sm:text-base">
              O quadro usa os mesmos cards da API cloud. No desktop, cada card também pode abrir a automação de cotação.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                Seguradora padrão
              </span>
              <select className="input-control min-w-[210px]" value={selectedInsurer} onChange={(event) => setSelectedInsurer(event.target.value)}>
                {insurers.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <button type="button" className="btn-secondary px-4" onClick={() => void loadBoard()} disabled={loading}>
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        </div>
      </section>

      {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm font-semibold text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{error}</div> : null}
      {notice ? <div className="rounded-3xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</div> : null}

      <section className="card p-4 sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-2xl font-semibold text-slate-900 dark:text-white">Quadro de cotações</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{allCards.length} card{allCards.length === 1 ? '' : 's'} sincronizados com a API cloud.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input-control sm:w-64"
              placeholder="Nova coluna"
              value={newColumnTitle}
              onChange={(event) => setNewColumnTitle(event.target.value)}
            />
            <button type="button" className="btn-primary px-4" onClick={() => void createColumn()} disabled={saving || !newColumnTitle.trim()}>
              Criar coluna
            </button>
          </div>
        </div>

        <div className="grid gap-4 overflow-x-auto pb-2 xl:grid-cols-3">
          {board.columns.map((column) => (
            <section
              key={column.id}
              className={`min-w-[280px] rounded-[24px] border p-3 transition-all ${
                dragOverColumnId === column.id
                  ? 'border-brand-300 bg-brand-50/70 ring-2 ring-brand-500/20 dark:border-brand-500/30 dark:bg-brand-500/10'
                  : 'border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/45'
              }`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragOverColumnId(column.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                void handleCardDrop(column.id);
              }}
            >
              <header className="mb-3 flex items-center gap-2">
                <input
                  className="min-w-0 flex-1 bg-transparent text-base font-semibold text-slate-900 outline-none dark:text-white"
                  value={columnDrafts[column.id] ?? column.title}
                  onChange={(event) => setColumnDrafts((current) => ({ ...current, [column.id]: event.target.value }))}
                  onBlur={() => void renameColumn(column)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      void renameColumn(column);
                    }
                    if (event.key === 'Escape') {
                      setColumnDrafts((current) => ({ ...current, [column.id]: column.title }));
                      (event.target as HTMLInputElement).blur();
                    }
                  }}
                  disabled={renamingColumnId === column.id || deletingColumnId === column.id}
                />
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                  {column.cards.length}
                </span>
                <button
                  type="button"
                  className="btn-secondary min-h-[32px] px-2 text-xs"
                  onClick={() => void deleteColumn(column)}
                  disabled={Boolean(deletingColumnId) || Boolean(renamingColumnId)}
                  title={column.cards.length ? 'Mova os cards para outra coluna antes de deletar.' : 'Deletar coluna'}
                >
                  {deletingColumnId === column.id ? 'Deletando...' : 'Deletar'}
                </button>
              </header>

              <div className="space-y-3">
                {column.cards.map((card) => {
                  const latest = card.latestPrice?.processed || {};
                  const peopleCount = Array.isArray(card.payload?.pessoas) ? card.payload.pessoas.length : 0;
                  const vehiclesCount = Array.isArray(card.payload?.veiculos) ? card.payload.veiculos.length : 0;
                  return (
                    <article
                      key={card.id}
                      draggable
                      onDragStart={() => setDraggingCardId(card.id)}
                      onDragEnd={() => {
                        setDraggingCardId('');
                        setDragOverColumnId('');
                      }}
                      className={`rounded-[22px] border bg-white p-4 shadow-sm transition-opacity dark:bg-slate-900 ${
                        draggingCardId === card.id
                          ? 'border-brand-300 opacity-65 dark:border-brand-500/30'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <button type="button" className="block w-full text-left" onClick={() => openCard(card)}>
                        <div className="flex items-start justify-between gap-3">
                          <strong className="text-sm font-semibold text-slate-900 dark:text-white">{card.title}</strong>
                          <span className="text-xs font-semibold text-brand-700 dark:text-brand-200">
                            {readString(latest.valor_total_completo, latest.valor_total_basico, 'Pendente')}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                          {card.description || readString(card.payload?.endereco_zipcode, card.payload?.documento, 'Sem resumo')}
                        </p>
                        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                          {peopleCount} pessoa{peopleCount === 1 ? '' : 's'} • {vehiclesCount} veículo{vehiclesCount === 1 ? '' : 's'}
                        </p>
                      </button>

                      <div className="mt-4 flex flex-col gap-2">
                        <select className="input-control text-sm" value={card.columnId} onChange={(event) => void moveCard(card, event.target.value)}>
                          {board.columns.map((target) => <option key={target.id} value={target.id}>{target.title}</option>)}
                        </select>
                        <label className="block">
                          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                            Seguradora da cotação
                          </span>
                          <select
                            className="input-control text-sm"
                            value={selectedInsurer}
                            onChange={(event) => setSelectedInsurer(event.target.value)}
                          >
                            {insurers.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                          </select>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" className="btn-secondary min-h-[40px] px-3 text-xs" onClick={() => openCard(card)}>
                            Editar
                          </button>
                          <button type="button" className="btn-primary min-h-[40px] px-3 text-xs" onClick={() => void runQuote(card, selectedInsurer)} disabled={Boolean(runningId)}>
                            {runningId === card.id ? 'Abrindo...' : 'Iniciar cotação'}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}

                {!column.cards.length ? (
                  <div className="rounded-[20px] border border-dashed border-slate-300 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Nenhum card nesta coluna.
                  </div>
                ) : null}
              </div>

              <button type="button" className="btn-secondary mt-3 w-full justify-center px-4" onClick={() => openNewCard(column.id)}>
                Novo card
              </button>
            </section>
          ))}
        </div>
      </section>

      {showEditor ? (
        <CardEditor
          card={editingCard}
          columns={board.columns}
          initialColumnId={editingColumnId}
          saving={saving}
          onClose={() => setShowEditor(false)}
          onSave={(draft, columnId) => void saveCard(draft, columnId)}
        />
      ) : null}
    </div>
  );
};
