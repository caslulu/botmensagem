import path from 'path';
import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { app } from 'electron';

type RtaInput = Record<string, unknown> & {
    insurance_company?: string;
    seguradora?: string;
    seller_name?: string;
    seller_street?: string;
    seller_city?: string;
    seller_state?: string;
    seller_zipcode?: string;
    gross_sale_price?: string;
    purchase_date?: string;
    insurance_effective_date?: string;
    insurance_policy_change_date?: string;
    owner_name?: string;
    owner_dob?: string;
    owner_license?: string;
    owner_street?: string;
    owner_city?: string;
    owner_state?: string;
    owner_zipcode?: string;
    vin?: string;
    body_style?: string;
    year?: string;
    make?: string;
    model?: string;
    cylinders?: string;
    passengers?: string;
    doors?: string;
    odometer?: string;
    previous_title_number?: string;
    previous_title_state?: string;
    previous_title_country?: string;
    lienholder_code?: string;
    lienholder_name?: string;
    lienholder_address?: string;
    color?: string;
    transaction_type?: string;
};

function ensureFolder(dirPath: string) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

class RtaService {
    private assetsDir: string;
    private templates: Record<string, string>;
    private outputDir: string;

    constructor() {
        const isPackaged = app && app.isPackaged;
        if (!isPackaged) {
            this.assetsDir = path.resolve(__dirname, '../assets');
        } else {
            const possiblePaths = [
                path.join(process.resourcesPath, 'app.asar.unpacked', 'src', 'main', 'rta', 'assets'),
                path.join(process.resourcesPath, 'src', 'main', 'rta', 'assets'),
                path.join(path.dirname(process.execPath), 'resources', 'app.asar.unpacked', 'src', 'main', 'rta', 'assets'),
                path.join(path.dirname(process.execPath), 'resources', 'src', 'main', 'rta', 'assets')
            ];

            this.assetsDir = possiblePaths.find((p) => fs.existsSync(p)) || possiblePaths[0];
            if (!fs.existsSync(this.assetsDir)) {
                console.error('[RtaService] Assets não encontrados. Caminhos testados:', possiblePaths);
            } else {
                console.log('[RtaService] Assets encontrados em:', this.assetsDir);
            }
        }

        this.templates = {
            allstate: path.join(this.assetsDir, 'rta_template_allstate.pdf'),
            progressive: path.join(this.assetsDir, 'rta_template_progressive.pdf'),
            geico: path.join(this.assetsDir, 'rta_template_geico.pdf'),
            liberty: path.join(this.assetsDir, 'rta_template_liberty.pdf')
        };

        this.outputDir = app.getPath('downloads');
        ensureFolder(this.outputDir);
    }

    getTemplatePath(insuranceCompany?: string): string {
        const key = (insuranceCompany || 'allstate').toLowerCase();
        return this.templates[key] || this.templates.allstate;
    }

    private _formatDate(dateValue: unknown): string {
        if (!dateValue) return '';
        try {
            if (dateValue instanceof Date) {
                const mm = String(dateValue.getMonth() + 1).padStart(2, '0');
                const dd = String(dateValue.getDate()).padStart(2, '0');
                const yyyy = dateValue.getFullYear();
                return `${mm}/${dd}/${yyyy}`;
            }
            if (typeof dateValue === 'string') {
                const tryParsers = [
                    (s: string) => {
                        const m = s.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
                        if (!m) return null;
                        return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
                    },
                    (s: string) => {
                        const m = s.match(/^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/);
                        if (!m) return null;
                        const d1 = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
                        if (!Number.isNaN(d1.getTime())) return d1;
                        const d2 = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
                        return Number.isNaN(d2.getTime()) ? null : d2;
                    }
                ];
                for (const parser of tryParsers) {
                    const dt = parser(dateValue);
                    if (dt && !Number.isNaN(dt.getTime())) {
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

    private _isColor(selectedColor: string | undefined, targetColor: string): boolean {
        return (selectedColor || '').toLowerCase() === (targetColor || '').toLowerCase();
    }

    async preencherRtaAndSave(data: RtaInput) {
        let pdfDoc: PDFDocument | null = null;
        let pdfBytes: Uint8Array | null = null;
        let outBytes: Uint8Array | null = null;

        try {
            const insuranceCompany = data?.insurance_company || data?.seguradora || 'allstate';
            const templatePath = this.getTemplatePath(insuranceCompany);
            if (!fs.existsSync(templatePath)) {
                console.error('[RtaService] Template não encontrado:', templatePath);
                console.error('[RtaService] assetsDir:', this.assetsDir);
                console.error('[RtaService] Insurance company:', insuranceCompany);
                if (fs.existsSync(this.assetsDir)) {
                    console.error('[RtaService] Conteúdo do diretório assets:', fs.readdirSync(this.assetsDir));
                } else {
                    console.error('[RtaService] Diretório assets não existe:', this.assetsDir);
                }
                throw new Error(`Template não encontrado: ${templatePath}`);
            }

            pdfBytes = fs.readFileSync(templatePath);
            pdfDoc = await PDFDocument.load(pdfBytes, { updateFieldAppearances: true } as any);
            const form = pdfDoc.getForm();

            const campos: Record<string, string> = {
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
                '(D3) (Owner 1) Date of Birth (MM [Month]/DD [Day]/YYYY[Year])': String(data.owner_dob || ''),
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
                '(C3) Previous title country': String(data.previous_title_country || ''),
                '(Lienholder) 1st (First) Lien Code': String(data.lienholder_code || ''),
                '(Lienholder) (First Lien Code) Name': String(data.lienholder_name || ''),
                '(Lienholder) (First Lien Code) Address': String(data.lienholder_address || '')
            };

            for (const [fieldName, value] of Object.entries(campos)) {
                try {
                    const field = (form as any).getFieldMaybe?.(fieldName) || (() => { try { return form.getTextField(fieldName);} catch {return null;} })();
                    if (field && field.setText) {
                        field.setText(String(value ?? ''));
                    }
                } catch (e) {
                    try {
                        const anyField = form.getField(fieldName);
                        if ((anyField as any).setText) (anyField as any).setText(String(value ?? ''));
                    } catch {}
                }
            }

            const colors = ['Black','White','Brown','Blue','Yellow','Gray','Purple','Green','Orange','Red','Silver','Gold'];
            const chosen = String(data.color || '').trim();
            for (const color of colors) {
                const nameVariants = [
                    `(B4) ${color}`,
                    color === 'White' || color === 'Purple' ? `(B4 ) ${color}` : null
                ].filter(Boolean) as string[];
                for (const fname of nameVariants) {
                    try {
                        const field = (form as any).getFieldMaybe?.(fname) || (() => { try { return form.getCheckBox(fname);} catch {return null;} })();
                        if (field && field.check && field.uncheck) {
                            if (this._isColor(chosen, color)) field.check(); else field.uncheck();
                        }
                    } catch {
                        try {
                            const anyField = form.getField(fname);
                            if ((anyField as any).check && (anyField as any).uncheck) {
                                if (this._isColor(chosen, color)) (anyField as any).check(); else (anyField as any).uncheck();
                            }
                        } catch {}
                    }
                }
            }

            const transactionType = (data as RtaInput).transaction_type;
            if (transactionType) {
                try {
                    const transactionFields = [
                        'Reg and Title a Vehicle', 'Transfer Plate', 'Reinstate Reg', 'Apply for salvage title',
                        'Apply for title', 'Registration only', 'Transfer plate', 'Register prev title',
                        'Title prev reg vehicle', 'Transfer vehicle to spouse', 'Change plate', 'Renew reg'
                    ];

                    for (const fieldName of transactionFields) {
                        try {
                            const field = form.getCheckBox(fieldName);
                            if (field) field.uncheck();
                        } catch {}
                    }

                    const checkbox = form.getCheckBox(transactionType);
                    if (checkbox) checkbox.check();
                } catch (e) {
                    console.error(`[RtaService] Failed to check transaction type: ${transactionType}`, e);
                }
            }

            try { form.updateFieldAppearances(); } catch {}

            const ts = new Date().toISOString().replace(/[:.]/g, '-');
            const outPath = path.join(this.outputDir, `rta-${insuranceCompany}-${ts}.pdf`);
            outBytes = await pdfDoc.save();
            fs.writeFileSync(outPath, outBytes);

            return { path: outPath, template: templatePath };
        } catch (error) {
            console.error('[RtaService] Erro ao preencher RTA:', error);
            throw error;
        } finally {
            pdfDoc = null;
            pdfBytes = null;
            outBytes = null;
            if (global.gc) {
                try {
                    global.gc();
                } catch (_) {
                    // ignore
                }
            }
        }
    }
}

const rtaService = new RtaService();
export default rtaService;
// CommonJS compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(module as any).exports = rtaService;
