from django.contrib import admin
from .models import Order, OrderItem, Food


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "table",
        "status",
        "total",
        "created_at",
    )

    list_filter = (
        "status",
    )

    inlines = [OrderItemInline]


admin.site.register(Food)