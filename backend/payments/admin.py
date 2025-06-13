from django.contrib import admin
from .models import Payment, User, Customer, Log

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'user_type', 'is_staff', 'is_superuser', 'is_active', 'date_joined')
    list_filter = ('user_type', 'is_staff', 'is_superuser', 'is_active', 'date_joined')
    search_fields = ('username', 'email')

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'email', 'phone', 'is_active', 'created_by', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('name', 'email', 'phone')
    readonly_fields = ('created_by', 'created_at', 'updated_at')

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('customer', 'amount', 'date', 'created_by', 'description')
    list_filter = ('date', 'created_by')
    search_fields = ('customer__name', 'customer__email', 'description')
    readonly_fields = ('created_by',)

@admin.register(Log)
class LogAdmin(admin.ModelAdmin):
    list_display = ('user', 'action', 'description', 'created_at')
    list_filter = ('action', 'created_at', 'user')
    search_fields = ('user__username', 'action', 'description')
    readonly_fields = ('user', 'action', 'description', 'created_at')
    ordering = ('-created_at',)
    
    def has_add_permission(self, request):
        return False  # Logs should only be created automatically
    
    def has_change_permission(self, request, obj=None):
        return False  # Logs should not be editable
    
    def has_delete_permission(self, request, obj=None):
        return request.user.is_superuser  # Only superusers can delete logs
