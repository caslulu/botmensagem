import React, { useState } from 'react';

interface RtaFormData {
  transaction_type: string;
  insurance_company: string;
  purchase_date: string;
  insurance_effective_date: string;
  insurance_policy_change_date: string;
  vehicle_title_status: 'paid_off' | 'financed' | 'leased';
  seller_name: string;
  seller_street: string;
  seller_city: string;
  seller_state: string;
  seller_zipcode: string;
  gross_sale_price: string;
  owner_name: string;
  owner_dob: string;
  owner_license: string;
  owner_street: string;
  owner_city: string;
  owner_state: string;
  owner_zipcode: string;
  vin: string;
  body_style: string;
  year: string;
  make: string;
  model: string;
  cylinders: string;
  passengers: string;
  doors: string;
  odometer: string;
  previous_title_number: string;
  previous_title_state: string;
  previous_title_country: string;
  lienholder_code: string;
  lienholder_name: string;
  lienholder_address: string;
  color: string;
}

const initialForm: RtaFormData = {
  transaction_type: 'Reg and Title a Vehicle',
  insurance_company: '',
  purchase_date: '',
  insurance_effective_date: '',
  insurance_policy_change_date: '',
  vehicle_title_status: 'paid_off',
  seller_name: '',
  seller_street: '',
  seller_city: '',
  seller_state: '',
  seller_zipcode: '',
  gross_sale_price: '',
  owner_name: '',
  owner_dob: '',
  owner_license: '',
  owner_street: '',
  owner_city: '',
  owner_state: '',
  owner_zipcode: '',
  vin: '',
  body_style: '',
  year: '',
  make: '',
  model: '',
  cylinders: '',
  passengers: '',
  doors: '',
  odometer: '',
  previous_title_number: '',
  previous_title_state: '',
  previous_title_country: '',
  lienholder_code: '',
  lienholder_name: '',
  lienholder_address: '',
  color: '',
};

export const RtaForm: React.FC = () => {
  const [form, setForm] = useState<RtaFormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // @ts-ignore
      const res = await window.rta?.generate(form);
      if (res?.success) {
        setResult(`RTA gerado: ${res.output?.path || 'Arquivo salvo.'}`);
      } else {
        setError(res?.error || 'Erro ao gerar RTA.');
      }
    } catch (e: any) {
      setError(e?.message || 'Erro ao gerar RTA.');
    } finally {
      setLoading(false);
    }
  };

  const isFinanced = form.vehicle_title_status === 'financed' || form.vehicle_title_status === 'leased';

  return (
    <form className="rta-form space-y-6" onSubmit={handleSubmit}>
      {/* Section 1: Transaction Type */}
      <section className="rta-section">
        <div className="rta-section-header">
          <div className="rta-section-icon">📋</div>
          <div>
            <h4 className="rta-section-title">Tipo de Transação</h4>
            <p className="rta-section-description">Selecione o tipo de operação que deseja realizar.</p>
          </div>
        </div>
        <div className="rta-grid rta-grid-auto">
          <div className="input-group">
            <label htmlFor="transaction_type">I want to:</label>
            <select id="transaction_type" name="transaction_type" value={form.transaction_type} onChange={handleChange} className="input-control">
              <option value="Reg and Title a Vehicle">Register and title a vehicle</option>
              <option value="Transfer Plate">Transfer plate to a new vehicle</option>
              <option value="Reinstate Reg">Reinstate a registration</option>
              <option value="Apply for salvage title">Apply for a salvage title</option>
              <option value="Apply for title">Apply for a title only</option>
              <option value="Registration only">Apply for a registration only</option>
              <option value="Transfer plate">Transfer a plate between two vehicles</option>
              <option value="Register prev title">Register previously titled vehicle</option>
              <option value="Title prev reg vehicle">Title previously registered vehicle</option>
              <option value="Transfer vehicle to spouse">Transfer vehicle to surviving spouse</option>
              <option value="Change plate">Change plate on existing vehicle with no amendments</option>
              <option value="Renew reg">Renew a registration</option>
            </select>
          </div>
        </div>
      </section>

      {/* Section 2: Insurance Company */}
      <section className="rta-section">
        <div className="rta-section-header">
          <div className="rta-section-icon">🛡️</div>
          <div>
            <h4 className="rta-section-title">Seguradora</h4>
            <p className="rta-section-description">Escolha a seguradora responsável antes de preencher os demais dados.</p>
          </div>
        </div>
        <div className="rta-grid rta-grid-auto">
          <div className="input-group">
            <label htmlFor="insurance_company">Seguradora</label>
            <select id="insurance_company" name="insurance_company" value={form.insurance_company} onChange={handleChange} className="input-control">
              <option value="">Selecione</option>
              <option value="allstate">Allstate</option>
              <option value="progressive">Progressive</option>
              <option value="geico">Geico</option>
              <option value="liberty">Liberty</option>
            </select>
          </div>
        </div>
      </section>

      {/* Section 3: Vehicle */}
      <section className="rta-section">
        <div className="rta-section-header">
          <div className="rta-section-icon">🚗</div>
          <div>
            <h4 className="rta-section-title">Veículo</h4>
            <p className="rta-section-description">Detalhes do veículo exatamente na mesma sequência do sistema legado.</p>
          </div>
        </div>
        <div className="rta-grid rta-grid-compact gap-4">
          <div className="input-group">
            <label>VIN</label>
            <input name="vin" value={form.vin} onChange={handleChange} maxLength={17} className="input-control" placeholder="17 caracteres" />
          </div>
          <div className="input-group">
            <label>Body Style</label>
            <input name="body_style" value={form.body_style} onChange={handleChange} className="input-control" placeholder="Ex: Sedan" />
          </div>
          <div className="input-group">
            <label>Ano</label>
            <input name="year" type="number" value={form.year} onChange={handleChange} className="input-control" placeholder="Ex: 2024" />
          </div>
          <div className="input-group">
            <label>Marca</label>
            <input name="make" value={form.make} onChange={handleChange} className="input-control" placeholder="Ex: Toyota" />
          </div>
          <div className="input-group">
            <label>Modelo</label>
            <input name="model" value={form.model} onChange={handleChange} className="input-control" placeholder="Ex: Corolla" />
          </div>
          <div className="input-group">
            <label>Cor</label>
            <select name="color" value={form.color} onChange={handleChange} className="input-control">
              <option value="">Selecione</option>
              <option>Black</option>
              <option>White</option>
              <option>Brown</option>
              <option>Blue</option>
              <option>Yellow</option>
              <option>Gray</option>
              <option>Purple</option>
              <option>Green</option>
              <option>Orange</option>
              <option>Red</option>
              <option>Silver</option>
              <option>Gold</option>
            </select>
          </div>
          <div className="input-group">
            <label>Cilindros</label>
            <input name="cylinders" type="number" value={form.cylinders} onChange={handleChange} className="input-control" placeholder="Ex: 4" />
          </div>
          <div className="input-group">
            <label>Passageiros</label>
            <input name="passengers" type="number" value={form.passengers} onChange={handleChange} className="input-control" placeholder="Ex: 5" />
          </div>
          <div className="input-group">
            <label>Portas</label>
            <input name="doors" type="number" value={form.doors} onChange={handleChange} className="input-control" placeholder="Ex: 4" />
          </div>
          <div className="input-group">
            <label>Odômetro em milhas</label>
            <input name="odometer" type="number" step="0.1" value={form.odometer} onChange={handleChange} className="input-control" placeholder="Ex: 25000" />
          </div>
        </div>
      </section>

      {/* Section 4: Title and Insurance */}
      <section className="rta-section">
        <div className="rta-section-header">
          <div className="rta-section-icon">📝</div>
          <div>
            <h4 className="rta-section-title">Título e Seguro</h4>
            <p className="rta-section-description">Agrupe os dados do título anterior e das datas do seguro antes de gerar o PDF.</p>
          </div>
        </div>
        
        <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">Status do veículo em relação ao título</label>
            <div className="flex gap-4 flex-wrap">
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="vehicle_title_status" value="financed" checked={form.vehicle_title_status === 'financed'} onChange={handleChange} className="accent-brand-500" />
                    Financiado
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="vehicle_title_status" value="paid_off" checked={form.vehicle_title_status === 'paid_off'} onChange={handleChange} className="accent-brand-500" />
                    Quitado
                </label>
            </div>
        </div>

        <div className="space-y-6">
            {/* Previous Title */}
            <div className="rta-subsection">
                <h5 className="text-sm font-semibold text-slate-200 mb-3">Título anterior</h5>
                <div className="rta-grid rta-grid-auto gap-4">
                    <div className="input-group">
                        <label>Número</label>
                        <input name="previous_title_number" value={form.previous_title_number} onChange={handleChange} className="input-control" placeholder="Ex: CN539192" />
                    </div>
                    <div className="input-group">
                        <label>Estado</label>
                        <input name="previous_title_state" maxLength={2} value={form.previous_title_state} onChange={handleChange} className="input-control" placeholder="Ex: MA" />
                    </div>
                    <div className="input-group">
                        <label>País</label>
                        <input name="previous_title_country" value={form.previous_title_country} onChange={handleChange} className="input-control" placeholder="Ex: USA" />
                    </div>
                </div>
            </div>

            {/* Lienholder (if financed) */}
            {isFinanced && (
                <div className="rta-subsection">
                    <h5 className="text-sm font-semibold text-slate-200 mb-3">Informações do Financiamento (Lienholder)</h5>
                    <div className="rta-grid rta-grid-auto gap-4">
                        <div className="input-group">
                            <label>Lien Code</label>
                            <input name="lienholder_code" value={form.lienholder_code} onChange={handleChange} className="input-control" placeholder="Ex: C01234" />
                        </div>
                        <div className="input-group">
                            <label>Nome da Instituição</label>
                            <input name="lienholder_name" value={form.lienholder_name} onChange={handleChange} className="input-control" placeholder="Ex: Bank of America" />
                        </div>
                        <div className="input-group">
                            <label>Endereço</label>
                            <input name="lienholder_address" value={form.lienholder_address} onChange={handleChange} className="input-control" placeholder="Ex: 123 Bank St" />
                        </div>
                    </div>
                </div>
            )}

            {/* Insurance Dates */}
            <div className="rta-subsection">
                <h5 className="text-sm font-semibold text-slate-200 mb-3">Seguro e datas</h5>
                <div className="rta-grid rta-grid-auto gap-4">
                    <div className="input-group">
                        <label>Data de compra</label>
                        <input name="purchase_date" type="date" value={form.purchase_date} onChange={handleChange} className="input-control" />
                    </div>
                    <div className="input-group">
                        <label>Início da vigência</label>
                        <input name="insurance_effective_date" type="date" value={form.insurance_effective_date} onChange={handleChange} className="input-control" />
                    </div>
                    <div className="input-group">
                        <label>Data de alteração</label>
                        <input name="insurance_policy_change_date" type="date" value={form.insurance_policy_change_date} onChange={handleChange} className="input-control" />
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* Section 5: Client */}
      <section className="rta-section">
        <div className="rta-section-header">
          <div className="rta-section-icon">👤</div>
          <div>
            <h4 className="rta-section-title">Cliente</h4>
            <p className="rta-section-description">Preencha o bloco do cliente seguindo a ordem do RTA web original.</p>
          </div>
        </div>
        <div className="rta-grid rta-grid-wide gap-4">
          <div className="input-group">
            <label>Nome completo</label>
            <input name="owner_name" value={form.owner_name} onChange={handleChange} className="input-control" placeholder="Sobrenome, Nome, Nome do meio" />
          </div>
          <div className="input-group">
            <label>Nascimento</label>
            <input name="owner_dob" type="date" value={form.owner_dob} onChange={handleChange} className="input-control" />
          </div>
          <div className="input-group">
            <label>Licença / ID / SSN</label>
            <input name="owner_license" value={form.owner_license} onChange={handleChange} className="input-control" placeholder="Documento do cliente" />
          </div>
          <div className="input-group">
            <label>Rua</label>
            <input name="owner_street" value={form.owner_street} onChange={handleChange} className="input-control" placeholder="Ex: 456 Oak Ave" />
          </div>
          <div className="input-group">
            <label>Cidade</label>
            <input name="owner_city" value={form.owner_city} onChange={handleChange} className="input-control" placeholder="Ex: Miami" />
          </div>
          <div className="input-group">
            <label>Estado</label>
            <input name="owner_state" maxLength={2} value={form.owner_state} onChange={handleChange} className="input-control" placeholder="Ex: FL" />
          </div>
          <div className="input-group">
            <label>CEP/ZIP</label>
            <input name="owner_zipcode" value={form.owner_zipcode} onChange={handleChange} className="input-control" placeholder="Ex: 33101" />
          </div>
        </div>
      </section>

      {/* Section 6: Seller */}
      <section className="rta-section">
        <div className="rta-section-header">
          <div className="rta-section-icon">🏪</div>
          <div>
            <h4 className="rta-section-title">Vendedor</h4>
            <p className="rta-section-description">Informe os dados do vendedor exatamente como no formulário legado.</p>
          </div>
        </div>
        <div className="rta-grid rta-grid-wide gap-4">
          <div className="input-group">
            <label>Nome completo</label>
            <input name="seller_name" value={form.seller_name} onChange={handleChange} className="input-control" placeholder="Ex: Nome completo" />
          </div>
          <div className="input-group">
            <label>Rua</label>
            <input name="seller_street" value={form.seller_street} onChange={handleChange} className="input-control" placeholder="Ex: 123 Main St" />
          </div>
          <div className="input-group">
            <label>Cidade</label>
            <input name="seller_city" value={form.seller_city} onChange={handleChange} className="input-control" placeholder="Ex: Boston" />
          </div>
          <div className="input-group">
            <label>Estado</label>
            <input name="seller_state" maxLength={2} value={form.seller_state} onChange={handleChange} className="input-control" placeholder="Ex: MA" />
          </div>
          <div className="input-group">
            <label>CEP/ZIP</label>
            <input name="seller_zipcode" value={form.seller_zipcode} onChange={handleChange} className="input-control" placeholder="Ex: 02101" />
          </div>
          <div className="input-group">
            <label>Preço bruto</label>
            <input name="gross_sale_price" type="number" step="0.01" value={form.gross_sale_price} onChange={handleChange} className="input-control" placeholder="Ex: 25000.00" />
          </div>
        </div>
      </section>

      <div className="flex gap-4 mt-6 items-center">
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Gerando…' : 'Gerar PDF'}</button>
        <button type="button" className="btn-secondary" onClick={() => setForm(initialForm)}>Limpar</button>
        {result && <div className="text-emerald-400 font-semibold text-sm">{result}</div>}
        {error && <div className="text-rose-400 font-semibold text-sm">{error}</div>}
      </div>
    </form>
  );
};
