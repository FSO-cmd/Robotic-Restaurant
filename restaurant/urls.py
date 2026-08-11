from django.urls import path
from . import views

urlpatterns = [

    # Pages
    path("", views.customer, name="customer"),
    path("dashboard/", views.dashboard, name="dashboard"),

    # Orders API
    path("api/create_order/", views.create_order, name="create_order"),
    path("api/orders/", views.get_orders, name="get_orders"),
    path("api/orders/<int:id>/accept/", views.accept_order, name="accept_order"),
    path("api/orders/<int:id>/reject/", views.reject_order, name="reject_order"),

    # Foods API
    path("api/foods/", views.get_foods, name="foods"),
    path("api/foods/create/", views.create_food, name="create_food"),
    path("api/foods/<int:id>/update/", views.update_food, name="update_food"),
    path("api/foods/<int:id>/delete/", views.delete_food, name="delete_food"),
]