from django.shortcuts import render

# Create your views here.
import json

from django.http import JsonResponse

from django.views.decorators.csrf import csrf_exempt

from .models import Order

from .models import OrderItem
from django.shortcuts import render
from .models import Food
def customer(request):

    foods = Food.objects.filter(available=True)

    return render(request, "customer.html", {

        "foods": foods

    })

def get_foods(request):

    foods = Food.objects.all()

    result = []

    for food in foods:

        result.append({

            "id": food.id,
            "name": food.name,
            "stock": food.stock,
            "price": food.price

        })

    return JsonResponse(result, safe=False)
def customer(request):
    return render(request, "customer.html")
def dashboard(request):
    return render(request, "dashboard.html")
@csrf_exempt

def create_order(request):

    if request.method!="POST":

        return JsonResponse({

            "error":"POST only"

        })

    data=json.loads(request.body)

    order=Order.objects.create(

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

        "success":True,

        "id":order.id

    })
def get_orders(request):

    orders=Order.objects.filter(

        status="new"

    ).order_by("-id")

    result=[]

    for order in orders:

        items=[]

        for item in order.items.all():

            items.append({

                "name":item.name,

                "quantity":item.quantity,

                "price":item.price

            })

        result.append({

            "id":order.id,

            "table":order.table,

            "status":order.status,

            "total":order.total,

            "items":items

        })

    return JsonResponse(

        result,

        safe=False

    )
@csrf_exempt

def accept_order(request,id):

    order=Order.objects.get(id=id)

    order.status="accepted"

    order.save()

    return JsonResponse({

        "success":True

    })

@csrf_exempt

def reject_order(request,id):

    order=Order.objects.get(id=id)

    order.status="rejected"

    order.save()

    return JsonResponse({

        "success":True

    })