from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'payment-methods', views.PaymentMethodViewSet)
router.register(r'payments', views.PaymentViewSet)
router.register(r'transactions', views.TransactionViewSet)
router.register(r'refunds', views.RefundViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('process-payment/', views.ProcessPaymentView.as_view(), name='process-payment'),
    path('khalti-config/', views.KhaltiConfigView.as_view(), name='khalti-config'),
    path('webhook/<str:processor>/', views.PaymentWebhookView.as_view(), name='payment-webhook'),
    path('mock-complete/', views.MockPaymentCompleteView.as_view(), name='mock-payment-complete'),
    path('wallet/', views.WalletDashboardView.as_view(), name='wallet-dashboard'),
    path('wallet/withdraw/', views.WalletWithdrawalView.as_view(), name='wallet-withdraw'),
    # Organizer refund management
    path('organizer/refunds/', views.OrganizerRefundListView.as_view(), name='organizer-refunds'),
    path('organizer/refunds/<int:refund_id>/', views.OrganizerRefundDetailView.as_view(), name='organizer-refund-detail'),
    path('organizer/refunds/<int:refund_id>/complete/', views.CompleteRefundView.as_view(), name='organizer-refund-complete'),
    path('organizer/refunds/<int:refund_id>/cancel/', views.CancelRefundView.as_view(), name='organizer-refund-cancel'),
]
