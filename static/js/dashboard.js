// ===============================
// Robot Restaurant Dashboard
// ===============================

let selectedOrder = null;

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

// نمایش Toast
function showToast(message, type = "success") {

    const toast = document.createElement("div");

    toast.className =
        `toast align-items-center text-bg-${type} border-0 show position-fixed`;

    toast.style.top = "20px";
    toast.style.left = "20px";
    toast.style.zIndex = "9999";

    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button class="btn-close btn-close-white me-2 m-auto"
                    onclick="this.parentElement.parentElement.remove()">
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {

        toast.remove();

    },3000);

}

// تایید سفارش
async function acceptOrder(id){

    const response = await fetch(`/api/orders/${id}/accept/`,{

        method:"POST",

        headers:{
            "X-CSRFToken":csrftoken
        }

    });

    const data = await response.json();

    if(data.success){

        showToast("سفارش تایید شد.","success");

        loadOrders();

    }

}

// رد سفارش
async function rejectOrder(id){

    if(!confirm("آیا از رد سفارش مطمئن هستید؟"))
        return;

    const response = await fetch(`/api/orders/${id}/reject/`,{

        method:"POST",

        headers:{
            "X-CSRFToken":csrftoken
        }

    });

    const data = await response.json();

    if(data.success){

        showToast("سفارش رد شد.","danger");

        loadOrders();

    }

}
// بارگیری
function loadRobot(id){

    selectedOrder = id;

    const modal =
        new bootstrap.Modal(
            document.getElementById("robotModal")
        );

    modal.show();

}

// ارسال به ربات
function sendRobot(){

    bootstrap.Modal
        .getInstance(
            document.getElementById("robotModal")
        )
        .hide();

    showToast(
        "سفارش برای ربات ارسال شد 🤖",
        "primary"
    );

    console.log("Send To Robot :",selectedOrder);

    /*
    fetch("/api/send_robot/",{

        method:"POST",

        headers:{
            "Content-Type":"application/json",
            "X-CSRFToken":csrftoken
        },

        body:JSON.stringify({

            order:selectedOrder

        })

    })

    */

}

async function loadOrders(){

    try{

        const response = await fetch("/api/orders/");

        const orders = await response.json();

        renderOrders(orders);

    }

    catch(error){

        console.log(error);

    }

}

// شمارنده سفارش‌ها
function updateCounter(){

    let count =
        document.querySelectorAll(".order-card").length;

    let cards =
        document.querySelectorAll(".status-card b");

    if(cards.length>3){

        cards[3].innerHTML = count;

    }

}
function renderOrders(orders){

    let container =
        document.getElementById("ordersContainer");

    container.innerHTML="";

    orders.forEach(order=>{

        let foods="";

        order.items.forEach(item=>{

          foods += `

<div class="d-flex justify-content-between border-bottom py-1">

            <span>
            
            🍽 ${item.name}
            
            </span>
            
            <span class="badge bg-primary">
            
            ${item.quantity}
            
            </span>
            
            </div>
            
            `;

        });

        container.innerHTML += `

        <div class="order-card new-order">

            <div class="order-header">

                <span>

                    سفارش #${order.id}

                </span>

                <span class="badge bg-warning">

                    جدید

                </span>

            </div>

            <div class="order-body">

                <p>

                    🍽 میز ${order.table}

                </p>

                ${foods}

                <p>

                    💰 ${Number(order.total).toLocaleString()} تومان

                </p>

            </div>

            <div class="order-footer">

                <button

                class="btn btn-success"

                onclick="acceptOrder(${order.id})">

                تایید

                </button>

                <button

                class="btn btn-danger"

                onclick="rejectOrder(${order.id})">

                رد

                </button>

            </div>

        </div>

        `;

    });

}

updateCounter();
async function loadFoods(){

    const response = await fetch("/api/foods/");

    const foods = await response.json();

    let html = "";

    foods.forEach(food => {

        let badge = "";

        if(food.stock == 0){

            badge = '<span class="badge bg-danger">ناموجود</span>';

        }
        else if(food.stock <= 3){

            badge = '<span class="badge bg-warning">کم</span>';

        }
        else{

            badge = '<span class="badge bg-success">موجود</span>';

        }

        html += `
            <div class="food-item">
                <span>${food.name}</span>
                <span>${food.stock}</span>
                ${badge}
            </div>
        `;

    });

    document.getElementById("foodStock").innerHTML = html;

}
// تایمر سفارش‌ها

setInterval(function(){

    let orders =
        document.querySelectorAll(".order-body");

    orders.forEach(function(order){

        let timer =
            order.querySelector(".timer");

        if(timer){

            let value =
                parseInt(timer.dataset.time);

            value++;

            timer.dataset.time=value;

            let m =
                Math.floor(value/60);

            let s =
                value%60;

            timer.innerHTML =
                "⏱ " +
                m +
                ":" +
                String(s).padStart(2,"0");

        }

    });

},1000);
loadOrders();

setInterval(loadOrders,3000);