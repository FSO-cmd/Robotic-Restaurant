from django.shortcuts import render
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

import json

from .models import Order, OrderItem, Food


# =========================
# صفحه مشتری
# =========================

def customer(request):

    foods = Food.objects.all().order_by("id")

    return render(
        request,
        "customer.html",
        {
            "foods": foods
        }
    )


# =========================
# داشبورد فیدر
# =========================

def dashboard(request):

    return render(
        request,
        "dashboard.html"
    )


# =========================
# دریافت لیست غذاها
# =========================

def get_foods(request):

    foods = Food.objects.all().order_by("id")

    result = []

    for food in foods:

        result.append({

            "id": food.id,

            "name": food.name,

            "stock": food.stock,

            "price": food.price

        })

    return JsonResponse(
        result,
        safe=False
    )

@csrf_exempt
def create_food(request):

    if request.method != "POST":
        return JsonResponse({
            "error": "POST only"
        }, status=405)

    data = json.loads(request.body)

    food = Food.objects.create(
        name=data["name"],
        price=data["price"],
        stock=data["stock"]
    )

    return JsonResponse({
        "success": True,
        "id": food.id,
        "name": food.name,
        "price": food.price,
        "stock": food.stock
    })

@csrf_exempt
def update_food(request, id):

    if request.method != "PUT":
        return JsonResponse({
            "error": "PUT only"
        })

    try:
        food = Food.objects.get(id=id)

    except Food.DoesNotExist:
        return JsonResponse({
            "error": "Food not found"
        }, status=404)

    data = json.loads(request.body)

    food.name = data.get("name", food.name)
    food.price = data.get("price", food.price)
    food.stock = data.get("stock", food.stock)

    food.save()

    return JsonResponse({
        "success": True,
        "id": food.id,
        "name": food.name,
        "price": food.price,
        "stock": food.stock
    })
# =========================
# ایجاد سفارش
# =========================

@csrf_exempt
def create_order(request):

    if request.method != "POST":

        return JsonResponse(
            {
                "error": "POST only"
            },
            status=405
        )

    data = json.loads(request.body)

    order = Order.objects.create(

        table=data["table"],

        total=data["total"]

    )

    for food in data["foods"]:

        OrderItem.objects.create(

            order=order,

            name=food["name"],

            quantity=food["qty"],

            price=food["price"]

        )

    return JsonResponse({

        "success": True,

        "id": order.id

    })


# =========================
# دریافت سفارش‌های جدید
# =========================

def get_orders(request):

    orders = Order.objects.filter(

        status="new"

    ).order_by("-id")

    result = []

    for order in orders:

        items = []

        for item in order.items.all():

            items.append({

                "name": item.name,

                "quantity": item.quantity,

                "price": item.price

            })

        result.append({

            "id": order.id,

            "table": order.table,

            "status": order.status,

            "total": order.total,

            "items": items

        })

    return JsonResponse(
        result,
        safe=False
    )


# =========================
# تایید سفارش
# =========================

@csrf_exempt
def accept_order(request, id):

    order = Order.objects.get(id=id)

    order.status = "accepted"

    order.save()

    return JsonResponse({

        "success": True

    })


# =========================
# رد سفارش
# =========================

@csrf_exempt
def reject_order(request, id):

    order = Order.objects.get(id=id)

    order.status = "rejected"

    order.save()

    return JsonResponse({

        "success": True

    })

@csrf_exempt
def delete_food(request, id):

    if request.method != "DELETE":
        return JsonResponse({
            "error": "DELETE only"
        }, status=405)

    try:
        food = Food.objects.get(id=id)
    except Food.DoesNotExist:
        return JsonResponse({
            "error": "Food not found"
        }, status=404)

    food.delete()

    return JsonResponse({
        "success": True
    })