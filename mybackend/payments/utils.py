import requests
import json
import hashlib
import hmac
from django.conf import settings
from django.utils import timezone

class KhaltiPaymentGateway:
    """Khalti Payment Gateway Integration"""

    def __init__(self):
        self.config = settings.KHALTI_CONFIG
        self.base_url = "https://a.khalti.com/api/v2" if self.config['IS_LIVE'] else "https://test-pay.khalti.com/api/v2"
        self.secret_key = self.config['LIVE_SECRET_KEY'] if self.config['IS_LIVE'] else self.config['TEST_SECRET_KEY']
        self.public_key = self.config['LIVE_PUBLIC_KEY'] if self.config['IS_LIVE'] else self.config['TEST_PUBLIC_KEY']

    def get_headers(self):
        """Get headers for Khalti API requests"""
        return {
            'Authorization': f'Key {self.secret_key}',
            'Content-Type': 'application/json'
        }

    def initiate_payment(self, payment_data):
        """
        Initiate payment with Khalti

        Args:
            payment_data (dict): {
                'amount': int (in paisa),
                'purchase_order_id': str,
                'purchase_order_name': str,
                'customer_info': dict,
                'amount_breakdown': list (optional),
                'product_details': list (optional)
            }
        """
        url = f"{self.base_url}/epayment/initiate/"

        payload = {
            'return_url': self.config['RETURN_URL'],
            'website_url': self.config['WEBSITE_URL'],
            'amount': payment_data['amount'],
            'purchase_order_id': payment_data['purchase_order_id'],
            'purchase_order_name': payment_data['purchase_order_name'],
            'customer_info': payment_data['customer_info']
        }

        # Add optional fields
        if 'amount_breakdown' in payment_data:
            payload['amount_breakdown'] = payment_data['amount_breakdown']
        if 'product_details' in payment_data:
            payload['product_details'] = payment_data['product_details']

        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {'error': str(e), 'status': 'failed'}

    def verify_payment(self, pidx):
        """
        Verify payment status with Khalti

        Args:
            pidx (str): Payment index from Khalti
        """
        url = f"{self.base_url}/epayment/lookup/"

        payload = {'pidx': pidx}

        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=30)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            return {'error': str(e), 'status': 'failed'}

    def verify_webhook_signature(self, request_data, signature):
        """
        Verify webhook signature from Khalti

        Args:
            request_data (str): Raw request body
            signature (str): Signature from Khalti header
        """
        expected_signature = hmac.new(
            self.secret_key.encode(),
            request_data.encode(),
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected_signature, signature)

    @property
    def headers(self):
        return self.get_headers()

    @staticmethod
    def format_amount_for_khalti(amount_in_rupees):
        """Convert rupees to paisa (multiply by 100)"""
        return int(float(amount_in_rupees) * 100)

    @staticmethod
    def format_amount_for_display(amount_in_paisa):
        """Convert paisa to rupees (divide by 100)"""
        return float(amount_in_paisa) / 100

    @staticmethod
    def generate_purchase_order_id(payment_id):
        """Generate a unique purchase order ID"""
        return f"arena_x_payment_{payment_id}"

    @staticmethod
    def get_customer_info(user):
        """Format customer info for Khalti"""
        return {
            'name': user.full_name,
            'email': user.email,
            'phone': getattr(user, 'phone_number', '')
        }


def process_khalti_webhook(webhook_data):
    """
    Process webhook data from Khalti

    Args:
        webhook_data (dict): Webhook payload from Khalti
    """
    from .models import Payment, Transaction

    pidx = webhook_data.get('pidx')
    status = webhook_data.get('status')
    transaction_id = webhook_data.get('transaction_id')
    total_amount = webhook_data.get('total_amount')
    purchase_order_id = webhook_data.get('purchase_order_id')

    # Extract payment ID from purchase order ID
    try:
        payment_id = purchase_order_id.replace('arena_x_payment_', '')
        payment = Payment.objects.get(id=payment_id)
    except (ValueError, Payment.DoesNotExist):
        return {'error': 'Payment not found', 'status': 'failed'}

    # Update payment status
    if status == 'Completed':
        payment.status = 'COMPLETED'
        payment.processed_at = timezone.now()
        payment.transaction_id = transaction_id
        payment.payment_processor = 'khalti'
        payment.save()

        # Create transaction record
        Transaction.objects.create(
            payment=payment,
            transaction_type='CHARGE',
            amount=KhaltiPaymentGateway.format_amount_for_display(total_amount),
            currency='NPR',
            status='SUCCESS',
            external_transaction_id=transaction_id,
            payment_processor='khalti',
            processor_response=webhook_data
        )

    elif status == 'Expired':
        payment.status = 'CANCELLED'
        payment.save()

    elif status == 'User canceled':
        payment.status = 'CANCELLED'
        payment.save()

    return {'status': 'processed', 'payment_id': payment.id}


# Global instance for easy access
khalti_gateway = KhaltiPaymentGateway()
