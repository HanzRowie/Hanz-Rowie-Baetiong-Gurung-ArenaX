from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.http import JsonResponse
from django.conf import settings
import decimal
from .models import PaymentMethod, Payment, Transaction, Refund
from .serializers import (
    PaymentMethodSerializer,
    PaymentSerializer,
    TransactionSerializer,
    RefundSerializer
)
from .utils import khalti_gateway, process_khalti_webhook
from notifications.utils import send_notification

class PaymentMethodViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]
    queryset = PaymentMethod.objects.all()

    def get_queryset(self):
        return PaymentMethod.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        # Set as default if it's the first payment method or explicitly requested
        is_default = self.request.data.get('is_default', False)
        if is_default or not PaymentMethod.objects.filter(user=self.request.user, is_default=True).exists():
            # Remove default flag from other methods
            PaymentMethod.objects.filter(user=self.request.user, is_default=True).update(is_default=False)
            serializer.save(user=self.request.user, is_default=True)
        else:
            serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        payment_method = self.get_object()
        # Remove default flag from other methods
        PaymentMethod.objects.filter(user=request.user, is_default=True).update(is_default=False)
        payment_method.is_default = True
        payment_method.save()
        return Response({'status': 'Payment method set as default'})

class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    queryset = Payment.objects.all()

    def get_queryset(self):
        return Payment.objects.filter(user=self.request.user)

    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        payment = self.get_object()
        if payment.status != 'PENDING':
            return Response(
                {'error': 'Payment is not in pending status'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Here you would integrate with actual payment processor (Stripe, PayPal, etc.)
        # For now, we'll simulate processing
        payment.status = 'COMPLETED'
        payment.processed_at = timezone.now()
        payment.save()

        # Create transaction record
        Transaction.objects.create(
            payment=payment,
            transaction_type='CHARGE',
            amount=payment.amount,
            currency=payment.currency,
            status='SUCCESS',
            external_transaction_id=f"txn_{payment.id}",
            payment_processor='simulated_processor'
        )

        return Response({'status': 'Payment processed successfully'})

    @action(detail=True, methods=['get'])
    def verify(self, request, pk=None):
        """Verify payment status with Khalti"""
        payment = self.get_object()

        if not payment.transaction_id:
            return Response(
                {'error': 'No transaction ID found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Verify with Khalti
        verification_result = khalti_gateway.verify_payment(payment.transaction_id)

        if 'error' in verification_result:
            return Response(
                {'error': 'Verification failed', 'details': verification_result['error']},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update payment status based on verification
        khalti_status = verification_result.get('status')
        if khalti_status == 'Completed' and payment.status != 'COMPLETED':
            payment.status = 'COMPLETED'
            payment.processed_at = timezone.now()
            payment.save()

            # Notify user about successful payment
            send_notification(
                user=payment.user,
                notification_type='PAYMENT_SUCCESSFUL',
                title='Payment Successful',
                message=f'Your payment of {payment.amount} {payment.currency} for {payment.description} was successful.',
                related_id=payment.id
            )

            # Create transaction record if not exists
            if not Transaction.objects.filter(payment=payment, transaction_type='CHARGE').exists():
                Transaction.objects.create(
                    payment=payment,
                    transaction_type='CHARGE',
                    amount=payment.amount,
                    currency='NPR',
                    status='SUCCESS',
                    external_transaction_id=verification_result.get('transaction_id'),
                    payment_processor='khalti',
                    processor_response=verification_result
                )
            
            # Update related tournament registration if exists
            if payment.payment_type == 'TOURNAMENT_FEE' and payment.tournament:
                from tournaments.models import TournamentRegistration
                from teams.models import TeamTournamentRegistration
                
                # Check for individual registration
                try:
                    registration = TournamentRegistration.objects.get(
                        payment=payment,
                        tournament=payment.tournament
                    )
                    if registration.status == 'PENDING_PAYMENT':
                        registration.status = 'PENDING'
                        registration.payment_verified_at = timezone.now()
                        registration.save()

                        # Notify organizer
                        send_notification(
                            user=payment.tournament.organizer,
                            notification_type='GENERAL',
                            title='Tournament Fee Paid',
                            message=f'{payment.user.full_name} has paid the entry fee for {payment.tournament.title}.',
                            tournament=payment.tournament,
                            related_id=registration.id,
                            action_url=f'/tournaments/{payment.tournament.id}'
                        )
                except TournamentRegistration.DoesNotExist:
                    pass
                
                # Check for team registration
                try:
                    team_registration = TeamTournamentRegistration.objects.get(
                        payment=payment,
                        tournament=payment.tournament
                    )
                    if team_registration.status == 'PENDING_PAYMENT':
                        team_registration.status = 'PENDING'
                        team_registration.payment_verified_at = timezone.now()
                        team_registration.save()

                        # Notify organizer
                        send_notification(
                            user=payment.tournament.organizer,
                            notification_type='GENERAL',
                            title='Team Tournament Fee Paid',
                            message=f'Team "{team_registration.team.name}" has paid the entry fee for {payment.tournament.title}.',
                            tournament=payment.tournament,
                            related_id=team_registration.id,
                            action_url=f'/tournaments/{payment.tournament.id}'
                        )
                except TeamTournamentRegistration.DoesNotExist:
                    pass
            
            # Update related venue booking if exists
            if payment.payment_type == 'VENUE_BOOKING' and payment.venue_booking:
                from venues.models import VenueBooking
                
                try:
                    booking = payment.venue_booking
                    if booking.payment_status == 'PENDING':
                        booking.status = 'CONFIRMED'
                        booking.payment_status = 'COMPLETED'
                        booking.save()
                        
                        # Send notification
                        send_notification(
                            user=booking.user,
                            notification_type='BOOKING_CONFIRMED',
                            title='Venue Booking Confirmed',
                            message=f'Your booking at {booking.venue.name} on {booking.date} has been confirmed.'
                        )
                        
                        # Notify venue owner about payment received
                        send_notification(
                            user=booking.venue.owner,
                            notification_type='PAYMENT_RECEIVED',
                            title='Payment Received',
                            message=f'You have received a payment of {booking.amount} NPR for the booking at {booking.venue.name} on {booking.date}.',
                            related_id=booking.id
                        )
                except Exception as e:
                    print(f"Failed to update venue booking: {e}")

        return Response({
            'payment': PaymentSerializer(payment).data,
            'verification': verification_result
        })

    @action(detail=True, methods=['post'])
    def refund(self, request, pk=None):
        payment = self.get_object()
        if payment.status != 'COMPLETED':
            return Response(
                {'error': 'Can only refund completed payments'},
                status=status.HTTP_400_BAD_REQUEST
            )

        refund_amount = request.data.get('amount', payment.amount)
        reason = request.data.get('reason', '')

        # Create refund payment
        refund_payment = Payment.objects.create(
            user=payment.user,
            payment_type=payment.payment_type,
            amount=refund_amount,
            currency=payment.currency,
            status='COMPLETED',
            description=f"Refund for payment {payment.id}",
            processed_at=timezone.now()
        )

        # Create refund record
        refund = Refund.objects.create(
            original_payment=payment,
            refund_payment=refund_payment,
            amount=refund_amount,
            reason=reason,
            status='COMPLETED'
        )

        # Update original payment status
        payment.status = 'REFUNDED'
        payment.save()

        return Response(RefundSerializer(refund).data)

class TransactionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]
    queryset = Transaction.objects.all()

    def get_queryset(self):
        return Transaction.objects.filter(payment__user=self.request.user)

class RefundViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = RefundSerializer
    permission_classes = [IsAuthenticated]
    queryset = Refund.objects.all()

    def get_queryset(self):
        return Refund.objects.filter(
            original_payment__user=self.request.user
        ) | Refund.objects.filter(
            refund_payment__user=self.request.user
        )

class ProcessPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        payment_type = request.data.get('payment_type')
        amount = request.data.get('amount')
        currency = request.data.get('currency', 'NPR')  # Default to NPR for Khalti
        description = request.data.get('description', '')

        # Related object IDs
        venue_booking_id = request.data.get('venue_booking_id')
        referee_booking_id = request.data.get('referee_booking_id')
        tournament_id = request.data.get('tournament_id')

        # Convert amount to paisa for Khalti (if in rupees)
        if currency == 'NPR':
            amount_in_paisa = khalti_gateway.format_amount_for_khalti(amount)
        else:
            # For other currencies, assume amount is already in correct format
            amount_in_paisa = int(float(amount) * 100)

        # Create payment record
        payment = Payment.objects.create(
            user=request.user,
            payment_type=payment_type,
            amount=amount,
            currency=currency,
            description=description,
            status='PENDING',
            venue_booking_id=venue_booking_id,
            referee_booking_id=referee_booking_id,
            tournament_id=tournament_id
        )

        # Prepare Khalti payment data
        khalti_data = {
            'amount': amount_in_paisa,
            'purchase_order_id': khalti_gateway.generate_purchase_order_id(payment.id),
            'purchase_order_name': self._get_purchase_order_name(payment),
            'customer_info': khalti_gateway.get_customer_info(request.user),
            'product_details': self._get_product_details(payment)
        }

        # Initiate payment with Khalti
        khalti_response = khalti_gateway.initiate_payment(khalti_data)

        if 'error' in khalti_response:
            payment.status = 'FAILED'
            payment.save()
            return Response(
                {'error': 'Failed to initiate payment', 'details': khalti_response['error']},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update payment with Khalti response
        payment.transaction_id = khalti_response.get('pidx')
        payment.metadata = khalti_response
        payment.save()

        return Response({
            'payment': PaymentSerializer(payment).data,
            'khalti_response': khalti_response
        }, status=status.HTTP_201_CREATED)

    def _get_purchase_order_name(self, payment):
        """Get appropriate purchase order name based on payment type"""
        if payment.payment_type == 'VENUE_BOOKING':
            return 'Venue Booking Payment'
        elif payment.payment_type == 'REFEREE_BOOKING':
            return 'Referee Booking Payment'
        elif payment.payment_type == 'TOURNAMENT_FEE':
            return 'Tournament Fee Payment'
        elif payment.payment_type == 'SUBSCRIPTION':
            return 'Subscription Payment'
        else:
            return 'Arena-X Payment'

    def _get_product_details(self, payment):
        """Get product details for Khalti"""
        products = []

        if payment.venue_booking:
            products.append({
                'identity': str(payment.venue_booking.id),
                'name': payment.venue_booking.venue.name,
                'total_price': khalti_gateway.format_amount_for_khalti(payment.amount),
                'quantity': 1,
                'unit_price': khalti_gateway.format_amount_for_khalti(payment.amount)
            })

        elif payment.referee_booking:
            products.append({
                'identity': str(payment.referee_booking.id),
                'name': f'Referee: {payment.referee_booking.referee.full_name}',
                'total_price': khalti_gateway.format_amount_for_khalti(payment.amount),
                'quantity': 1,
                'unit_price': khalti_gateway.format_amount_for_khalti(payment.amount)
            })

        elif payment.tournament:
            products.append({
                'identity': str(payment.tournament.id),
                'name': payment.tournament.title,
                'total_price': khalti_gateway.format_amount_for_khalti(payment.amount),
                'quantity': 1,
                'unit_price': khalti_gateway.format_amount_for_khalti(payment.amount)
            })

        return products

class PaymentWebhookView(APIView):
    """Handle webhooks from payment processors"""

    def post(self, request, processor):
        if processor.lower() == 'khalti':
            return self._handle_khalti_webhook(request)
        else:
            return Response(
                {'error': f'Unsupported payment processor: {processor}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    def _handle_khalti_webhook(self, request):
        """Handle Khalti webhook"""
        # Get raw request body for signature verification
        request_body = request.body.decode('utf-8')
        signature = request.headers.get('X-Khalti-Signature')

        # Verify webhook signature
        if not khalti_gateway.verify_webhook_signature(request_body, signature):
            return Response(
                {'error': 'Invalid signature'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        try:
            webhook_data = request.data
            result = process_khalti_webhook(webhook_data)
            return Response(result)
        except Exception as e:
            return Response(
                {'error': f'Webhook processing failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class KhaltiConfigView(APIView):
    """Get Khalti configuration for frontend"""

    def get(self, request):
        config = settings.KHALTI_CONFIG
        return Response({
            'public_key': config['LIVE_PUBLIC_KEY'] if config['IS_LIVE'] else config['TEST_PUBLIC_KEY'],
            'is_live': config['IS_LIVE'],
            'website_url': config['WEBSITE_URL'],
            'return_url': config['RETURN_URL'],
            'mock_mode': getattr(settings, 'PAYMENT_MOCK_MODE', False)
        })


class MockPaymentCompleteView(APIView):
    """Complete a mock payment (for development only)"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Auto-complete a mock payment"""
        from django.conf import settings
        
        # Only allow in mock mode
        if not getattr(settings, 'PAYMENT_MOCK_MODE', False):
            return Response(
                {'error': 'Mock payments are disabled'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        pidx = request.data.get('pidx')
        if not pidx or not pidx.startswith('MOCK_'):
            return Response(
                {'error': 'Invalid mock payment ID'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Extract payment ID from mock PIDX
        payment_id = pidx.replace('MOCK_', '')
        
        try:
            payment = Payment.objects.get(id=payment_id, user=request.user)
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Complete the payment
        payment.status = 'COMPLETED'
        payment.processed_at = timezone.now()
        payment.save()

        # Notify user about successful payment
        send_notification(
            user=payment.user,
            notification_type='PAYMENT_SUCCESSFUL',
            title='Payment Successful (Mock)',
            message=f'Your payment of {payment.amount} {payment.currency} for {payment.description} was successful.',
            related_id=payment.id
        )
        
        # Update transaction
        txn = Transaction.objects.filter(
            payment=payment,
            external_transaction_id=pidx
        ).first()
        
        if txn:
            txn.status = 'SUCCESS'
            txn.processed_at = timezone.now()
            txn.save()
        
        # Update related tournament registration if exists
        if payment.payment_type == 'TOURNAMENT_FEE' and payment.tournament:
            from tournaments.models import TournamentRegistration
            from teams.models import TeamTournamentRegistration
            
            # Check for individual registration
            try:
                registration = TournamentRegistration.objects.get(
                    payment=payment,
                    tournament=payment.tournament
                )
                if registration.status == 'PENDING_PAYMENT':
                    registration.status = 'PENDING'
                    registration.payment_verified_at = timezone.now()
                    registration.save()
            except TournamentRegistration.DoesNotExist:
                pass
            
            # Check for team registration
            try:
                team_registration = TeamTournamentRegistration.objects.get(
                    payment=payment,
                    tournament=payment.tournament
                )
                if team_registration.status == 'PENDING_PAYMENT':
                    team_registration.status = 'PENDING'
                    team_registration.payment_verified_at = timezone.now()
                    team_registration.save()
            except TeamTournamentRegistration.DoesNotExist:
                pass
        
        return Response({
            'status': 'success',
            'message': 'Mock payment completed',
            'payment': PaymentSerializer(payment).data
        })

class WalletDashboardView(APIView):
    """View to get the user's wallet balance and recent escrow transactions"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        # Get recent transactions associated with this user's wallet
        # We can find these by looking at TRANSACTIONS with payment_processor 'wallet_escrow'
        # OR by looking at the payment the transaction belongs to.
        # But for this demo, we'll query Transactions targeting the user's role.
        
        # If referee, find payments where referee_booking.referee == user
        transactions_query = Transaction.objects.filter(
            payment__referee_booking__referee=user,
            transaction_type='TRANSFER',
            status='SUCCESS'
        ).order_by('-created_at')[:10]
        
        # We also need to get WITHDRAWAL transactions
        withdrawals = Transaction.objects.filter(
            payment__user=user,
            transaction_type='TRANSFER',
            payment_processor='wallet_withdrawal'
        ).order_by('-created_at')[:10]

        # Combine, sort, and serialize
        # A simple serialization for the frontend
        history = []
        for tx in transactions_query:
            history.append({
                'id': str(tx.id),
                'type': 'EARNING',
                'amount': float(tx.amount),
                'date': tx.created_at.isoformat(),
                'note': tx.processor_response.get('note', 'Escrow Release') if isinstance(tx.processor_response, dict) else 'Escrow Release'
            })
            
        for tx in withdrawals:
            history.append({
                'id': str(tx.id),
                'type': 'WITHDRAWAL',
                'amount': float(tx.amount),
                'date': tx.created_at.isoformat(),
                'note': 'Funds Withdrawn to Bank'
            })
            
        history = sorted(history, key=lambda x: x['date'], reverse=True)

        return Response({
            'wallet_balance': float(user.wallet_balance),
            'recent_transactions': history
        })

class WalletWithdrawalView(APIView):
    """View to mock withdraw funds from the wallet"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        
        # Get requested amount (default to full balance)
        amount_to_withdraw = request.data.get('amount', float(user.wallet_balance))
        try:
            amount_to_withdraw = float(amount_to_withdraw)
        except ValueError:
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)
        
        if amount_to_withdraw <= 0:
            return Response({'error': 'Withdrawal amount must be greater than 0.'}, status=status.HTTP_400_BAD_REQUEST)
            
        if user.wallet_balance < amount_to_withdraw:
            return Response({'error': 'Insufficient funds in wallet.'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Deduct wallet balance
        user.wallet_balance -= decimal.Decimal(str(amount_to_withdraw))
        user.save()
        
        # Create a mock 'payment' record for the withdrawal request, then a transaction
        withdrawal_payment = Payment.objects.create(
            user=user,
            payment_type='OTHER',
            amount=amount_to_withdraw,
            currency='NPR',
            description='Wallet Withdrawal',
            status='COMPLETED',
            processed_at=timezone.now()
        )
        
        Transaction.objects.create(
            payment=withdrawal_payment,
            transaction_type='TRANSFER',
            amount=amount_to_withdraw,
            currency='NPR',
            status='SUCCESS',
            external_transaction_id=f"withdraw_{timezone.now().timestamp()}",
            payment_processor='wallet_withdrawal',
            processed_at=timezone.now(),
            processor_response={"note": "Funds successfully transferred."}
        )

        # Notify user about withdrawal
        send_notification(
            user=user,
            notification_type='GENERAL',
            title='Withdrawal Processed',
            message=f'Your withdrawal of {amount_to_withdraw} NPR has been processed successfully.',
            related_id=withdrawal_payment.id
        )
        
        return Response({
            'message': 'Withdrawal successful',
            'new_balance': float(user.wallet_balance),
            'withdrawn_amount': amount_to_withdraw
        }, status=status.HTTP_200_OK)

