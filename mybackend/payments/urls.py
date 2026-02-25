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
]
