from django.shortcuts import render, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.db import transaction
from django.utils import timezone

import json

from .models import Order, OrderItem, Food, Category


# =========================================================
# صفحات
# =========================================================

def customer(request):
    return render(request, "customer.html")


def dashboard(request):
    return render(request, "dashboard.html")


def order_tracking(request, id):
    order = get_object_or_404(Order, id=id)

    return render(
        request,
        "order_tracking.html",
        {
            "order": order
        }
    )


# =========================================================
# غذاها
# =========================================================

def get_foods(request):

    categories = Category.objects.prefetch_related(
        "foods"
    )


    result=[]


    for category in categories:

        foods=[]


        for food in category.foods.all():
            foods.append({

                "id": food.id,

                "name": food.name,

                "description": food.description,

                "price": food.price,

                "stock": food.stock,

                "category": category.name,

                "image":
                    food.image.url
                    if food.image
                    else ""

            })


        result.append({

            "id": category.id,

            "name": category.name,

            "icon": category.icon,

            "foods": foods

        })


    return JsonResponse(
        result,
        safe=False
    )

# =========================================================
# ایجاد غذا + عکس
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

        # ۱. دریافت شناسه دسته‌بندی از فرانت‌اند
        category_id = request.POST.get("category_id")

        image = request.FILES.get("image")

        # -------------------------
        # اعتبارسنجی
        # -------------------------

        if not name:
            return JsonResponse(
                {
                    "success": False,
                    "error": "نام غذا وارد نشده است."
                },
                status=400
            )

        # ۲. بررسی اینکه دسته‌بندی انتخاب شده باشد
        if not category_id:
            return JsonResponse(
                {
                    "success": False,
                    "error": "لطفاً دسته‌بندی غذا را انتخاب کنید."
                },
                status=400
            )

        try:
            price = int(price)
            stock = int(stock)
            category_id = int(category_id)

        except (ValueError, TypeError):

            return JsonResponse(
                {
                    "success": False,
                    "error": "اطلاعات وارد شده نامعتبر است."
                },
                status=400
            )

        if price < 0:
            return JsonResponse(
                {
                    "success": False,
                    "error": "قیمت نمی‌تواند منفی باشد."
                },
                status=400
            )

        if stock < 0:
            return JsonResponse(
                {
                    "success": False,
                    "error": "موجودی نمی‌تواند منفی باشد."
                },
                status=400
            )

        # ۳. بررسی وجود داشتن دسته در دیتابیس
        try:
            category = Category.objects.get(id=category_id)
        except Category.DoesNotExist:
            return JsonResponse(
                {
                    "success": False,
                    "error": "دسته‌بندی انتخاب شده وجود ندارد."
                },
                status=404
            )

        # -------------------------
        # ایجاد غذا
        # -------------------------

        # ۴. ارسال category به مدل Food
        food = Food.objects.create(
            category=category,
            name=name,
            price=price,
            stock=stock,
            image=image
        )

        return JsonResponse(
            {
                "success": True,
                "food": {
                    "id": food.id,
                    "name": food.name,
                    "category": food.category.name,
                    "price": food.price,
                    "stock": food.stock,
                    "image": food.image.url if food.image else ""
                }
            }
        )

    except Exception as e:

        return JsonResponse(
            {
                "success": False,
                "error": str(e)
            },
            status=500
        )

# =========================================================
# ویرایش غذا
# =========================================================

@csrf_exempt
def update_food(request, id):

    if request.method != "PUT":

        return JsonResponse(
            {
                "success": False,
                "error": "PUT only"
            },
            status=405
        )

    try:

        food = Food.objects.get(id=id)

    except Food.DoesNotExist:

        return JsonResponse(
            {
                "success": False,
                "error": "غذا پیدا نشد."
            },
            status=404
        )

    try:

        data = json.loads(request.body)

        name = data.get("name", food.name)
        price = data.get("price", food.price)
        stock = data.get("stock", food.stock)

        price = int(price)
        stock = int(stock)

        if price < 0:
            return JsonResponse(
                {
                    "success": False,
                    "error": "قیمت نمی‌تواند منفی باشد."
                },
                status=400
            )

        if stock < 0:
            return JsonResponse(
                {
                    "success": False,
                    "error": "موجودی نمی‌تواند منفی باشد."
                },
                status=400
            )

        food.name = name
        food.price = price
        food.stock = stock

        food.save()

        return JsonResponse(
            {
                "success": True,
                "id": food.id,
                "name": food.name,
                "price": food.price,
                "stock": food.stock,
                "image": food.image.url if food.image else ""
            }
        )

    except Exception as e:

        return JsonResponse(
            {
                "success": False,
                "error": str(e)
            },
            status=400
        )


# =========================================================
# حذف غذا
# =========================================================

@csrf_exempt
def delete_food(request, id):

    if request.method != "DELETE":

        return JsonResponse(
            {
                "success": False,
                "error": "DELETE only"
            },
            status=405
        )

    try:

        food = Food.objects.get(id=id)

    except Food.DoesNotExist:

        return JsonResponse(
            {
                "success": False,
                "error": "غذا پیدا نشد."
            },
            status=404
        )

    food.delete()

    return JsonResponse(
        {
            "success": True
        }
    )


# =========================================================
# ثبت سفارش
# کاهش موجودی
# =========================================================

@csrf_exempt
@transaction.atomic
def create_order(request):

    if request.method != "POST":

        return JsonResponse(
            {
                "success": False,
                "error": "POST only"
            },
            status=405
        )

    try:

        data = json.loads(request.body)

        table = data.get("table")
        foods = data.get("foods", [])

        # -------------------------
        # بررسی اطلاعات
        # -------------------------

        if not table:

            return JsonResponse(
                {
                    "success": False,
                    "error": "شماره میز مشخص نشده است."
                },
                status=400
            )

        if not foods:

            return JsonResponse(
                {
                    "success": False,
                    "error": "سبد خرید خالی است."
                },
                status=400
            )

        total = 0

        order_items = []

        # -------------------------
        # بررسی موجودی
        # -------------------------

        for item in foods:

            food_id = item.get("id")

            try:
                quantity = int(item.get("qty", 0))
            except (ValueError, TypeError):
                quantity = 0

            if quantity <= 0:

                return JsonResponse(
                    {
                        "success": False,
                        "error": "تعداد غذا نامعتبر است."
                    },
                    status=400
                )

            try:

                food = Food.objects.select_for_update().get(
                    id=food_id
                )

            except Food.DoesNotExist:

                return JsonResponse(
                    {
                        "success": False,
                        "error":
                            f"غذا با شناسه {food_id} پیدا نشد."
                    },
                    status=404
                )

            # -------------------------
            # بررسی موجودی
            # -------------------------

            if food.stock < quantity:

                return JsonResponse(
                    {
                        "success": False,
                        "error":
                            f"موجودی «{food.name}» کافی نیست. "
                            f"موجودی فعلی: {food.stock}"
                    },
                    status=400
                )

            total += food.price * quantity

            order_items.append(
                {
                    "food": food,
                    "quantity": quantity
                }
            )

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

        return JsonResponse(
            {
                "success": True,
                "order_id": order.id,
                "total": total,
                "status": "new",
                "message": "سفارش با موفقیت ثبت شد."
            }
        )

    except json.JSONDecodeError:

        return JsonResponse(
            {
                "success": False,
                "error": "اطلاعات ارسال‌شده معتبر نیست."
            },
            status=400
        )

    except Exception as e:

        return JsonResponse(
            {
                "success": False,
                "error": str(e)
            },
            status=500
        )


# =========================================================
# دریافت سفارش‌ها برای داشبورد
# =========================================================

def get_orders(request):

    orders = Order.objects.filter(
        status__in=[
            "new",
            "cooking",
            "ready",
            "sent",
            "done",
            "rejected"
        ]
    ).order_by("-id")

    result = []

    for order in orders:

        items = []

        for item in order.items.all():

            items.append(
                {
                    "name": item.name,
                    "quantity": item.quantity,
                    "price": item.price
                }
            )

        # -------------------------
        # محاسبه پیشرفت آماده‌سازی
        # -------------------------

        progress = 0
        remaining_seconds = 0

        if (
            order.status == "cooking"
            and order.cooking_started_at
        ):

            elapsed = (
                timezone.now()
                - order.cooking_started_at
            ).total_seconds()

            total_time = 5 * 60

            progress = min(
                int(
                    (elapsed / total_time)
                    * 100
                ),
                100
            )

            remaining_seconds = max(
                int(total_time - elapsed),
                0
            )

        elif order.status in [
            "ready",
            "sent",
            "done"
        ]:

            progress = 100

        result.append(
            {
                "id": order.id,
                "table": order.table,
                "status": order.status,
                "total": order.total,

                "progress": progress,

                "remaining_seconds":
                    remaining_seconds,

                "items": items
            }
        )

    return JsonResponse(
        result,
        safe=False
    )


# =========================================================
# تایید سفارش
# شروع آماده‌سازی
# =========================================================

@csrf_exempt
def accept_order(request, id):

    if request.method != "POST":

        return JsonResponse(
            {
                "success": False,
                "error": "POST only"
            },
            status=405
        )

    try:

        order = Order.objects.get(id=id)

    except Order.DoesNotExist:

        return JsonResponse(
            {
                "success": False,
                "error": "سفارش پیدا نشد."
            },
            status=404
        )

    # اگر سفارش قبلاً رد یا تکمیل شده باشد
    if order.status != "new":

        return JsonResponse(
            {
                "success": False,
                "error": "این سفارش قابل تایید نیست."
            },
            status=400
        )

    # -------------------------
    # شروع آماده‌سازی
    # -------------------------

    order.status = "cooking"

    order.cooking_started_at = timezone.now()

    order.save(
        update_fields=[
            "status",
            "cooking_started_at"
        ]
    )

    return JsonResponse(
        {
            "success": True,
            "status": "cooking",
            "message":
                "سفارش تایید شد و وارد مرحله آماده‌سازی شد."
        }
    )


# =========================================================
# رد سفارش
# =========================================================

@csrf_exempt
def reject_order(request, id):

    if request.method != "POST":

        return JsonResponse(
            {
                "success": False,
                "error": "POST only"
            },
            status=405
        )

    try:

        order = Order.objects.get(id=id)

    except Order.DoesNotExist:

        return JsonResponse(
            {
                "success": False,
                "error": "سفارش پیدا نشد."
            },
            status=404
        )

    if order.status != "new":

        return JsonResponse(
            {
                "success": False,
                "error":
                    "این سفارش دیگر قابل رد کردن نیست."
            },
            status=400
        )

    order.status = "rejected"

    order.save(
        update_fields=["status"]
    )

    return JsonResponse(
        {
            "success": True,
            "status": "rejected",
            "message":
                "سفارش توسط رستوران رد شد."
        }
    )


# =========================================================
# آماده شدن سفارش
# =========================================================

@csrf_exempt
def ready_order(request, id):

    if request.method != "POST":

        return JsonResponse(
            {
                "success": False,
                "error": "POST only"
            },
            status=405
        )

    try:

        order = Order.objects.get(id=id)

    except Order.DoesNotExist:

        return JsonResponse(
            {
                "success": False,
                "error": "سفارش پیدا نشد."
            },
            status=404
        )

    if order.status != "cooking":

        return JsonResponse(
            {
                "success": False,
                "error":
                    "این سفارش در حال آماده‌سازی نیست."
            },
            status=400
        )

    order.status = "ready"

    order.save(
        update_fields=["status"]
    )

    return JsonResponse(
        {
            "success": True,
            "status": "ready",
            "message":
                "سفارش آماده شد."
        }
    )


# =========================================================
# ارسال سفارش به ربات
# =========================================================

@csrf_exempt
def send_order(request, id):

    if request.method != "POST":

        return JsonResponse(
            {
                "success": False,
                "error": "POST only"
            },
            status=405
        )

    try:

        order = Order.objects.get(id=id)

    except Order.DoesNotExist:

        return JsonResponse(
            {
                "success": False,
                "error": "سفارش پیدا نشد."
            },
            status=404
        )

    if order.status != "ready":

        return JsonResponse(
            {
                "success": False,
                "error":
                    "سفارش هنوز آماده ارسال نیست."
            },
            status=400
        )

    order.status = "sent"

    order.save(
        update_fields=["status"]
    )

    return JsonResponse(
        {
            "success": True,
            "status": "sent",
            "message":
                "سفارش برای ربات ارسال شد."
        }
    )


# =========================================================
# دریافت دسته‌بندی‌ها
# =========================================================

def get_categories(request):
    categories = Category.objects.all()
    result = []
    for cat in categories:
        result.append({
            "id": cat.id,
            "name": cat.name,
            "icon": cat.icon
        })
    return JsonResponse(result, safe=False)


# =========================================================
# ایجاد دسته‌بندی جدید
# =========================================================

@csrf_exempt
def create_category(request):
    if request.method != "POST":
        return JsonResponse({"success": False, "error": "POST only"}, status=405)

    try:
        name = request.POST.get("name", "").strip()
        icon = request.POST.get("icon", "🍽").strip()

        if not name:
            return JsonResponse({"success": False, "error": "نام دسته وارد نشده است."}, status=400)

        category = Category.objects.create(name=name, icon=icon)

        return JsonResponse({
            "success": True,
            "category": {
                "id": category.id,
                "name": category.name,
                "icon": category.icon
            }
        })
    except Exception as e:
        return JsonResponse({"success": False, "error": str(e)}, status=500)
# =========================================================
# دریافت اطلاعات یک سفارش
# برای صفحه Tracking مشتری
# =========================================================

def get_order(request, id):

    try:

        order = Order.objects.get(id=id)

    except Order.DoesNotExist:

        return JsonResponse(
            {
                "success": False,
                "error": "سفارش پیدا نشد."
            },
            status=404
        )

    # -------------------------
    # محاسبه پیشرفت
    # -------------------------

    progress = 0
    remaining_seconds = 0

    if (
        order.status == "cooking"
        and order.cooking_started_at
    ):

        elapsed = (
            timezone.now()
            - order.cooking_started_at
        ).total_seconds()

        total_time = 5 * 60

        progress = min(
            int(
                (elapsed / total_time)
                * 100
            ),
            100
        )

        remaining_seconds = max(
            int(total_time - elapsed),
            0
        )

    elif order.status in [
        "ready",
        "sent",
        "done"
    ]:

        progress = 100

    # -------------------------
    # مراحل سفارش
    # -------------------------

    steps = [
        {
            "key": "new",
            "title": "ثبت سفارش"
        },
        {
            "key": "cooking",
            "title": "تأیید و آماده‌سازی"
        },
        {
            "key": "ready",
            "title": "آماده"
        },
        {
            "key": "sent",
            "title": "ارسال با ربات"
        },
        {
            "key": "done",
            "title": "تحویل شد"
        }
    ]

    status_order = [
        "new",
        "cooking",
        "ready",
        "sent",
        "done"
    ]

    current_index = (
        status_order.index(order.status)
        if order.status in status_order
        else -1
    )

    for index, step in enumerate(steps):

        step["completed"] = (
            current_index >= index
        )

        step["current"] = (
            current_index == index
        )

    # -------------------------
    # آیتم‌های سفارش
    # -------------------------

    items = []

    for item in order.items.all():

        items.append(
            {
                "name": item.name,
                "quantity": item.quantity,
                "price": item.price
            }
        )

    return JsonResponse(
        {
            "success": True,

            "id": order.id,

            "table": order.table,

            "status": order.status,

            "total": order.total,

            "progress": progress,

            "remaining_seconds":
                remaining_seconds,

            "steps": steps,

            "items": items,

            "rejected":
                order.status == "rejected"
        }
    )

