/**
 * Payment System Type Definitions
 */

export type PaymentMethodType = 
  | 'CREDIT_CARD' 
  | 'DEBIT_CARD' 
  | 'BANK_TRANSFER' 
  | 'DIGITAL_WALLET' 
  | 'CASH';

export type PaymentType = 
  | 'VENUE_BOOKING' 
  | 'REFEREE_BOOKING' 
  | 'TOURNAMENT_FEE' 
  | 'SUBSCRIPTION' 
  | 'OTHER';

export type PaymentStatus = 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED' 
  | 'REFUNDED';

export interface PaymentMethod {
  id: number;
  method_type: PaymentMethodType;
  provider: string;
  last_four: string;
  expiry_date?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  user: string;
  payment_method?: number;
  payment_type: PaymentType;
  amount: string;
  currency: string;
  status: PaymentStatus;
  description: string;
  venue_booking?: string;
  referee_booking?: string;
  tournament?: string;
  transaction_id: string;
  payment_processor: string;
  processor_fee: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  processed_at?: string;
}

export interface Transaction {
  id: number;
  payment: string;
  transaction_type: 'CHARGE' | 'REFUND' | 'TRANSFER' | 'FEE';
  amount: string;
  currency: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  external_transaction_id: string;
  payment_processor: string;
  processor_response: Record<string, any>;
  error_message: string;
  created_at: string;
  processed_at?: string;
}

export interface Refund {
  id: number;
  original_payment: string;
  refund_payment: string;
  amount: string;
  reason: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  refund_transaction_id: string;
  processor_response: Record<string, any>;
  requested_at: string;
  processed_at?: string;
}

export interface KhaltiConfig {
  public_key: string;
  return_url: string;
  website_url: string;
}

export interface KhaltiPaymentPayload {
  idx: string;
  amount: number;
  mobile: string;
  product_identity: string;
  product_name: string;
  product_url: string;
}

export interface PaymentInitiationResponse {
  payment_id: string;
  payment_url?: string;
  amount: string;
  payment_required: boolean;
  registration_id?: string;
  booking_id?: string;
}

export interface PaymentVerificationResponse {
  payment: Payment;
  verification: {
    pidx: string;
    status: string;
    transaction_id: string;
  };
}

export interface CreatePaymentMethodRequest {
  method_type: PaymentMethodType;
  provider: string;
  last_four: string;
  expiry_date?: string;
  is_default?: boolean;
}

export interface RefundRequest {
  amount: string;
  reason: string;
}
