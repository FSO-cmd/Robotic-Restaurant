from django.urls import path
from . import views

urlpatterns = [

    path("", views.customer, name="customer"),

    path("dashboard/", views.dashboard, name="dashboard"),

    path("api/create_order/", views.create_order, name="create_order"),

    path("api/orders/", views.get_orders, name="get_orders"),

    path("api/orders/<int:id>/accept/", views.accept_order, name="accept_order"),

    path("api/orders/<int:id>/reject/", views.reject_order, name="reject_order"),
    path("api/foods/", views.get_foods, name="foods"),

]