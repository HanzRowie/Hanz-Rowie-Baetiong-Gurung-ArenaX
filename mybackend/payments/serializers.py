from rest_framework import serializers
from .models import PaymentMethod, Payment, Transaction, Refund

class PaymentMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'method_type', 'provider', 'last_four', 'expiry_date',
            'is_default', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate(self, data):
        # Validate expiry date for credit/debit cards
        method_type = data.get('method_type')
        expiry_date = data.get('expiry_date')

        if method_type in ['CREDIT_CARD', 'DEBIT_CARD'] and not expiry_date:
            raise serializers.ValidationError("Expiry date is required for credit/debit cards")

        return data

class PaymentSerializer(serializers.ModelSerializer):
    payment_method_details = PaymentMethodSerializer(source='payment_method', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'user', 'payment_method', 'payment_method_details', 'payment_type',
            'amount', 'currency', 'status', 'description', 'venue_booking',
            'referee_booking', 'tournament', 'transaction_id', 'payment_processor',
            'processor_fee', 'metadata', 'created_at', 'updated_at', 'processed_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'processed_at']

class TransactionSerializer(serializers.ModelSerializer):
    payment_details = PaymentSerializer(source='payment', read_only=True)

    class Meta:
        model = Transaction
        fields = [
            'id', 'payment', 'payment_details', 'transaction_type', 'amount',
            'currency', 'status', 'external_transaction_id', 'payment_processor',
            'processor_response', 'error_message', 'created_at', 'processed_at'
        ]
        read_only_fields = ['id', 'created_at', 'processed_at']

class RefundSerializer(serializers.ModelSerializer):
    original_payment_details = PaymentSerializer(source='original_payment', read_only=True)
    refund_payment_details = PaymentSerializer(source='refund_payment', read_only=True)

    class Meta:
        model = Refund
        fields = [
            'id', 'original_payment', 'original_payment_details', 'refund_payment',
            'refund_payment_details', 'amount', 'reason', 'status', 'refund_transaction_id',
            'processor_response', 'requested_at', 'processed_at'
        ]
        read_only_fields = ['id', 'requested_at', 'processed_at']
