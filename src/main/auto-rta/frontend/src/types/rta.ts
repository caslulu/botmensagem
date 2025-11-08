export interface RTAFormData {
  // Insurance Company
  insurance_company: 'allstate' | 'progressive' | 'geico' | 'liberty';
  
  // Seller Information
  seller_name: string;
  seller_street: string;
  seller_city: string;
  seller_state: string;
  seller_zipcode: string;
  
  // Owner Information
  owner_name: string;
  owner_dob: string;
  owner_license: string;
  owner_street: string;
  owner_city: string;
  owner_state: string;
  owner_zipcode: string;
  owner_license_issued_state: string;
  
  // Vehicle Information
  vin: string;
  year: number;
  make: string;
  model: string;
  body_style: string;
  color: string;
  cylinders: number;
  passengers: number;
  doors: number;
  odometer: number;
  
  // Vehicle Financing Status
  vehicle_financing_status: 'financed' | 'paid_off';
  
  // Previous Title Information (optional for financed vehicles)
  previous_title_number?: string;
  previous_title_state?: string;
  previous_title_country?: string;
  
  // Sale Information
  gross_sale_price: number;
  purchase_date: string;
  
  // Insurance Information
  insurance_effective_date: string;
  insurance_policy_change_date: string;
}


export interface APIResponse {
  success?: boolean;
  error?: string;
  message?: string;
  pdf_url?: string;
}

export interface InsuranceOption {
  id: 'allstate' | 'progressive' | 'geico' | 'liberty';
  name: string;
  description: string;
}
