from django.urls import path
from .views import PaymentListCreateAPIView, PaymentRetrieveUpdateDestroyAPIView, UserRegistrationView, UserListView, CustomerListCreateAPIView, CustomerRetrieveUpdateDestroyAPIView, UserRetrieveUpdateDestroyAPIView, LogListView

urlpatterns = [
    path('payments/', PaymentListCreateAPIView.as_view(), name='payment-list-create'),
    path('payments/<int:pk>/', PaymentRetrieveUpdateDestroyAPIView.as_view(), name='payment-retrieve-update-destroy'),
    path('customers/', CustomerListCreateAPIView.as_view(), name='customer-list-create'),
    path('customers/<int:pk>/', CustomerRetrieveUpdateDestroyAPIView.as_view(), name='customer-retrieve-update-destroy'),
    path('users/register/', UserRegistrationView.as_view(), name='user-register'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserRetrieveUpdateDestroyAPIView.as_view(), name='user-retrieve-update-destroy'),
    path('logs/', LogListView.as_view(), name='log-list'),
] 