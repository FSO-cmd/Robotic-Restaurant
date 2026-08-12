from django.db import models

# Create your models here.
from django.db import models

class Food(models.Model):

    name = models.CharField(
        max_length=100
    )

    price = models.PositiveIntegerField(
        default=0
    )

    stock = models.PositiveIntegerField(
        default=0
    )

    image = models.ImageField(
        upload_to="foods/",
        blank=True,
        null=True
    )


    def __str__(self):
        return self.name

class Order(models.Model):

    STATUS = [

        ("new","جدید"),

        ("accepted","تایید شده"),

        ("cooking","در حال آماده سازی"),

        ("ready","آماده بارگیری"),

        ("sent","ارسال شده"),

        ("done","تحویل شده"),

        ("rejected","رد شده")

    ]

    table = models.IntegerField()

    total = models.IntegerField()

    status = models.CharField(

        max_length=20,

        choices=STATUS,

        default="new"

    )

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):

        return f"Order {self.id}"


class OrderItem(models.Model):

    order=models.ForeignKey(

        Order,

        on_delete=models.CASCADE,

        related_name="items"

    )

    name=models.CharField(max_length=100)

    quantity=models.IntegerField()

    price=models.IntegerField()

    def __str__(self):

        return self.name