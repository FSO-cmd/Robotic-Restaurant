// ===============================
// Robot Restaurant Dashboard
// ===============================

let selectedOrder = null;


// ===============================
// CSRF
// ===============================

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== "") {
        const cookies = document.cookie.split(";");
        for (let cookie of cookies) {
            cookie = cookie.trim();
            if (cookie.startsWith(name + "=")) {
                cookieValue = decodeURIComponent(
                    cookie.substring(name.length + 1)
                );
                break;
            }
        }
    }
    return cookieValue;
}

const csrftoken = getCookie("csrftoken");


// ===============================
// Toast
// ===============================

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
            <button
                type="button"
                class="btn-close btn-close-white me-2 m-auto"
                onclick="this.parentElement.parentElement.remove()">
            </button>
        </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
        if (toast && toast.parentElement) {
            toast.remove();
        }
    }, 3000);
}


// ===============================
// تایید سفارش
// ===============================

async function acceptOrder(id) {
    try {
        const response = await fetch(
            `/api/orders/${id}/accept/`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrftoken
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            showToast("سفارش با موفقیت تایید شد.", "success");
            await loadOrders();
        } else {
            showToast("تایید سفارش انجام نشد.", "danger");
        }

    } catch (error) {
        console.error("Accept Order Error:", error);
        showToast("خطا در تایید سفارش.", "danger");
    }
}


// ===============================
// رد سفارش
// ===============================

async function rejectOrder(id) {
    if (!confirm("آیا از رد سفارش مطمئن هستید؟")) {
        return;
    }

    try {
        const response = await fetch(
            `/api/orders/${id}/reject/`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrftoken
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            showToast("سفارش با موفقیت رد شد.", "danger");
            await loadOrders();
        } else {
            showToast("رد سفارش انجام نشد.", "danger");
        }

    } catch (error) {
        console.error("Reject Order Error:", error);
        showToast("خطا در رد سفارش.", "danger");
    }
}


// ===============================
// باز کردن پنجره بارگیری
// ===============================

function loadRobot(id) {
    selectedOrder = id;

    const modalElement =
        document.getElementById("robotModal");

    if (!modalElement) {
        console.error("robotModal پیدا نشد.");
        return;
    }

    const modal =
        bootstrap.Modal.getOrCreateInstance(modalElement);

    modal.show();
}


// ===============================
// ارسال سفارش به ربات
// ===============================

async function sendRobot() {
    if (!selectedOrder) {
        showToast("ابتدا یک سفارش را انتخاب کنید.", "warning");
        return;
    }

    const modalElement =
        document.getElementById("robotModal");

    if (modalElement) {
        const modal =
            bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    }

    try {
        const response = await fetch(
            `/api/orders/${selectedOrder}/send-robot/`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrftoken
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
            showToast(
                `سفارش #${selectedOrder} برای ربات ارسال شد 🤖`,
                "primary"
            );
            await loadOrders();
        } else {
            showToast("ارسال سفارش به ربات انجام نشد.", "danger");
        }

    } catch (error) {
        console.error("Send Robot Error:", error);
        showToast("خطا در ارسال سفارش به ربات.", "danger");
    } finally {
        selectedOrder = null;
    }
}


// ===============================
// دریافت سفارش‌ها
// ===============================

async function loadOrders() {
    try {
        const response = await fetch("/api/orders/");

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const orders = await response.json();

        renderOrders(orders);
        updateCounter();

    } catch (error) {
        console.error("خطا در دریافت سفارش‌ها:", error);
    }
}


// ===============================
// شمارنده سفارش‌ها
// ===============================

function updateCounter() {
    const container = document.getElementById("ordersContainer");
    if (!container) return;

    const count = container.querySelectorAll(".order-card").length;

    const counterEl = document.getElementById("activeOrdersCount");
    if (counterEl) {
        counterEl.innerHTML = count;
    }
}


// ===============================
// نمایش سفارش‌ها
// ===============================

function renderOrders(orders) {
    const container =
        document.getElementById("ordersContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!orders || orders.length === 0) {
        container.innerHTML = `
            <div class="alert alert-light text-center">
                سفارشی وجود ندارد.
            </div>
        `;
        return;
    }

    orders.forEach(order => {
        let foods = "";

        if (order.items && order.items.length > 0) {
            order.items.forEach(item => {
                foods += `
                    <div class="d-flex
                                justify-content-between
                                border-bottom
                                py-1">
                        <span>🍽 ${item.name}</span>
                        <span class="badge bg-primary">
                            ${item.quantity}
                        </span>
                    </div>
                `;
            });
        }

        container.innerHTML += `
            <div class="order-card new-order">
                <div class="order-header">
                    <span>سفارش #${order.id}</span>
                    <span class="badge bg-warning">جدید</span>
                </div>
                <div class="order-body">
                    <p>🍽 میز ${order.table}</p>
                    ${foods}
                    <p class="mt-2">
                        💰 ${Number(order.total).toLocaleString()} تومان
                    </p>
                </div>
                <div class="order-footer">
                    <button
                        type="button"
                        class="btn btn-success"
                        onclick="acceptOrder(${order.id})">
                        تایید
                    </button>
                    <button
                        type="button"
                        class="btn btn-danger"
                        onclick="rejectOrder(${order.id})">
                        رد
                    </button>
                </div>
            </div>
        `;
    });
}


// ===============================
// دریافت غذاها
// ===============================

async function loadFoods() {
    try {
        const response = await fetch("/api/foods/");

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const foods = await response.json();

        renderFoodsTable(foods);
        renderFoodStock(foods);

    } catch (error) {
        console.error("خطا در دریافت غذاها:", error);
    }
}


// ===============================
// جدول مدیریت غذا
// ===============================

function renderFoodsTable(foods) {
    const container =
        document.getElementById("foodsContainer");

    if (!container) {
        return;
    }

    container.innerHTML = "";

    if (!foods || foods.length === 0) {
        container.innerHTML = `
            <tr>
                <td colspan="5">
                    هنوز غذایی ثبت نشده است.
                </td>
            </tr>
        `;
        return;
    }

    foods.forEach(food => {
        let status;
        let statusClass;

        if (food.stock > 5) {
            status = "موجود";
            statusClass = "bg-success";
        } else if (food.stock > 0) {
            status = "موجودی کم";
            statusClass = "bg-warning";
        } else {
            status = "تمام شده";
            statusClass = "bg-danger";
        }

        container.innerHTML += `
            <tr>
                <td>
                    ${food.name}
                </td>
                <td>
                    ${Number(food.price).toLocaleString()}
                    تومان
                </td>
                <td>
                    ${food.stock}
                </td>
                <td>
                    <span class="badge ${statusClass}">
                        ${status}
                    </span>
                </td>
                <td>
                    <button
                        type="button"
                        class="btn btn-sm btn-primary"
                        onclick="editFood(${food.id})">
                        <i class="bi bi-pencil"></i>
                        ویرایش
                    </button>
                    <button
                        type="button"
                        class="btn btn-sm btn-danger"
                        onclick="deleteFood(${food.id})">
                        <i class="bi bi-trash"></i>
                        حذف
                    </button>
                </td>
            </tr>
        `;
    });
}


// ===============================
// نمایش موجودی غذا
// ===============================

function renderFoodStock(foods) {
    const container =
        document.getElementById("foodStockContainer");

    if (!container) {
        return;
    }

    if (!foods || foods.length === 0) {
        container.innerHTML =
            "<p>غذایی ثبت نشده است.</p>";
        return;
    }

    let html = "";

    foods.forEach(food => {
        let badge;

        if (food.stock === 0) {
            badge =
                '<span class="badge bg-danger">ناموجود</span>';
        } else if (food.stock <= 3) {
            badge =
                '<span class="badge bg-warning">کم</span>';
        } else {
            badge =
                '<span class="badge bg-success">موجود</span>';
        }

        html += `
            <div class="food-item">
                <span>
                    ${food.name}
                </span>
                <strong>
                    ${food.stock}
                </strong>
                ${badge}
            </div>
        `;
    });

    container.innerHTML = html;
}


// ===============================
// افزودن غذا
// ===============================

async function createFood() {
    const nameInput =
        document.getElementById("foodName");
    const priceInput =
        document.getElementById("foodPrice");
    const stockInput =
        document.getElementById("foodStock");

    if (!nameInput || !priceInput || !stockInput) {
        showToast("فیلدهای افزودن غذا پیدا نشدند.", "danger");
        return;
    }

    const name = nameInput.value.trim();
    const price = Number(priceInput.value);
    const stock = Number(stockInput.value);

    if (!name) {
        showToast("نام غذا را وارد کنید.", "warning");
        return;
    }

    if (priceInput.value === "" || price < 0) {
        showToast("قیمت معتبر وارد کنید.", "warning");
        return;
    }

    if (stockInput.value === "" || stock < 0) {
        showToast("موجودی معتبر وارد کنید.", "warning");
        return;
    }

    try {
        const response = await fetch(
            "/api/foods/create/",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrftoken
                },
                body: JSON.stringify({
                    name: name,
                    price: price,
                    stock: stock
                })
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            showToast(
                data.error || "خطا در افزودن غذا.",
                "danger"
            );
            return;
        }

        const modalElement =
            document.getElementById("addFoodModal");

        if (modalElement) {
            const modal =
                bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }

        nameInput.value = "";
        priceInput.value = "";
        stockInput.value = "";

        await loadFoods();

        showToast("غذا با موفقیت اضافه شد.", "success");

    } catch (error) {
        console.error("Create Food Error:", error);
        showToast("خطا در ارتباط با سرور.", "danger");
    }
}


// ===============================
// باز کردن ویرایش غذا
// ===============================

async function editFood(id) {
    try {
        const response = await fetch(`/api/foods/${id}/`);

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const food = await response.json();

        if (!food || food.error) {
            showToast("غذا پیدا نشد.", "danger");
            return;
        }

        const idInput =
            document.getElementById("editFoodId");
        const nameInput =
            document.getElementById("editFoodName");
        const priceInput =
            document.getElementById("editFoodPrice");
        const stockInput =
            document.getElementById("editFoodStock");

        if (!idInput || !nameInput || !priceInput || !stockInput) {
            showToast(
                "فرم ویرایش غذا در HTML وجود ندارد.",
                "danger"
            );
            return;
        }

        idInput.value = food.id;
        nameInput.value = food.name;
        priceInput.value = food.price;
        stockInput.value = food.stock;

        const modalElement =
            document.getElementById("editFoodModal");

        if (!modalElement) {
            showToast("پنجره ویرایش غذا پیدا نشد.", "danger");
            return;
        }

        const modal =
            bootstrap.Modal.getOrCreateInstance(modalElement);

        modal.show();

    } catch (error) {
        console.error("Edit Food Error:", error);
        showToast("خطا در دریافت اطلاعات غذا.", "danger");
    }
}


// ===============================
// بروزرسانی غذا
// ===============================

async function updateFood() {
    const idInput =
        document.getElementById("editFoodId");
    const nameInput =
        document.getElementById("editFoodName");
    const priceInput =
        document.getElementById("editFoodPrice");
    const stockInput =
        document.getElementById("editFoodStock");

    if (!idInput || !nameInput || !priceInput || !stockInput) {
        showToast("فرم ویرایش غذا کامل نیست.", "danger");
        return;
    }

    const id = idInput.value;
    const name = nameInput.value.trim();
    const price = Number(priceInput.value);
    const stock = Number(stockInput.value);

    if (!id) {
        showToast("شناسه غذا مشخص نیست.", "danger");
        return;
    }

    if (!name) {
        showToast("نام غذا را وارد کنید.", "warning");
        return;
    }

    if (priceInput.value === "" || price < 0) {
        showToast("قیمت معتبر وارد کنید.", "warning");
        return;
    }

    if (stockInput.value === "" || stock < 0) {
        showToast("موجودی معتبر وارد کنید.", "warning");
        return;
    }

    try {
        const response = await fetch(
            `/api/foods/${id}/update/`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrftoken
                },
                body: JSON.stringify({
                    name: name,
                    price: price,
                    stock: stock
                })
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            showToast(
                data.error || "ویرایش غذا انجام نشد.",
                "danger"
            );
            return;
        }

        const modalElement =
            document.getElementById("editFoodModal");

        if (modalElement) {
            const modal =
                bootstrap.Modal.getInstance(modalElement);
            if (modal) {
                modal.hide();
            }
        }

        await loadFoods();

        showToast(
            "اطلاعات غذا با موفقیت ویرایش شد.",
            "success"
        );

    } catch (error) {
        console.error("Update Food Error:", error);
        showToast("خطا در ارتباط با سرور.", "danger");
    }
}


// ===============================
// حذف غذا
// ===============================

async function deleteFood(id) {
    if (!confirm("آیا از حذف این غذا مطمئن هستید؟")) {
        return;
    }

    try {
        const response = await fetch(
            `/api/foods/${id}/delete/`,
            {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRFToken": csrftoken
                }
            }
        );

        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success) {
            showToast(
                data.error || "حذف غذا انجام نشد.",
                "danger"
            );
            return;
        }

        await loadFoods();

        showToast("غذا با موفقیت حذف شد.", "success");

    } catch (error) {
        console.error("Delete Food Error:", error);
        showToast("خطا در حذف غذا.", "danger");
    }
}


// ===============================
// شروع داشبورد
// ===============================

document.addEventListener("DOMContentLoaded", function () {
    loadOrders();
    loadFoods();

    setInterval(loadOrders, 3000);
    setInterval(loadFoods, 5000);
});