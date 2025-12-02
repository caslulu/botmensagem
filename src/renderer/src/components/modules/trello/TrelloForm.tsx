import React, { useState } from 'react';

interface Vehicle {
  ano: string;
  marca: string;
  modelo: string;
  vin: string;
  placa: string;
  financiado: string;
  tempo_com_veiculo: string;
}

interface Driver {
  nome: string;
  data_nascimento: string;
  genero: string;
  estado_civil: string;
  relacao: string;
  documento: string;
}

interface TrelloFormData {
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
  data_nascimento_conjuge: string;
  email: string;
  observacoes: string;
  veiculos: Vehicle[];
  pessoas: Driver[];
  attachments: File[];
}

const initialVehicle: Vehicle = { ano: '', marca: '', modelo: '', vin: '', placa: '', financiado: '', tempo_com_veiculo: '' };
const initialDriver: Driver = { nome: '', data_nascimento: '', genero: '', estado_civil: '', relacao: '', documento: '' };

const initialForm: TrelloFormData = {
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
  data_nascimento_conjuge: '',
  email: '',
  observacoes: '',
  veiculos: [{ ...initialVehicle }],
  pessoas: [],
  attachments: [],
};

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }, { code: 'IT', name: 'International' }
];

const VIN_DECODE_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues/';

function formatToMmDdYyyy(value: string) {
  if (!value) return '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

async function decodeVin(vin: string) {
  const normalizedVin = (vin || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!normalizedVin || normalizedVin.length < 11) {
    return null;
  }

  if (window?.trello?.decodeVin) {
    try {
      const response = await window.trello.decodeVin(normalizedVin);
      if (response?.success && response.data) {
        return {
          year: response.data.year || '',
          make: response.data.make || '',
          model: response.data.model || ''
        };
      }
    } catch (error) {
      console.warn('Falha ao decodificar VIN via IPC', error);
    }
  }
  try {
    const resp = await fetch(`${VIN_DECODE_URL}${encodeURIComponent(normalizedVin)}?format=json`, {
      headers: { Accept: 'application/json' }
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    const row = data?.Results?.[0] || {};
    return {
      year: row?.ModelYear || row?.Model_Year || '',
      make: row?.Make || '',
      model: row?.Model || ''
    };
  } catch (error) {
    console.warn('Falha ao decodificar VIN', error);
    return null;
  }
}

export const TrelloForm: React.FC = () => {
  const [form, setForm] = useState<TrelloFormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleVehicleChange = async (index: number, field: keyof Vehicle, value: string) => {
    const normalizedValue =
      field === 'vin' ? value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : value;
    setForm((prev) => {
      const vehicles = [...prev.veiculos];
      vehicles[index] = { ...vehicles[index], [field]: normalizedValue };
      return { ...prev, veiculos: vehicles };
    });

    if (field === 'vin' && normalizedValue.length === 17) {
      const info = await decodeVin(normalizedValue);
      if (info) {
        setForm((prev) => {
          const vehicles = [...prev.veiculos];
          const target = vehicles[index];
          if (!target) return prev;
          vehicles[index] = {
            ...target,
            ano: info.year || target.ano,
            marca: info.make || target.marca,
            modelo: info.model || target.modelo
          };
          return { ...prev, veiculos: vehicles };
        });
      }
    }
  };

  const addVehicle = () => {
    setForm((prev) => ({ ...prev, veiculos: [...prev.veiculos, { ...initialVehicle }] }));
  };

  const removeVehicle = (index: number) => {
    if (form.veiculos.length > 1) {
        const newVehicles = form.veiculos.filter((_, i) => i !== index);
        setForm((prev) => ({ ...prev, veiculos: newVehicles }));
    }
  };

  const handleDriverChange = (index: number, field: keyof Driver, value: string) => {
    const newDrivers = [...form.pessoas];
    newDrivers[index] = { ...newDrivers[index], [field]: value };
    setForm((prev) => ({ ...prev, pessoas: newDrivers }));
  };

  const addDriver = () => {
    setForm((prev) => ({ ...prev, pessoas: [...prev.pessoas, { ...initialDriver }] }));
  };

  const removeDriver = (index: number) => {
    const newDrivers = form.pessoas.filter((_, i) => i !== index);
    setForm((prev) => ({ ...prev, pessoas: newDrivers }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setForm((prev) => ({ ...prev, attachments: Array.from(e.target.files || []) }));
    }
  };

  const buildPayload = () => {
    const drivers = form.pessoas.map((driver) => ({
      ...driver,
      data_nascimento: formatToMmDdYyyy(driver.data_nascimento)
    }));

    return {
      ...form,
      data_nascimento: formatToMmDdYyyy(form.data_nascimento),
      data_nascimento_conjuge: formatToMmDdYyyy(form.data_nascimento_conjuge),
      pessoas: drivers
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    
    // Basic validation
    if (!form.nome) {
        setError('Nome é obrigatório.');
        setLoading(false);
        return;
    }

    try {
      const attachments = await Promise.all(
        form.attachments.map(async (file) => {
          return new Promise<{name: string, dataUrl: string}>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ name: file.name, dataUrl: reader.result as string });
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );

      const payload = {
        ...buildPayload(),
        attachments
      };

      // @ts-ignore
      const res = await window.trello?.createCard(payload);
      if (res?.success) {
        setResult(`Card criado: ${res.card?.url || 'Sucesso'}`);
        setForm(initialForm); // Reset form on success
      } else {
        setError(res?.error || 'Erro ao criar card.');
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao criar card.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="rta-section">
        <div className="rta-section-header">
          <span className="rta-section-icon">👤</span>
          <div>
            <h2 className="rta-section-title">Dados do Cliente</h2>
            <p className="rta-section-description">Informações principais do segurado utilizadas na descrição do card.</p>
          </div>
        </div>
        <div className="rta-grid rta-grid-auto gap-4">
          <div className="input-group">
            <label>Estado Civil</label>
            <div className="flex gap-4 flex-wrap">
                {['Solteiro(a)', 'Casado(a)', 'Divorciado(a)'].map(st => (
                    <label key={st} className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="estado_civil" value={st} checked={form.estado_civil === st} onChange={handleChange} className="accent-brand-500" />
                        {st}
                    </label>
                ))}
            </div>
          </div>
          <div className="input-group">
            <label>Gênero</label>
            <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="genero" value="Masculino" checked={form.genero === 'Masculino'} onChange={handleChange} className="accent-brand-500" /> Masculino</label>
                <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="genero" value="Feminino" checked={form.genero === 'Feminino'} onChange={handleChange} className="accent-brand-500" /> Feminino</label>
            </div>
          </div>
          <div className="input-group">
            <label>Nome Completo</label>
            <input name="nome" value={form.nome} onChange={handleChange} className="input-control" placeholder="Nome e sobrenome" required />
          </div>
          <div className="input-group">
            <label>Documento</label>
            <input name="documento" value={form.documento} onChange={handleChange} className="input-control" placeholder="Driver License / CNH" />
          </div>
          <div className="input-group">
            <label>Estado do Documento</label>
            <select name="documento_estado" value={form.documento_estado} onChange={handleChange} className="input-control">
                <option value="">Selecione...</option>
                {US_STATES.map(s => <option key={s.code} value={s.code}>{s.code} - {s.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>Data de Nascimento</label>
            <input name="data_nascimento" type="date" value={form.data_nascimento} onChange={handleChange} className="input-control" />
          </div>
          <div className="input-group md:col-span-2">
            <label>Rua</label>
            <input name="endereco_rua" value={form.endereco_rua} onChange={handleChange} className="input-control" placeholder="Rua / Street" />
          </div>
          <div className="input-group">
            <label>Apt / Suite</label>
            <input name="endereco_apt" value={form.endereco_apt} onChange={handleChange} className="input-control" placeholder="Apt, Suite, etc." />
          </div>
          <div className="input-group">
            <label>Cidade</label>
            <input name="endereco_cidade" value={form.endereco_cidade} onChange={handleChange} className="input-control" placeholder="Cidade" />
          </div>
          <div className="input-group">
            <label>Estado</label>
            <select name="endereco_estado" value={form.endereco_estado} onChange={handleChange} className="input-control">
                <option value="">Selecione...</option>
                {US_STATES.map(s => <option key={s.code} value={s.code}>{s.code} - {s.name}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label>ZIP Code</label>
            <input name="endereco_zipcode" value={form.endereco_zipcode} onChange={handleChange} className="input-control" placeholder="ZIP" />
          </div>
          <div className="input-group">
            <label>Tempo de Seguro</label>
            <select name="tempo_de_seguro" value={form.tempo_de_seguro} onChange={handleChange} className="input-control">
                <option value="">Selecione</option>
                <option value="Menos de 6 meses">Menos de 6 meses</option>
                <option value="6 meses/1 ano">6 meses/1 ano</option>
                <option value="1-3 anos">1-3 anos</option>
                <option value="3-5 anos">3-5 anos</option>
                <option value="5+ anos">5+ anos</option>
            </select>
          </div>
          <div className="input-group">
            <label>Tempo no Endereço</label>
            <select name="tempo_no_endereco" value={form.tempo_no_endereco} onChange={handleChange} className="input-control">
                <option value="">Selecione</option>
                <option value="Menos de 1 ano">Menos de 1 ano</option>
                <option value="Mais de 1 ano">Mais de 1 ano</option>
            </select>
          </div>
        </div>
      </div>

      {form.estado_civil === 'Casado(a)' && (
          <div className="rta-section">
            <div className="rta-section-header">
              <span className="rta-section-icon">💍</span>
              <div>
                <h2 className="rta-section-title">Cônjuge</h2>
                <p className="rta-section-description">Preencha os dados do cônjuge quando o estado civil for Casado(a).</p>
              </div>
            </div>
            <div className="rta-grid rta-grid-auto gap-4">
              <div className="input-group">
                <label>Nome</label>
                <input name="nome_conjuge" value={form.nome_conjuge} onChange={handleChange} className="input-control" />
              </div>
              <div className="input-group">
                <label>Documento</label>
                <input name="documento_conjuge" value={form.documento_conjuge} onChange={handleChange} className="input-control" />
              </div>
              <div className="input-group">
                <label>Data de Nascimento</label>
                <input name="data_nascimento_conjuge" type="date" value={form.data_nascimento_conjuge} onChange={handleChange} className="input-control" />
              </div>
            </div>
          </div>
      )}

      <div className="rta-section">
        <div className="rta-section-header flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="rta-section-icon">🚗</span>
            <div>
                <h2 className="rta-section-title">Veículos</h2>
                <p className="rta-section-description">Adicione todos os veículos relacionados ao cliente.</p>
            </div>
          </div>
          <button type="button" onClick={addVehicle} className="btn-secondary text-sm">
            + Adicionar veículo
          </button>
        </div>
        <div className="space-y-4">
            {form.veiculos.map((vehicle, index) => (
                <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 relative">
                    <div className="flex items-center justify-between mb-4">
                        <h5 className="text-sm font-semibold text-slate-200">Veículo {index + 1}</h5>
                        {form.veiculos.length > 1 && (
                            <button type="button" onClick={() => removeVehicle(index)} className="text-xs text-rose-400 hover:text-rose-300">
                                Remover
                            </button>
                        )}
                    </div>
                    <div className="rta-grid rta-grid-auto gap-4">
                      <div className="input-group">
                        <label>VIN</label>
                        <input value={vehicle.vin} onChange={(e) => handleVehicleChange(index, 'vin', e.target.value)} className="input-control" maxLength={17} placeholder="VIN" />
                        {(vehicle.marca || vehicle.modelo || vehicle.ano) && (
                          <div className="mt-2 text-xs text-slate-400 space-y-1">
                            <div><span className="text-slate-200">Marca:</span> {vehicle.marca}</div>
                            <div><span className="text-slate-200">Modelo:</span> {vehicle.modelo}</div>
                            <div><span className="text-slate-200">Ano:</span> {vehicle.ano}</div>
                          </div>
                        )}
                      </div>
                        <div className="input-group">
                            <label>Placa</label>
                            <input value={vehicle.placa} onChange={(e) => handleVehicleChange(index, 'placa', e.target.value)} className="input-control" placeholder="Placa" />
                        </div>
                        <div className="input-group">
                            <label>Financiado / Pago</label>
                            <select value={vehicle.financiado} onChange={(e) => handleVehicleChange(index, 'financiado', e.target.value)} className="input-control">
                                <option value="">Selecione</option>
                                <option value="Financiado">Financiado</option>
                                <option value="Quitado">Quitado</option>
                            </select>
                        </div>
                        <div className="input-group md:col-span-3">
                            <label>Tempo com o veículo</label>
                            <select value={vehicle.tempo_com_veiculo} onChange={(e) => handleVehicleChange(index, 'tempo_com_veiculo', e.target.value)} className="input-control">
                                <option value="">Selecione</option>
                                <option value="Menos de 6 meses">Menos de 6 meses</option>
                                <option value="6 meses/1 ano">6 meses/1 ano</option>
                                <option value="1-3 anos">1-3 anos</option>
                                <option value="3-5 anos">3-5 anos</option>
                                <option value="5+ anos">5+ anos</option>
                            </select>
                        </div>
                        {/* Hidden fields for compatibility if needed, but user can fill them if we expose them. Old HTML hid them. */}
                        <input type="hidden" value={vehicle.ano} />
                        <input type="hidden" value={vehicle.marca} />
                        <input type="hidden" value={vehicle.modelo} />
                    </div>
                </div>
            ))}
        </div>
      </div>

      <div className="rta-section">
        <div className="rta-section-header flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="rta-section-icon">🧍</span>
            <div>
                <h2 className="rta-section-title">Drivers adicionais</h2>
                <p className="rta-section-description">Cadastre outros condutores relacionados à apólice.</p>
            </div>
          </div>
          <button type="button" onClick={addDriver} className="btn-secondary text-sm">
            + Adicionar driver
          </button>
        </div>
        <div className="space-y-4">
            {form.pessoas.length === 0 && <p className="text-slate-500 text-sm italic">Nenhum motorista adicional.</p>}
            {form.pessoas.map((driver, index) => (
                <div key={index} className="p-4 bg-slate-800/50 rounded-lg border border-slate-700 relative">
                    <div className="flex items-center justify-between mb-4">
                        <h5 className="text-sm font-semibold text-slate-200">Driver adicional</h5>
                        <button type="button" onClick={() => removeDriver(index)} className="text-xs text-rose-400 hover:text-rose-300">
                            Remover
                        </button>
                    </div>
                    <div className="rta-grid rta-grid-auto gap-4">
                        <div className="input-group md:col-span-2">
                            <label>Nome</label>
                            <input value={driver.nome} onChange={(e) => handleDriverChange(index, 'nome', e.target.value)} className="input-control" placeholder="Nome completo" />
                        </div>
                        <div className="input-group">
                            <label>Gênero</label>
                            <div className="flex gap-4 mt-2">
                                <label className="flex items-center gap-2 text-xs cursor-pointer">
                                    <input type="radio" name={`driver_gender_${index}`} value="Masculino" checked={driver.genero === 'Masculino'} onChange={(e) => handleDriverChange(index, 'genero', e.target.value)} className="accent-brand-500" />
                                    Masculino
                                </label>
                                <label className="flex items-center gap-2 text-xs cursor-pointer">
                                    <input type="radio" name={`driver_gender_${index}`} value="Feminino" checked={driver.genero === 'Feminino'} onChange={(e) => handleDriverChange(index, 'genero', e.target.value)} className="accent-brand-500" />
                                    Feminino
                                </label>
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Documento</label>
                            <input value={driver.documento} onChange={(e) => handleDriverChange(index, 'documento', e.target.value)} className="input-control" placeholder="Documento" />
                        </div>
                        <div className="input-group">
                            <label>Data de nascimento</label>
                            <input type="date" value={driver.data_nascimento} onChange={(e) => handleDriverChange(index, 'data_nascimento', e.target.value)} className="input-control" />
                        </div>
                        <div className="input-group">
                            <label>Parentesco</label>
                            <select value={driver.relacao} onChange={(e) => handleDriverChange(index, 'relacao', e.target.value)} className="input-control">
                                <option value="">Selecione</option>
                                <option value="Cônjuge">Cônjuge</option>
                                <option value="Filho(a)">Filho(a)</option>
                                <option value="Pai/Mãe">Pai/Mãe</option>
                                <option value="Outro">Outro</option>
                            </select>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>

      <div className="rta-section">
        <div className="rta-section-header">
          <span className="rta-section-icon">📝</span>
          <div>
            <h2 className="rta-section-title">Observações</h2>
            <p className="rta-section-description">Informações adicionais relevantes para o atendimento.</p>
          </div>
        </div>
        <div className="rta-grid rta-grid-auto gap-4">
            <div className="input-group md:col-span-2">
                <textarea name="observacoes" value={form.observacoes} onChange={handleChange} className="input-control" rows={4} placeholder="Informações adicionais" />
            </div>
        </div>
      </div>

      <div className="rta-section">
        <div className="rta-section-header">
          <span className="rta-section-icon">📎</span>
          <div>
            <h2 className="rta-section-title">Imagens (opcional)</h2>
            <p className="rta-section-description">Selecione imagens para anexar automaticamente ao card.</p>
          </div>
        </div>
        <div className="rta-grid rta-grid-auto gap-4">
            <div className="input-group md:col-span-2">
                <input type="file" multiple accept="image/*" onChange={handleFileChange} className="block w-full text-sm text-slate-200 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700" />
            </div>
        </div>
      </div>

      <div className="flex gap-4 mt-6 items-center">
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Criando…' : 'Criar card no Trello'}</button>
        <button type="button" className="btn-secondary" onClick={() => setForm(initialForm)}>Limpar</button>
        {result && <div className="text-emerald-400 font-semibold text-sm">{result}</div>}
        {error && <div className="text-rose-400 font-semibold text-sm">{error}</div>}
      </div>
    </form>
  );
};
