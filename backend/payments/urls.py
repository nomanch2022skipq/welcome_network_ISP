from django.urls import path
from .views import PaymentListCreateAPIView, PaymentRetrieveUpdateDestroyAPIView, UserRegistrationView, UserListView, CustomerListCreateAPIView, CustomerRetrieveUpdateDestroyAPIView, UserRetrieveUpdateDestroyAPIView, LogListView, CurrentUserView, CustomerReactivateAPIView, UserReactivateAPIView

urlpatterns = [
    path('payments/', PaymentListCreateAPIView.as_view(), name='payment-list-create'),
    path('payments/<int:pk>/', PaymentRetrieveUpdateDestroyAPIView.as_view(), name='payment-retrieve-update-destroy'),
    path('customers/', CustomerListCreateAPIView.as_view(), name='customer-list-create'),
    path('customers/<int:pk>/', CustomerRetrieveUpdateDestroyAPIView.as_view(), name='customer-retrieve-update-destroy'),
    path('customers/<int:pk>/reactivate/', CustomerReactivateAPIView.as_view(), name='customer-reactivate'),
    path('users/register/', UserRegistrationView.as_view(), name='user-register'),
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/me/', CurrentUserView.as_view(), name='current-user'),
    path('users/<int:pk>/', UserRetrieveUpdateDestroyAPIView.as_view(), name='user-retrieve-update-destroy'),
    path('users/<int:pk>/reactivate/', UserReactivateAPIView.as_view(), name='user-reactivate'),
    path('logs/', LogListView.as_view(), name='log-list'),
] 