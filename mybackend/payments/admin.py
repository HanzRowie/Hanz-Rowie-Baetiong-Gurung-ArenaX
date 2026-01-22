from django.contrib import admin
from .models import PaymentMethod, Payment, Transaction, Refund

@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('user', 'method_type', 'provider', 'last_four', 'is_default', 'is_active', 'created_at')
    list_filter = ('method_type', 'provider', 'is_default', 'is_active', 'created_at')
    search_fields = ('user__full_name', 'user__email', 'provider', 'last_four')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-is_default', '-created_at')

    fieldsets = (
        ('User & Method', {
            'fields': ('user', 'method_type', 'provider')
        }),
        ('Card Details', {
            'fields': ('last_four', 'expiry_date')
        }),
        ('Status', {
            'fields': ('is_default', 'is_active')
        }),
        ('Security', {
            'fields': ('payment_token',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'payment_type', 'amount', 'currency', 'status', 'created_at', 'processed_at')
    list_filter = ('payment_type', 'status', 'currency', 'created_at', 'processed_at')
    search_fields = ('user__full_name', 'user__email', 'transaction_id', 'id')
    readonly_fields = ('id', 'created_at', 'updated_at', 'processed_at')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Payment Details', {
            'fields': ('id', 'user', 'payment_method', 'payment_type', 'amount', 'currency')
        }),
        ('Status & Processing', {
            'fields': ('status', 'processed_at')
        }),
        ('Related Objects', {
            'fields': ('venue_booking', 'referee_booking', 'tournament')
        }),
        ('Description & Metadata', {
            'fields': ('description', 'metadata'),
            'classes': ('collapse',)
        }),
        ('Payment Processor', {
            'fields': ('transaction_id', 'payment_processor', 'processor_fee'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('payment', 'transaction_type', 'amount', 'currency', 'status', 'created_at', 'processed_at')
    list_filter = ('transaction_type', 'status', 'currency', 'created_at', 'processed_at')
    search_fields = ('payment__id', 'external_transaction_id', 'payment_processor')
    readonly_fields = ('created_at', 'processed_at')
    ordering = ('-created_at',)
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Transaction Details', {
            'fields': ('payment', 'transaction_type', 'amount', 'currency')
        }),
        ('Status & Processing', {
            'fields': ('status', 'processed_at')
        }),
        ('External Details', {
            'fields': ('external_transaction_id', 'payment_processor')
        }),
        ('Response & Errors', {
            'fields': ('processor_response', 'error_message'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        })
    )

@admin.register(Refund)
class RefundAdmin(admin.ModelAdmin):
    list_display = ('original_payment', 'refund_payment', 'amount', 'status', 'requested_at', 'processed_at')
    list_filter = ('status', 'requested_at', 'processed_at')
    search_fields = ('original_payment__id', 'refund_payment__id', 'refund_transaction_id')
    readonly_fields = ('requested_at', 'processed_at')
    ordering = ('-requested_at',)
    date_hierarchy = 'requested_at'

    fieldsets = (
        ('Refund Details', {
            'fields': ('original_payment', 'refund_payment', 'amount')
        }),
        ('Status & Processing', {
            'fields': ('status', 'processed_at')
        }),
        ('Reason & Details', {
            'fields': ('reason', 'refund_transaction_id')
        }),
        ('Processor Response', {
            'fields': ('processor_response',),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('requested_at',),
            'classes': ('collapse',)
        })
    )
