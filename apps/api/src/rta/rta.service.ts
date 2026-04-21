import fs from 'node:fs';
import path from 'node:path';
import { Injectable } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { assetsRoot, sanitizeFileName } from '../common/paths';
import { FilesService } from '../files/files.service';
import { GenerateRtaDto } from './dto';

const TRANSACTION_FIELDS = [
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

function formatDate(dateValue: unknown): string {
  if (!dateValue) return '';
  if (dateValue instanceof Date) {
    const mm = String(dateValue.getMonth() + 1).padStart(2, '0');
    const dd = String(dateValue.getDate()).padStart(2, '0');
    return `${mm}/${dd}/${dateValue.getFullYear()}`;
  }

  const raw = String(dateValue).trim();
  const iso = raw.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
  if (iso) return `${iso[2]}/${iso[3]}/${iso[1]}`;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) return raw;
  return '';
}

@Injectable()
export class RtaService {
  constructor(private readonly filesService: FilesService) {}

  getTemplatePath(insuranceCompany?: string): string {
    const assetsDir = path.join(assetsRoot(), 'rta');
    const templates: Record<string, string> = {
      allstate: path.join(assetsDir, 'rta_template_allstate.pdf'),
      progressive: path.join(assetsDir, 'rta_template_progressive.pdf'),
      geico: path.join(assetsDir, 'rta_template_geico.pdf'),
      liberty: path.join(assetsDir, 'rta_template_liberty.pdf')
    };

    const key = String(insuranceCompany || 'allstate').toLowerCase();
    return templates[key] || templates.allstate;
  }

  async generate(data: GenerateRtaDto) {
    const insuranceCompany = data.insurance_company || data.seguradora || 'allstate';
    const templatePath = this.getTemplatePath(insuranceCompany);
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template nao encontrado: ${templatePath}`);
    }

    const pdfBytes = fs.readFileSync(templatePath);
    const pdfDoc = await PDFDocument.load(pdfBytes, { updateFieldAppearances: true } as any);
    const form = pdfDoc.getForm();

    const fields: Record<string, string> = {
      '(L1) Seller name (Please print)': String(data.seller_name || ''),
      '(L2) (Seller) Address': String(data.seller_street || ''),
      '(L2) (Seller) City': String(data.seller_city || ''),
      '(L2) (Seller) State': String(data.seller_state || ''),
      '(L2) (Seller) Zip Code': String(data.seller_zipcode || ''),
      '(I3) Gross Sale Price (Proof Required)': String(data.gross_sale_price || ''),
      '(J1) Purchase Date': formatDate(data.purchase_date),
      '(K3) Effective Date of Insurance': formatDate(data.insurance_effective_date),
      '(K5) Policy Change Date': formatDate(data.insurance_policy_change_date),
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

    for (const [fieldName, value] of Object.entries(fields)) {
      try {
        const field = form.getTextField(fieldName);
        field.setText(value);
      } catch (_) {
        // Some carrier templates omit specific fields.
      }
    }

    const colors = ['Black', 'White', 'Brown', 'Blue', 'Yellow', 'Gray', 'Purple', 'Green', 'Orange', 'Red', 'Silver', 'Gold'];
    const chosenColor = String(data.color || '').trim().toLowerCase();
    for (const color of colors) {
      const variants = [`(B4) ${color}`, color === 'White' || color === 'Purple' ? `(B4 ) ${color}` : ''].filter(Boolean);
      for (const fieldName of variants) {
        try {
          const checkbox = form.getCheckBox(fieldName);
          if (chosenColor === color.toLowerCase()) checkbox.check();
          else checkbox.uncheck();
        } catch (_) {
          // Ignore missing carrier-specific color fields.
        }
      }
    }

    if (data.transaction_type) {
      for (const fieldName of TRANSACTION_FIELDS) {
        try {
          form.getCheckBox(fieldName).uncheck();
        } catch (_) {
          // Ignore missing transaction fields.
        }
      }
      try {
        form.getCheckBox(data.transaction_type).check();
      } catch (_) {
        // Ignore unknown transaction values.
      }
    }

    try {
      form.updateFieldAppearances();
    } catch (_) {
      // Some PDF viewers still render fields correctly without regenerated appearances.
    }

    const fileName = sanitizeFileName(`rta-${insuranceCompany}-${new Date().toISOString().replace(/[:.]/g, '-')}.pdf`);
    const outputPath = path.join(this.filesService.generatedDir(), fileName);
    await fs.promises.writeFile(outputPath, await pdfDoc.save());

    const file = await this.filesService.create({
      kind: 'rta',
      filename: fileName,
      mimeType: 'application/pdf',
      absolutePath: outputPath
    });

    return {
      fileId: file.id,
      filename: file.filename,
      downloadUrl: file.downloadUrl
    };
  }
}
