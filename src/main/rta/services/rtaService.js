// Serviço RTA - Preenchimento de PDF usando pdf-lib e templates

const path = require('path');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');

class RtaService {
    constructor() {
        // estrutura simplificada: assets ficam em ../assets
        const currentDir = __dirname;
        this.assetsDir = path.resolve(currentDir, '../assets');
        this.templates = {
            allstate: path.join(this.assetsDir, 'rta_template_allstate.pdf'),
            progressive: path.join(this.assetsDir, 'rta_template_progressive.pdf'),
            geico: path.join(this.assetsDir, 'rta_template_geico.pdf'),
            liberty: path.join(this.assetsDir, 'rta_template_liberty.pdf')
        };
        this.outputDir = path.resolve(process.cwd(), 'data', 'rta', 'output');
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    getTemplatePath(insuranceCompany) {
        const key = (insuranceCompany || 'allstate').toLowerCase();
        const template = this.templates[key] || this.templates.allstate;
        return template;
    }

    _formatDate(dateValue) {
        if (!dateValue) return '';
        try {
            if (dateValue instanceof Date) {
                const mm = String(dateValue.getMonth() + 1).padStart(2, '0');
                const dd = String(dateValue.getDate()).padStart(2, '0');
                const yyyy = dateValue.getFullYear();
                return `${mm}/${dd}/${yyyy}`;
            }
            if (typeof dateValue === 'string') {
                // tenta Y-m-d, d/m/Y, m/d/Y
                const tryParsers = [
                    (s) => {
                        const m = s.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
                        if (!m) return null;
                        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
                    },
                    (s) => {
                        const m = s.match(/^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/);
                        if (!m) return null;
                        // ambiguo; tentar como d/m/Y primeiro, depois m/d/Y
                        const d1 = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
                        if (!isNaN(d1.getTime())) return d1;
                        const d2 = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
                        return isNaN(d2.getTime()) ? null : d2;
                    }
                ];
                for (const p of tryParsers) {
                    const dt = p(dateValue);
                    if (dt && !isNaN(dt.getTime())) {
                        const mm = String(dt.getMonth() + 1).padStart(2, '0');
                        const dd = String(dt.getDate()).padStart(2, '0');
                        const yyyy = dt.getFullYear();
                        return `${mm}/${dd}/${yyyy}`;
                    }
                }
            }
            return '';
        } catch (_) {
            return '';
        }
    }

    _isColor(selectedColor, targetColor) {
        return (selectedColor || '').toLowerCase() === (targetColor || '').toLowerCase();
    }

    async preencherRtaAndSave(data) {
        const insuranceCompany = data?.insurance_company || data?.seguradora || 'allstate';
        const templatePath = this.getTemplatePath(insuranceCompany);
        if (!fs.existsSync(templatePath)) {
            throw new Error(`Template não encontrado: ${templatePath}`);
        }

        const pdfBytes = fs.readFileSync(templatePath);
        const pdfDoc = await PDFDocument.load(pdfBytes, { updateFieldAppearances: true });
        const form = pdfDoc.getForm();

        const campos = {
            '(L1) Seller name (Please print)': String(data.seller_name || ''),
            '(L2) (Seller) Address': String(data.seller_street || ''),
            '(L2) (Seller) City': String(data.seller_city || ''),
            '(L2) (Seller) State': String(data.seller_state || ''),
            '(L2) (Seller) Zip Code': String(data.seller_zipcode || ''),
            '(I3) Gross Sale Price (Proof Required)': String(data.gross_sale_price || ''),
            '(J1) Purchase Date': this._formatDate(data.purchase_date || ''),
            '(K3) Effective Date of Insurance': this._formatDate(data.insurance_effective_date || ''),
            '(K5) Policy Change Date': this._formatDate(data.insurance_policy_change_date || ''),
            "(D2) (First Owner's) Name (Last, First, Middle)": String(data.owner_name || ''),
            '(D3) (Owner 1) Date of Birth (MM [Month]/DD [Day]/YYYY[Year])': this._formatDate(data.owner_dob || ''),
            '(D4) (Owner 1) License Number/ ID (Identification) Number / SSN (Social Security Number)': String(data.owner_license || ''),
            '(D5) (Owner 1) Residential Address': String(data.owner_street || ''),
            '(D5) (Owner 1) City': String(data.owner_city || ''),
            '(D5) (Owner 1) State': String(data.owner_state || ''),
            '(D5) (Owner 1) Zip Code': String(data.owner_zipcode || ''),
            '(G1) (Garaging) Address': String(data.owner_street || ''),
            '(G1) (Garaging Address) City': String(data.owner_city || ''),
            '(G1) (Garaging Address) State': String(data.owner_state || ''),
            '(G1) (Garaging Address) Zip Code': String(data.owner_zipcode || ''),
            '(B1) Vehicle Identification Number (VIN)': String(data.vin || ''),
            '(B2) Body Style': String(data.body_style || ''),
            '(B5) Vehicle Year': String(data.year || ''),
            '(B5) (Vehicle) Make': String(data.make || ''),
            '(B5) (Vehicle) Model': String(data.model || ''),
            '(B7) Number of cylinders': String(data.cylinders || ''),
            '(B7) Number of passengers': String(data.passengers || ''),
            '(B7) Number of doors': String(data.doors || ''),
            '(B9) Odometer (Miles)': String(data.odometer || ''),
            '(C3) Previous title number': String(data.previous_title_number || ''),
            '(C3) Previous title state': String(data.previous_title_state || ''),
            '(C3) Previous title country': String(data.previous_title_country || '')
        };

        // Preencher textos
        for (const [fieldName, value] of Object.entries(campos)) {
            try {
                const field = form.getFieldMaybe?.(fieldName) || (() => { try { return form.getTextField(fieldName);} catch {return null;} })();
                if (field && field.setText) {
                    field.setText(String(value ?? ''));
                }
            } catch (e) {
                try {
                    const anyField = form.getField(fieldName);
                    if (anyField.setText) anyField.setText(String(value ?? ''));
                } catch {}
            }
        }

        // Checkboxes de cores
        const colors = ['Black','White','Brown','Blue','Yellow','Gray','Purple','Green','Orange','Red','Silver','Gold'];
        const chosen = String(data.color || '').trim();
        for (const color of colors) {
            const nameVariants = [
                `(B4) ${color}`,
                color === 'White' || color === 'Purple' ? `(B4 ) ${color}` : null
            ].filter(Boolean);
            for (const fname of nameVariants) {
                try {
                    const field = form.getFieldMaybe?.(fname) || (() => { try { return form.getCheckBox(fname);} catch {return null;} })();
                    if (field && field.check && field.uncheck) {
                        if (this._isColor(chosen, color)) field.check(); else field.uncheck();
                    }
                } catch {
                    try {
                        const anyField = form.getField(fname);
                        if (anyField && anyField.check && anyField.uncheck) {
                            if (this._isColor(chosen, color)) anyField.check(); else anyField.uncheck();
                        }
                    } catch {}
                }
            }
        }

        try { form.updateFieldAppearances(); } catch {}

        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const outPath = path.join(this.outputDir, `rta-${insuranceCompany}-${ts}.pdf`);
        const outBytes = await pdfDoc.save();
        fs.writeFileSync(outPath, outBytes);

        return { path: outPath, template: templatePath };
    }
}

module.exports = new RtaService();
