from django.shortcuts import render, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db import transaction

import json

from .models import Order, OrderItem, Food


# =========================================================
# صفحه مشتری
# =========================================================

def customer(request):
    return render(request, "customer.html")


# =========================================================
# داشبورد
# =========================================================

def dashboard(request):
    return render(request, "dashboard.html")


# =========================================================
# دریافت غذاها
# =========================================================

def get_foods(request):

    foods = Food.objects.all().order_by("id")

    data = []

    for food in foods:

        data.append({
            "id": food.id,
            "name": food.name,
            "price": food.price,
            "stock": food.stock,
            "image": food.image.url if food.image else ""
        })

    return JsonResponse(data, safe=False)


# =========================================================
# افزودن غذا
# =========================================================

@csrf_exempt
def create_food(request):

    if request.method != "POST":
        return JsonResponse(
            {
                "success": False,
                "error": "POST only"
            },
            status=405
        )

    try:

        name = request.POST.get("name", "").strip()
        price = request.POST.get("price", "0")
        stock = request.POST.get("stock", "0")

        image = request.FILES.get("image")

        # -------------------------
        # اعتبارسنجی
        # -------------------------

        if not name:
            return JsonResponse({
                "success": False,
                "error": "نام غذا وارد نشده است."
            }, status=400)

        try:
            price = int(price)
            stock = int(stock)
        except ValueError:
            return JsonResponse({
                "success": False,
                "error": "قیمت یا موجودی نامعتبر است."
            }, status=400)

        if price < 0:
            return JsonResponse({
                "success": False,
                "error": "قیمت نمی‌تواند منفی باشد."
            }, status=400)

        if stock < 0:
            return JsonResponse({
                "success": False,
                "error": "موجودی نمی‌تواند منفی باشد."
            }, status=400)

        # -------------------------
        # ایجاد غذا
        # -------------------------

        food = Food.objects.create(
            name=name,
            price=price,
            stock=stock,
            image=image
        )

        return JsonResponse({
            "success": True,
            "food": {
                "id": food.id,
                "name": food.name,
                "price": food.price,
                "stock": food.stock,
                "image": food.image.url if food.image else ""
            }
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)


# =========================================================
# ویرایش غذا
# =========================================================

@csrf_exempt
def update_food(request, id):

    if request.method != "PUT":
        return JsonResponse({
            "success": False,
            "error": "PUT only"
        }, status=405)

    try:

        food = Food.objects.get(id=id)

    except Food.DoesNotExist:

        return JsonResponse({
            "success": False,
            "error": "غذا پیدا نشد."
        }, status=404)

    try:

        data = json.loads(request.body)

        name = data.get("name", food.name)
        price = data.get("price", food.price)
        stock = data.get("stock", food.stock)

        food.name = name
        food.price = int(price)
        food.stock = int(stock)

        food.save()

        return JsonResponse({
            "success": True,
            "id": food.id,
            "name": food.name,
            "price": food.price,
            "stock": food.stock,
            "image": food.image.url if food.image else ""
        })

    except Exception as e:

        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=400)


# =========================================================
# حذف غذا
# =========================================================

@csrf_exempt
def delete_food(request, id):

    if request.method != "DELETE":
        return JsonResponse({
            "success": False,
            "error": "DELETE only"
        }, status=405)

    try:

        food = Food.objects.get(id=id)

    except Food.DoesNotExist:

        return JsonResponse({
            "success": False,
            "error": "غذا پیدا نشد."
        }, status=404)

    food.delete()

    return JsonResponse({
        "success": True
    })


# =========================================================
# ثبت سفارش + کاهش موجودی
# =========================================================

@csrf_exempt
@transaction.atomic
def create_order(request):

    if request.method != "POST":

        return JsonResponse({
            "success": False,
            "error": "POST only"
        }, status=405)

    try:

        data = json.loads(request.body)

        table = data.get("table")
        foods = data.get("foods", [])

        # -------------------------
        # بررسی اطلاعات
        # -------------------------

        if not table:

            return JsonResponse({
                "success": False,
                "error": "شماره میز مشخص نشده است."
            }, status=400)

        if not foods:

            return JsonResponse({
                "success": False,
                "error": "سبد خرید خالی است."
            }, status=400)

        total = 0
        order_items = []

        # -------------------------
        # بررسی موجودی
        # -------------------------

        for item in foods:

            food_id = item.get("id")
            quantity = int(item.get("qty", 0))

            if quantity <= 0:

                return JsonResponse({
                    "success": False,
                    "error": "تعداد غذا نامعتبر است."
                }, status=400)

            try:

                food = Food.objects.select_for_update().get(
                    id=food_id
                )

            except Food.DoesNotExist:

                return JsonResponse({
                    "success": False,
                    "error": f"غذا با شناسه {food_id} پیدا نشد."
                }, status=404)

            # -------------------------
            # بررسی موجودی
            # -------------------------

            if food.stock < quantity:

                return JsonResponse({
                    "success": False,
                    "error":
                        f"موجودی «{food.name}» کافی نیست. "
                        f"موجودی فعلی: {food.stock}"
                }, status=400)

            total += food.price * quantity

            order_items.append({
                "food": food,
                "quantity": quantity
            })

        # -------------------------
        # ایجاد سفارش
        # -------------------------

        order = Order.objects.create(
            table=table,
            total=total,
            status="new"
        )

        # -------------------------
        # ایجاد آیتم‌ها
        # + کاهش موجودی
        # -------------------------

        for item in order_items:

            food = item["food"]
            quantity = item["quantity"]

            OrderItem.objects.create(
                order=order,
                name=food.name,
                quantity=quantity,
                price=food.price
            )

            food.stock -= quantity

            food.save(
                update_fields=["stock"]
            )

        # -------------------------
        # پاسخ
        # -------------------------

        return JsonResponse({
            "success": True,
            "order_id": order.id,
            "total": total
        })

    except json.JSONDecodeError:

        return JsonResponse({
            "success": False,
            "error": "اطلاعات JSON نامعتبر است."
        }, status=400)

    except Exception as e:

        return JsonResponse({
            "success": False,
            "error": str(e)
        }, status=500)


# =========================================================
# دریافت سفارش‌های جدید
# =========================================================

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


# =========================================================
# تایید سفارش
# =========================================================

@csrf_exempt
def accept_order(request, id):

    try:

        order = Order.objects.get(id=id)

    except Order.DoesNotExist:

        return JsonResponse({
            "success": False,
            "error": "سفارش پیدا نشد."
        }, status=404)

    order.status = "accepted"

    order.save(
        update_fields=["status"]
    )

    return JsonResponse({
        "success": True
    })


# =========================================================
# رد سفارش
# =========================================================

@csrf_exempt
def reject_order(request, id):

    try:

        order = Order.objects.get(id=id)

    except Order.DoesNotExist:

        return JsonResponse({
            "success": False,
            "error": "سفارش پیدا نشد."
        }, status=404)

    order.status = "rejected"

    order.save(
        update_fields=["status"]
    )

    return JsonResponse({
        "success": True
    })


# =========================================================
# صفحه پیگیری سفارش
# =========================================================

def order_tracking(request, id):

    order = get_object_or_404(
        Order,
        id=id
    )

    return render(
        request,
        "order_tracking.html",
        {
            "order": order
        }
    )


# =========================================================
# دریافت وضعیت سفارش
# =========================================================

def get_order(request, id):

    order = get_object_or_404(
        Order,
        id=id
    )

    return JsonResponse({
        "id": order.id,
        "status": order.status,
        "table": order.table,
        "total": order.total
    })