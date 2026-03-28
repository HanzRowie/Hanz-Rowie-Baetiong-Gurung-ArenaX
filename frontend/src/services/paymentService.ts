/**
 * Payment Service
 * Handles all payment-related API calls
 */

import api from './api';
import type {
    Payment,
    PaymentMethod,
    KhaltiConfig,
    CreatePaymentMethodRequest,
    RefundRequest,
    PaymentVerificationResponse,
    Refund,
    InitiateRefundRequest,
    CompleteRefundRequest,
} from '../types/payment.types';

class PaymentService {
  private readonly BASE_PATH = '/api/payments';

  /**
   * Payment Methods
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    const response = await api.get(`${this.BASE_PATH}/payment-methods/`);
    return response.data;
  }

  async createPaymentMethod(data: CreatePaymentMethodRequest): Promise<PaymentMethod> {
    const response = await api.post(`${this.BASE_PATH}/payment-methods/`, data);
    return response.data;
  }

  async setDefaultPaymentMethod(id: number): Promise<{ status: string }> {
    const response = await api.post(`${this.BASE_PATH}/payment-methods/${id}/set_default/`);
    return response.data;
  }

  async deletePaymentMethod(id: number): Promise<void> {
    await api.delete(`${this.BASE_PATH}/payment-methods/${id}/`);
  }

  /**
   * Payments
   */
  async getPayments(): Promise<Payment[]> {
    const response = await api.get(`${this.BASE_PATH}/payments/`);
    return response.data;
  }

  async getPayment(id: string): Promise<Payment> {
    const response = await api.get(`${this.BASE_PATH}/payments/${id}/`);
    return response.data;
  }

  async verifyPayment(id: string): Promise<PaymentVerificationResponse> {
    const response = await api.get(`${this.BASE_PATH}/payments/${id}/verify/`);
    return response.data;
  }

  async requestRefund(id: string, data: RefundRequest): Promise<any> {
    const response = await api.post(`${this.BASE_PATH}/payments/${id}/refund/`, data);
    return response.data;
  }

  /**
   * Organizer Refund Management
   */
  async getOrganizerRefunds(params?: { status?: string; tournament_id?: string }): Promise<Refund[]> {
    const response = await api.get(`${this.BASE_PATH}/organizer/refunds/`, { params });
    return response.data;
  }

  async initiateRefund(data: InitiateRefundRequest): Promise<Refund> {
    const response = await api.post(`${this.BASE_PATH}/organizer/refunds/`, data);
    return response.data;
  }

  async getOrganizerRefund(refundId: number): Promise<Refund> {
    const response = await api.get(`${this.BASE_PATH}/organizer/refunds/${refundId}/`);
    return response.data;
  }

  async completeRefund(refundId: number, data?: CompleteRefundRequest): Promise<Refund> {
    const response = await api.patch(`${this.BASE_PATH}/organizer/refunds/${refundId}/complete/`, data || {});
    return response.data;
  }

  async cancelRefund(refundId: number): Promise<Refund> {
    const response = await api.patch(`${this.BASE_PATH}/organizer/refunds/${refundId}/cancel/`, {});
    return response.data;
  }

    getRefundStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED': return 'text-green-600 bg-green-50';
      case 'PENDING':   return 'text-yellow-600 bg-yellow-50';
      case 'PROCESSING': return 'text-blue-600 bg-blue-50';
      case 'FAILED':    return 'text-red-600 bg-red-50';
      case 'CANCELLED': return 'text-gray-600 bg-gray-50';
      default:          return 'text-gray-600 bg-gray-50';
    }
  }

  /**
   * Khalti Configuration
   */
  async getKhaltiConfig(): Promise<KhaltiConfig> {
    const response = await api.get(`${this.BASE_PATH}/khalti-config/`);
    return response.data;
  }

  /**
   * Helper Methods
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600 bg-green-50';
      case 'PENDING':
        return 'text-yellow-600 bg-yellow-50';
      case 'PROCESSING':
        return 'text-blue-600 bg-blue-50';
      case 'FAILED':
        return 'text-red-600 bg-red-50';
      case 'CANCELLED':
        return 'text-gray-600 bg-gray-50';
      case 'REFUNDED':
        return 'text-purple-600 bg-purple-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  }

  getStatusBadgeColor(status: string): string {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      case 'CANCELLED':
        return 'bg-gray-100 text-gray-800';
      case 'REFUNDED':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatAmount(amount: string | number, currency: string = 'NPR'): string {
    const numAmount = typeof amount === 'string' ? Number.parseFloat(amount) : amount;
    return `${currency} ${numAmount.toLocaleString('en-NP', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getPaymentTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      'VENUE_BOOKING': 'Venue Booking',
      'REFEREE_BOOKING': 'Referee Fee',
      'TOURNAMENT_FEE': 'Tournament Entry',
      'SUBSCRIPTION': 'Subscription',
      'OTHER': 'Other',
    };
    return labels[type] || type;
  }
}

export default new PaymentService();
