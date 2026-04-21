import { useState } from 'react';
import { api, downloadFile } from '../../api/client';
import { Field, FormSection, SelectInput, TextInput } from '../../components/Field';

type RtaFormData = {
  transaction_type: string;
  insurance_company: string;
  purchase_date: string;
  insurance_effective_date: string;
  insurance_policy_change_date: string;
  vehicle_title_status: string;
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
};

const initialForm: RtaFormData = {
  transaction_type: 'Reg and Title a Vehicle',
  insurance_company: 'allstate',
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
  color: ''
};

const transactions = [
  'Reg and Title a Vehicle',
  'Transfer Plate',
  'Reinstate Reg',
  'Apply for salvage title',
  'Apply for title',
  'Registration only',
  'Transfer plate',
  'Register prev title',
  'Title prev reg vehicle',
  'Transfer vehicle to spouse',
  'Change plate',
  'Renew reg'
];

export function RtaForm() {
  const [form, setForm] = useState<RtaFormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const isFinanced = form.vehicle_title_status === 'financed' || form.vehicle_title_status === 'leased';

  const update = (name: keyof RtaFormData, value: string) => setForm((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await api.post<{ downloadUrl: string; filename: string }>('/rta/generate', form);
      downloadFile(result.downloadUrl, result.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar RTA.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="tool-form" onSubmit={handleSubmit}>
      <section className="command-band">
        <div>
          <p className="eyebrow">PDF oficial</p>
          <h2>Gerar RTA pelo navegador</h2>
          <p>O backend preenche o template da seguradora e devolve um download seguro.</p>
        </div>
        <button className="primary-button" disabled={loading} type="submit">{loading ? 'Gerando...' : 'Gerar PDF'}</button>
      </section>

      <FormSection title="Operacao">
        <Field label="Tipo" wide><SelectInput value={form.transaction_type} onChange={(event) => update('transaction_type', event.target.value)}>{transactions.map((item) => <option key={item}>{item}</option>)}</SelectInput></Field>
        <Field label="Seguradora"><SelectInput value={form.insurance_company} onChange={(event) => update('insurance_company', event.target.value)}><option value="allstate">Allstate</option><option value="progressive">Progressive</option><option value="geico">Geico</option><option value="liberty">Liberty</option></SelectInput></Field>
        <Field label="Status"><SelectInput value={form.vehicle_title_status} onChange={(event) => update('vehicle_title_status', event.target.value)}><option value="paid_off">Quitado</option><option value="financed">Financiado</option><option value="leased">Leased</option></SelectInput></Field>
      </FormSection>

      <FormSection title="Veiculo">
        <Field label="VIN"><TextInput maxLength={17} value={form.vin} onChange={(event) => update('vin', event.target.value.toUpperCase())} /></Field>
        <Field label="Body style"><TextInput value={form.body_style} onChange={(event) => update('body_style', event.target.value)} /></Field>
        <Field label="Ano"><TextInput value={form.year} onChange={(event) => update('year', event.target.value)} /></Field>
        <Field label="Marca"><TextInput value={form.make} onChange={(event) => update('make', event.target.value)} /></Field>
        <Field label="Modelo"><TextInput value={form.model} onChange={(event) => update('model', event.target.value)} /></Field>
        <Field label="Cor"><SelectInput value={form.color} onChange={(event) => update('color', event.target.value)}><option value="">Selecione</option>{['Black','White','Brown','Blue','Yellow','Gray','Purple','Green','Orange','Red','Silver','Gold'].map((color) => <option key={color}>{color}</option>)}</SelectInput></Field>
        <Field label="Cilindros"><TextInput value={form.cylinders} onChange={(event) => update('cylinders', event.target.value)} /></Field>
        <Field label="Passageiros"><TextInput value={form.passengers} onChange={(event) => update('passengers', event.target.value)} /></Field>
        <Field label="Portas"><TextInput value={form.doors} onChange={(event) => update('doors', event.target.value)} /></Field>
        <Field label="Odometro"><TextInput value={form.odometer} onChange={(event) => update('odometer', event.target.value)} /></Field>
      </FormSection>

      <FormSection title="Titulo e seguro">
        <Field label="Titulo anterior"><TextInput value={form.previous_title_number} onChange={(event) => update('previous_title_number', event.target.value)} /></Field>
        <Field label="Estado titulo"><TextInput maxLength={2} value={form.previous_title_state} onChange={(event) => update('previous_title_state', event.target.value.toUpperCase())} /></Field>
        <Field label="Pais titulo"><TextInput value={form.previous_title_country} onChange={(event) => update('previous_title_country', event.target.value)} /></Field>
        <Field label="Compra"><TextInput type="date" value={form.purchase_date} onChange={(event) => update('purchase_date', event.target.value)} /></Field>
        <Field label="Inicio seguro"><TextInput type="date" value={form.insurance_effective_date} onChange={(event) => update('insurance_effective_date', event.target.value)} /></Field>
        <Field label="Alteracao"><TextInput type="date" value={form.insurance_policy_change_date} onChange={(event) => update('insurance_policy_change_date', event.target.value)} /></Field>
      </FormSection>

      {isFinanced ? (
        <FormSection title="Lienholder">
          <Field label="Lien code"><TextInput value={form.lienholder_code} onChange={(event) => update('lienholder_code', event.target.value)} /></Field>
          <Field label="Instituicao"><TextInput value={form.lienholder_name} onChange={(event) => update('lienholder_name', event.target.value)} /></Field>
          <Field label="Endereco" wide><TextInput value={form.lienholder_address} onChange={(event) => update('lienholder_address', event.target.value)} /></Field>
        </FormSection>
      ) : null}

      <FormSection title="Cliente">
        <Field label="Nome completo"><TextInput value={form.owner_name} onChange={(event) => update('owner_name', event.target.value)} /></Field>
        <Field label="Nascimento"><TextInput type="date" value={form.owner_dob} onChange={(event) => update('owner_dob', event.target.value)} /></Field>
        <Field label="Licenca/ID/SSN"><TextInput value={form.owner_license} onChange={(event) => update('owner_license', event.target.value)} /></Field>
        <Field label="Rua"><TextInput value={form.owner_street} onChange={(event) => update('owner_street', event.target.value)} /></Field>
        <Field label="Cidade"><TextInput value={form.owner_city} onChange={(event) => update('owner_city', event.target.value)} /></Field>
        <Field label="Estado"><TextInput maxLength={2} value={form.owner_state} onChange={(event) => update('owner_state', event.target.value.toUpperCase())} /></Field>
        <Field label="ZIP"><TextInput value={form.owner_zipcode} onChange={(event) => update('owner_zipcode', event.target.value)} /></Field>
      </FormSection>

      <FormSection title="Vendedor">
        <Field label="Nome"><TextInput value={form.seller_name} onChange={(event) => update('seller_name', event.target.value)} /></Field>
        <Field label="Rua"><TextInput value={form.seller_street} onChange={(event) => update('seller_street', event.target.value)} /></Field>
        <Field label="Cidade"><TextInput value={form.seller_city} onChange={(event) => update('seller_city', event.target.value)} /></Field>
        <Field label="Estado"><TextInput maxLength={2} value={form.seller_state} onChange={(event) => update('seller_state', event.target.value.toUpperCase())} /></Field>
        <Field label="ZIP"><TextInput value={form.seller_zipcode} onChange={(event) => update('seller_zipcode', event.target.value)} /></Field>
        <Field label="Preco bruto"><TextInput value={form.gross_sale_price} onChange={(event) => update('gross_sale_price', event.target.value)} /></Field>
      </FormSection>

      <div className="result-line">
        {error ? <span className="form-error">{error}</span> : null}
      </div>
    </form>
  );
}
