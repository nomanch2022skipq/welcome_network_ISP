from django.shortcuts import render
from rest_framework import generics, permissions, filters
from .models import Payment, User, Customer, Log
from .serializers import PaymentSerializer, UserSerializer, CustomerSerializer, LogSerializer
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from django.db.models import Q
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView

# Create your views here.

class IsAdminOrOwner(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        print(request.user.user_type in ['admin', 'Admin'])
        if request.user.is_superuser or request.user.is_staff or request.user.user_type in ['admin', 'Admin']:
            return True
        # For payments, check if user created the customer
        if hasattr(obj, 'customer'):
            return obj.customer.created_by == request.user
        # For customers, check if user created them
        if hasattr(obj, 'created_by'):
            return obj.created_by == request.user
        return False

class CustomerListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = CustomerSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'email', 'phone']
    ordering_fields = ['name', 'created_at']

    def get_queryset(self):
        queryset = Customer.objects.all()
        user = self.request.user
        
        # Admins can see all customers. Employees can also see all customers now.
        # The `has_object_permission` in IsAdminOrOwner will handle object-level permissions.
        return queryset

    def perform_create(self, serializer):
        # Automatically set the created_by field to current user
        serializer.save(created_by=self.request.user)

class CustomerRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CustomerSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminOrOwner]
    queryset = Customer.objects.all()

class UserRegistrationView(APIView):
    permission_classes = [IsAdminUser]
    serializer_class = UserSerializer
    
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        username = serializer.validated_data.get('username')
        if User.objects.filter(username=username).exists():
            return Response(
                {'error': 'Username already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create user using serializer's create method, which handles password hashing
        user = serializer.save()
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class UserListView(APIView):
    permission_classes = [IsAdminOrOwner]
    
    def get(self, request):
        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

class UserRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrOwner]
    queryset = User.objects.all()

class PaymentListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['customer__name', 'customer__email', 'description']
    ordering_fields = ['date', 'amount']

    def get_queryset(self):
        queryset = Payment.objects.all()
        user = self.request.user
        
        # Filter by date range if provided
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        
        # If not admin, only show payments for customers created by this user
        if not (user.is_superuser or user.is_staff):
            queryset = queryset.filter(customer__created_by=user)
        
        if start_date and end_date:
            queryset = queryset.filter(date__range=[start_date, end_date])
        
        return queryset

    def perform_create(self, serializer):
        # Set the created_by field to current user
        serializer.save(created_by=self.request.user)

class PaymentRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PaymentSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminOrOwner]
    queryset = Payment.objects.all()

class LogListView(generics.ListAPIView):
    serializer_class = LogSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__username', 'action', 'description']
    ordering_fields = ['created_at', 'user__username', 'action']
    
    def get_queryset(self):
        return Log.objects.all()
