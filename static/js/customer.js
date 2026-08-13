/*
==========================
Robot Restaurant
customer.js
==========================
*/


// ==========================
// CSRF
// ==========================

function getCookie(name) {

    let cookieValue = null;


    if (document.cookie && document.cookie !== "") {

        const cookies =
            document.cookie.split(";");


        for (let cookie of cookies) {

            cookie = cookie.trim();


            if (cookie.startsWith(name + "=")) {

                cookieValue =
                    decodeURIComponent(
                        cookie.substring(
                            name.length + 1
                        )
                    );

                break;
            }
        }
    }


    return cookieValue;

}


const csrftoken = getCookie("csrftoken");



// ==========================
// Cart
// ==========================


let cart = [];



// ==========================
// Start
// ==========================


window.onload = function () {


    loadFoods();


    const savedCart =
        localStorage.getItem("cart");


    if (savedCart) {

        cart = JSON.parse(savedCart);

    }


    renderCart();


};




// ==========================
// Save Cart
// ==========================


function saveCart() {

    localStorage.setItem(
        "cart",
        JSON.stringify(cart)
    );

}



// ==========================
// Load Foods
// ==========================


async function loadFoods() {


    try {


        const response =
            await fetch("/api/foods/");



        const foods =
            await response.json();



        const container =
            document.getElementById(
                "menuContainer"
            );



        if (!container) {

            return;

        }



        container.innerHTML = "";




        if (!foods || foods.length === 0) {


            container.innerHTML = `

            <div class="alert alert-info">

                غذایی موجود نیست

            </div>

            `;


            return;

        }






        foods.forEach(food => {



            container.innerHTML += `


            <div class="col-md-6 col-xl-4">


                <div class="food-card">



                    <img

                    src="${food.image}"

                    class="img-fluid"

                    style="
                    width:100%;
                    height:220px;
                    object-fit:cover;
                    "

                    onerror="
                    this.src='/static/images/no-food.png'
                    "

                    >




                    <div class="food-body">


                        <h4>

                            ${food.name}

                        </h4>




                        <div class="price">

                            ${Number(food.price)
                            .toLocaleString()}

                            تومان

                        </div>




                        <button

                        class="btn btn-warning w-100 mt-3"

                        onclick="
                        addFood(
                        ${food.id},
                        '${food.name}',
                        ${food.price}
                        )"

                        >

                            افزودن

                        </button>



                    </div>


                </div>


            </div>


            `;



        });




    }
    catch(error) {


        console.error(
            "Load Foods Error:",
            error
        );


    }


}





// ==========================
// Add Food
// ==========================


function addFood(id, name, price) {


    let item =
        cart.find(
            food => food.id === id
        );



    if(item) {


        item.qty++;


    }
    else {


        cart.push({

            id:id,

            name:name,

            price:Number(price),

            qty:1

        });


    }



    saveCart();

    renderCart();


}




// ==========================
// Increase
// ==========================


function increase(index) {


    cart[index].qty++;


    saveCart();

    renderCart();


}




// ==========================
// Decrease
// ==========================


function decrease(index) {


    cart[index].qty--;



    if(cart[index].qty <= 0) {


        cart.splice(
            index,
            1
        );

    }



    saveCart();

    renderCart();


}





// ==========================
// Remove
// ==========================


function removeItem(index) {


    cart.splice(
        index,
        1
    );



    saveCart();


    renderCart();


}





// ==========================
// Render Cart
// ==========================


function renderCart() {


    const cartItems =
        document.getElementById(
            "cartItems"
        );


    const totalPrice =
        document.getElementById(
            "totalPrice"
        );



    if(!cartItems || !totalPrice){

        return;

    }




    cartItems.innerHTML = "";



    if(cart.length === 0) {


        cartItems.innerHTML = `


        <div class="empty-cart">

            <i class="bi bi-cart-x fs-1"></i>

            <br>

            سبد خرید خالی است


        </div>


        `;



        totalPrice.innerHTML = "0";


        return;


    }




    let total = 0;




    cart.forEach(
        (item,index)=>{


        total +=
        item.price * item.qty;



        cartItems.innerHTML += `


        <div class="cart-item">


            <h6>

                ${item.name}

            </h6>



            <p>

                ${item.price.toLocaleString()}

                تومان

            </p>




            <div>


                <button
                onclick="increase(${index})">

                    +

                </button>



                <span>

                    ${item.qty}

                </span>



                <button
                onclick="decrease(${index})">

                    -

                </button>




                <button

                onclick="removeItem(${index})"

                class="btn btn-danger btn-sm">


                    <i class="bi bi-trash"></i>


                </button>



            </div>


        </div>



        `;


    });



    totalPrice.innerHTML =
        total.toLocaleString();



}





// ==========================
// Submit Order
// ==========================


async function submitOrder() {

    const table =
        document.getElementById("tableNumber").value;

    // -----------------------------
    // بررسی میز
    // -----------------------------

    if (table === "") {

        alert(
            "ابتدا شماره میز را انتخاب کنید."
        );

        return;
    }

    // -----------------------------
    // بررسی سبد خرید
    // -----------------------------

    if (cart.length === 0) {

        alert(
            "سبد خرید خالی است."
        );

        return;
    }

    // -----------------------------
    // اطلاعات سفارش
    // -----------------------------

    const order = {

        table: table,

        foods: cart

    };

    try {

        const response =
            await fetch(
                "/api/create_order/",
                {
                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "X-CSRFToken":
                            csrftoken
                    },

                    body:
                        JSON.stringify(order)
                }
            );


        const data =
            await response.json();


        // -----------------------------
        // خطای سرور
        // -----------------------------

        if (!response.ok) {

            alert(
                data.error ||
                "خطا در ثبت سفارش"
            );

            return;
        }


        // -----------------------------
        // ثبت موفق سفارش
        // -----------------------------

        if (data.success) {

            // خالی کردن سبد
            cart = [];

            saveCart();

            renderCart();


            // رفتن به صفحه پیگیری سفارش
            window.location.href =
                `/order/${data.order_id}/`;

        }

        else {

            alert(
                data.error ||
                "خطا در ثبت سفارش"
            );
        }


    }

    catch (error) {

        console.error(
            "Submit Order Error:",
            error
        );

        alert(
            "خطا در ارتباط با سرور"
        );
    }
}