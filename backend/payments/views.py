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
from .pagination import CustomPagination
import datetime
from django.utils import timezone

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
    pagination_class = CustomPagination

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

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()

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

class UserListView(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrOwner]
    pagination_class = CustomPagination
    queryset = User.objects.all()

class UserRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAdminOrOwner]
    queryset = User.objects.all()

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()

class PaymentListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PaymentSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    # Removed all filter_backends to gain full manual control
    # filter_backends = [filters.OrderingFilter]
    search_fields = ['customer__name', 'customer__email', 'description'] # Still useful for documentation
    ordering_fields = ['date', 'amount'] # Still useful for documentation
    ordering = ['-date'] # Default ordering
    pagination_class = CustomPagination

    def get_queryset(self):
        queryset = Payment.objects.all()
        user = self.request.user

        print(f"Request User: {user.username}, Is Superuser: {user.is_superuser}, Is Staff: {user.is_staff}")

        # Step 1: Apply default access control based on user type
        # Non-admins should only see payments they themselves created.
        if not (user.is_superuser or user.is_staff):
            print("Applying non-admin access control: filtering by created_by=user")
            queryset = queryset.filter(created_by=user)
            print("Permissions filter applied")

        # Step 2: Apply 'created_by' filter from query parameters
        created_by_user_id = self.request.query_params.get('created_by')
        print(f"Created By User ID from params: {created_by_user_id}")

        if created_by_user_id and created_by_user_id != 'all':
            if user.is_superuser or user.is_staff: # Admin can filter by any specific user
                print(f"Admin: Applying created_by filter for ID: {created_by_user_id}")
                queryset = queryset.filter(created_by_id=created_by_user_id)
            else: # Non-admin: If they specify an ID, it *must* be their own. Otherwise, return empty.
                if str(user.id) == created_by_user_id:
                    print(f"Non-admin: Filtering by own ID ({created_by_user_id}). Queryset remains as per permissions.")
                    # No additional filter needed here, as it's already covered by Step 1
                else:
                    print(f"Non-admin: Attempted to filter by another user ({created_by_user_id}). Returning empty queryset.")
                    queryset = queryset.none() # This will make the queryset empty, overriding any previous filters.
        elif not (user.is_superuser or user.is_staff) and created_by_user_id == 'all':
            # If non-admin selects 'all', they still only see their own payments (already handled by Step 1).
            print(f"Non-admin selected 'all'. Queryset remains as per permissions.")
            # No explicit filter needed, already covered by Step 1.

        print("Created By filter applied")

        # Step 3: Apply date range filter if provided
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        print(f"Date Range: Start={start_date}, End={end_date}")

        if start_date and end_date:
            try:
                start_date_obj = datetime.date.fromisoformat(start_date)
                end_date_obj = datetime.date.fromisoformat(end_date)
                # Convert to datetime objects for DateTimeField filtering
                start_datetime = datetime.datetime.combine(start_date_obj, datetime.time.min)
                end_datetime = datetime.datetime.combine(end_date_obj, datetime.time.max)
                print(f"Applying date range filter: {start_datetime} to {end_datetime}")
                queryset = queryset.filter(date__gte=start_datetime, date__lte=end_datetime)
                print("Date range filter applied")
            except ValueError as e:
                print(f"Invalid date format received or parsing error: {e}")
                pass # Continue with other filters even if date parsing fails

        # Step 4: Manually apply search filter
        search_term = self.request.query_params.get('search', None)
        print(f"Search Term: {search_term}")
        if search_term:
            print(f"Applying search filter for term: '{search_term}'")
            queryset = queryset.filter(
                Q(customer__name__icontains=search_term) |
                Q(customer__email__icontains=search_term) |
                Q(description__icontains=search_term)
            )
            print("Search filter applied")

        # Step 5: Apply ordering manually
        order_by = self.request.query_params.get('ordering', '-date')
        print(f"Applying ordering by: {order_by}")
        queryset = queryset.order_by(order_by)

        print("All filters applied successfully")
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

class PaymentRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PaymentSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminOrOwner]
    queryset = Payment.objects.all()

    def perform_update(self, serializer):
        serializer.save()

    def perform_destroy(self, instance):
        instance.delete()

class LogListView(generics.ListAPIView):
    serializer_class = LogSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAdminUser]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__username', 'action', 'description']
    ordering_fields = ['created_at', 'user__username', 'action']
    pagination_class = CustomPagination
    
    def get_queryset(self):
        return Log.objects.all()

class CurrentUserView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)
