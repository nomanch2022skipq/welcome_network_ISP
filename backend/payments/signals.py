from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import User, Customer, Payment, Log

User = get_user_model()

@receiver(post_save, sender=User)
def log_user_action(sender, instance, created, **kwargs):
    """Log user creation and updates"""
    if created:
        Log.objects.create(
            user=instance,
            action='user_created',
            description=f'User "{instance.username}" was created'
        )
    else:
        Log.objects.create(
            user=instance,
            action='user_updated',
            description=f'User "{instance.username}" was updated'
        )

@receiver(post_delete, sender=User)
def log_user_deletion(sender, instance, **kwargs):
    """Log user deletion"""
    Log.objects.create(
        user=instance,
        action='user_deleted',
        description=f'User "{instance.username}" was deleted'
    )

@receiver(post_save, sender=Customer)
def log_customer_action(sender, instance, created, **kwargs):
    """Log customer creation and updates"""
    if created:
        Log.objects.create(
            user=instance.created_by,
            action='customer_created',
            description=f'Customer "{instance.name}" ({instance.email}) was created'
        )
    else:
        Log.objects.create(
            user=instance.created_by,
            action='customer_updated',
            description=f'Customer "{instance.name}" ({instance.email}) was updated'
        )

@receiver(post_delete, sender=Customer)
def log_customer_deletion(sender, instance, **kwargs):
    """Log customer deletion"""
    Log.objects.create(
        user=instance.created_by,
        action='customer_deleted',
        description=f'Customer "{instance.name}" ({instance.email}) was deleted'
    )

@receiver(post_save, sender=Payment)
def payment_created_log(sender, instance, created, **kwargs):
    """Log payment creation and updates"""
    if created:
        Log.objects.create(
            user=instance.created_by if instance.created_by else User.objects.get(username='system'),
            action='payment_created',
            description=f'Customer "{instance.customer.name}" were paid {instance.amount} rupees.'
        )

@receiver(post_save, sender=Payment)
def payment_updated_log(sender, instance, created, **kwargs):
    if not created:
        Log.objects.create(
            user=instance.created_by if instance.created_by else User.objects.get(username='system'),
            action='payment_updated',
            description=f'Customers "{instance.customer.name}" were paid {instance.amount} rupees.'
        )

@receiver(post_delete, sender=Payment)
def payment_deleted_log(sender, instance, **kwargs):
    """Log payment deletion"""
    Log.objects.create(
        user=instance.created_by if instance.created_by else User.objects.get(username='system'),
        action='payment_deleted',
        description=f'Customers "{instance.customer.name}" payment of {instance.amount} rupees was deleted.'
    ) 