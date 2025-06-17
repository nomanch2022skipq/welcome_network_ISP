from django.db import models
from django.contrib.auth.models import AbstractUser

# Create your models here.

class User(AbstractUser):
    user_type_choices = (
        ('admin', 'Admin'),
        ('employee', 'Employee'),
    )
    user_type = models.CharField(max_length=10, choices=user_type_choices, default='employee')
    
    class Meta:
        verbose_name = 'User'
        verbose_name_plural = 'Users'


class Customer(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    package_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    # Automatically assign customer to the user who creates it
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='customers_created'
    )
    
    class Meta:
        verbose_name = 'Customer'
        verbose_name_plural = 'Customers'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} ({self.email})"


class Payment(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='payments', default=None)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateTimeField(auto_now_add=True)
    description = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField(default=True)
    
    # Track who created/processed the payment
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name='payments_created'
    )
    
    class Meta:
        verbose_name = 'Payment'
        verbose_name_plural = 'Payments'
        ordering = ['-date']
    
    def __str__(self):
        return f"{self.customer.name} - {self.amount} on {self.date}"


class Log(models.Model):
    ACTION_CHOICES = [
        ('user_created', 'User Created'),
        ('user_updated', 'User Updated'),
        ('user_deleted', 'User Deleted'),
        ('user_login', 'User Login'),
        ('user_logout', 'User Logout'),
        ('customer_created', 'Customer Created'),
        ('customer_updated', 'Customer Updated'),
        ('customer_deleted', 'Customer Deleted'),
        ('payment_created', 'Payment Created'),
        ('payment_updated', 'Payment Updated'),
        ('payment_deleted', 'Payment Deleted'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='logs')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.username} - {self.get_action_display()} - {self.created_at}"
