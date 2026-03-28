from rest_framework import serializers
from decimal import Decimal
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
    initiated_by_name = serializers.SerializerMethodField()
    player_name = serializers.SerializerMethodField()

    class Meta:
        model = Refund
        fields = [
            'id', 'original_payment', 'original_payment_details',
            'refund_payment', 'refund_payment_details',
            'initiated_by', 'initiated_by_name',
            'tournament_registration', 'player_name',
            'amount', 'reason', 'status',
            'refund_transaction_id', 'processor_response',
            'requested_at', 'processed_at',
        ]
        read_only_fields = [
            'id', 'initiated_by', 'refund_payment',
            'refund_transaction_id', 'processor_response',
            'requested_at', 'processed_at',
        ]

    def get_initiated_by_name(self, obj):
        return obj.initiated_by.full_name if obj.initiated_by else None

    def get_player_name(self, obj):
        if obj.tournament_registration:
            return obj.tournament_registration.player.full_name
        return obj.original_payment.user.full_name


class InitiateRefundSerializer(serializers.Serializer):
    """Serializer for organizer-initiated refund requests."""
    payment_id = serializers.UUIDField()
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    reason = serializers.CharField(max_length=500)
    registration_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_reason(self, value):
        if not value.strip():
            raise serializers.ValidationError("Reason cannot be blank.")
        return value.strip()

    def validate(self, data):
        from .models import Payment
        try:
            payment = Payment.objects.get(id=data['payment_id'])
        except Payment.DoesNotExist:
            raise serializers.ValidationError({'payment_id': 'Payment not found.'})

        if payment.status != 'COMPLETED':
            raise serializers.ValidationError(
                {'payment_id': f'Cannot refund a payment with status "{payment.status}". Only COMPLETED payments can be refunded.'}
            )

        # Check no pending/completed refund already exists
        existing = payment.refunds.filter(status__in=['PENDING', 'PROCESSING', 'COMPLETED'])
        if existing.exists():
            raise serializers.ValidationError(
                {'payment_id': 'A refund for this payment already exists.'}
            )

        amount = data.get('amount', payment.amount)
        if amount <= Decimal('0'):
            raise serializers.ValidationError({'amount': 'Refund amount must be greater than zero.'})
        if amount > payment.amount:
            raise serializers.ValidationError(
                {'amount': f'Refund amount ({amount}) cannot exceed original payment amount ({payment.amount}).'}
            )

        data['payment'] = payment
        data['amount'] = amount
        return data


class CompleteRefundSerializer(serializers.Serializer):
    """Serializer for marking a pending refund as completed."""
    refund_transaction_id = serializers.CharField(max_length=255, required=False, allow_blank=True)
