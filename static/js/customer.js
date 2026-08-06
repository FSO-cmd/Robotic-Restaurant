/* ==========================
   Robot Restaurant
   customer.js
========================== */
function getCookie(name) {

    let cookieValue = null;

    if (document.cookie && document.cookie !== "") {

        const cookies = document.cookie.split(";");

        for (let cookie of cookies) {

            cookie = cookie.trim();

            if (cookie.startsWith(name + "=")) {

                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));

                break;

            }

        }

    }

    return cookieValue;

}

const csrftoken = getCookie("csrftoken");

let cart = [];


window.onload = function () {

    let savedCart = localStorage.getItem("cart");

    if (savedCart) {

        cart = JSON.parse(savedCart);

    }

    renderCart();

};


function saveCart() {

    localStorage.setItem("cart", JSON.stringify(cart));

}


function addFood(id, name, price) {

    let item = cart.find(food => food.id === id);

    if (item) {

        item.qty++;

    } else {

        cart.push({

            id: id,
            name: name,
            price: price,
            qty: 1

        });

    }

    saveCart();

    renderCart();

}


function increase(index) {

    cart[index].qty++;

    saveCart();

    renderCart();

}


function decrease(index) {

    cart[index].qty--;

    if (cart[index].qty <= 0) {

        cart.splice(index, 1);

    }

    saveCart();

    renderCart();

}


function removeItem(index) {

    cart.splice(index, 1);

    saveCart();

    renderCart();

}


function renderCart() {

    const cartItems = document.getElementById("cartItems");

    const totalPrice = document.getElementById("totalPrice");

    cartItems.innerHTML = "";

    if (cart.length === 0) {

        cartItems.innerHTML = `

        <div class="empty-cart">

            <i class="bi bi-cart-x fs-1"></i>

            <br><br>

            سبد خرید خالی است

        </div>

        `;

        totalPrice.innerHTML = "0";

        return;

    }

    let total = 0;

    cart.forEach((item, index) => {

        total += item.price * item.qty;

        cartItems.innerHTML += `

        <div class="cart-item">

            <div class="cart-title">

                ${item.name}

            </div>

            <div class="cart-price mt-2">

                ${item.price.toLocaleString()} تومان

            </div>

            <div class="cart-buttons">

                <div class="qty">

                    <button onclick="increase(${index})">

                        +

                    </button>

                    <span>

                        ${item.qty}

                    </span>

                    <button onclick="decrease(${index})">

                        -

                    </button>

                </div>

                <button

                    class="delete-btn"

                    onclick="removeItem(${index})">

                    <i class="bi bi-trash"></i>

                </button>

            </div>

        </div>

        `;

    });

    totalPrice.innerHTML = total.toLocaleString();

}


function submitOrder() {

    let table = document.getElementById("tableNumber").value;

    if (table === "") {

        alert("ابتدا شماره میز را انتخاب کنید.");

        return;

    }

    if (cart.length === 0) {

        alert("سبد خرید خالی است.");

        return;

    }

    let order = {

        table: table,

        foods: cart,

        total: cart.reduce((sum, item) => {

            return sum + item.price * item.qty;

        }, 0)

    };

    console.log(order);



    fetch("/api/create_order/", {

        method: "POST",

        headers: {

            "Content-Type": "application/json",

            "X-CSRFToken": csrftoken

        },

        body: JSON.stringify(order)

    })
        .then(response => response.json())

        .then(data => {

            alert("سفارش با موفقیت ثبت شد.");

            cart = [];

            saveCart();

            renderCart();

        })

        .catch(error => {

            console.error(error);

            alert("خطا در ارسال سفارش");

        });
}