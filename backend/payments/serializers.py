from rest_framework import serializers
from .models import Payment, User, Customer, Log

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'email', 
            'user_type', 'is_staff', 'is_superuser', 'password', 'is_active'
        ]
        read_only_fields = ('id',)

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        user_type = validated_data.pop('user_type', 'employee') # Default to employee
        
        user = User.objects.create(user_type=user_type, **validated_data)
        
        if user_type == 'admin':
            user.is_staff = True
            user.is_superuser = True
        else:
            user.is_staff = False
            user.is_superuser = False

        if password:
            user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user_type = validated_data.pop('user_type', instance.user_type)

        instance.user_type = user_type
        if user_type == 'admin':
            instance.is_staff = True
            instance.is_superuser = True
        else:
            instance.is_staff = False
            instance.is_superuser = False

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        if password:
            instance.set_password(password)
        instance.save()
        return instance

class CustomerSerializer(serializers.ModelSerializer):
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    created_by_user_type = serializers.CharField(source='created_by.user_type', read_only=True)
    
    class Meta:
        model = Customer
        fields = ['id', 'name', 'email', 'phone', 'address', 'package_fee', 'is_active', 
                 'created_at', 'updated_at', 'created_by_username', 'created_by_user_type']

class PaymentSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    customer_id = serializers.PrimaryKeyRelatedField(
        queryset=Customer.objects.all(), 
        source='customer', 
        write_only=True
    )
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    created_by_user_type = serializers.CharField(source='created_by.user_type', read_only=True)
    
    class Meta:
        model = Payment
        fields = ['id', 'customer', 'customer_id', 'amount', 'date', 'description', 'created_by_username', 'created_by_user_type']

class LogSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = Log
        fields = ['id', 'user', 'user_username', 'action', 'action_display', 'description', 'created_at']
        read_only_fields = ['id', 'created_at'] 