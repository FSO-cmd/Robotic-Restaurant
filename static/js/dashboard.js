// ===============================
// Midnight Kitchen Pro — Dashboard Logic
// (نام و مسیر همه‌ی توابع/اندپوینت‌های اصلی بدون تغییر باقی مانده)
// ===============================

let selectedOrder = null;
let lastOrders = [];
const metricHistory = { total: [], cooking: [], ready: [], revenue: [] };
const HISTORY_LEN = 12;

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
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
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
    const wrap = document.getElementById("toastStack") || (() => {
        const el = document.createElement("div");
        el.id = "toastStack";
        el.className = "toast-stack";
        document.body.appendChild(el);
        return el;
    })();

    const toast = document.createElement("div");
    toast.className = `app-toast toast-${type}`;
    toast.innerHTML = `
        <span class="app-toast-dot"></span>
        <span class="app-toast-msg">${message}</span>
        <button type="button" class="app-toast-close" onclick="this.parentElement.remove()">
            <i class="bi bi-x"></i>
        </button>
    `;
    wrap.appendChild(toast);

    setTimeout(() => {
        if (toast && toast.parentElement) {
            toast.classList.add("app-toast-out");
            setTimeout(() => toast.remove(), 200);
        }
    }, 3200);
}

// ===============================
// تایید سفارش
// ===============================
async function acceptOrder(id) {
    try {
        const response = await fetch(`/api/orders/${id}/accept/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken }
        });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
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
    if (!confirm("آیا از رد سفارش مطمئن هستید؟")) return;

    try {
        const response = await fetch(`/api/orders/${id}/reject/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken }
        });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();

        if (data.success) {
            showToast("سفارش رد شد.", "danger");
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
// اعلام آماده بودن سفارش
// ===============================
async function readyOrder(id) {
    try {
        const response = await fetch(`/api/orders/${id}/ready/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken }
        });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();

        if (data.success) {
            showToast("سفارش آماده ارسال شد.", "success");
            await loadOrders();
        } else {
            showToast("عملیات انجام نشد.", "danger");
        }
    } catch (error) {
        console.error("Ready Order Error:", error);
        showToast("خطا در ثبت وضعیت آماده.", "danger");
    }
}

// ===============================
// باز کردن پنجره‌ی ارسال سفارش
// ===============================
function loadRobot(id) {
    selectedOrder = id;
    const modalElement = document.getElementById("robotModal");
    if (!modalElement) {
        console.error("robotModal پیدا نشد.");
        return;
    }
    const modal = bootstrap.Modal.getOrCreateInstance(modalElement);
    modal.show();
}

// ===============================
// تایید نهایی ارسال سفارش
// ===============================
async function sendRobot() {
    if (!selectedOrder) {
        showToast("ابتدا یک سفارش را انتخاب کنید.", "warning");
        return;
    }

    const modalElement = document.getElementById("robotModal");
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) modal.hide();
    }

    const orderId = selectedOrder;

    try {
        const response = await fetch(`/api/orders/${orderId}/send-robot/`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken }
        });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();

        if (data.success) {
            showToast(`سفارش #${orderId} برای ارسال ثبت شد.`, "success");
            await loadOrders();
        } else {
            showToast("ارسال سفارش انجام نشد.", "danger");
        }
    } catch (error) {
        console.error("Send Order Error:", error);
        showToast("خطا در ارسال سفارش.", "danger");
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
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const orders = await response.json();
        lastOrders = orders;
        renderOrders(orders);
        updateCounter();
        updateStatCards(orders);
        renderPipeline(orders);
        refreshOrderStatusChart(orders);
        refreshPopularFoodsChart(orders);
    } catch (error) {
        console.error("خطا در دریافت سفارش‌ها:", error);
    }
}

// ===============================
// شمارنده سفارش‌های فعال
// ===============================
function updateCounter() {
    const newContainer = document.getElementById("ordersContainer");
    const cookingContainer = document.getElementById("cookingOrdersContainer");
    const readyContainer = document.getElementById("readyOrdersContainer");

    const count =
        (newContainer ? newContainer.querySelectorAll(".order-card").length : 0) +
        (cookingContainer ? cookingContainer.querySelectorAll(".order-card").length : 0) +
        (readyContainer ? readyContainer.querySelectorAll(".order-card").length : 0);

    const counterEl = document.getElementById("activeOrdersCount");
    if (counterEl) counterEl.innerHTML = count;
}

// ===============================
// کارت‌های آمار داشبورد
// ===============================
function updateStatCards(orders) {
    const total = orders.length;
    const cooking = orders.filter(o => o.status === "cooking").length;
    const ready = orders.filter(o => o.status === "ready").length;
    const revenue = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);

    const elTotal = document.getElementById("statTotalOrders");
    const elCooking = document.getElementById("statCookingOrders");
    const elReady = document.getElementById("statReadyOrders");
    const elRevenue = document.getElementById("statRevenue");

    if (elTotal) elTotal.innerHTML = total;
    if (elCooking) elCooking.innerHTML = cooking;
    if (elReady) elReady.innerHTML = ready;
    if (elRevenue) elRevenue.innerHTML = revenue.toLocaleString() + " تومان";

    pushHistory("total", total);
    pushHistory("cooking", cooking);
    pushHistory("ready", ready);
    pushHistory("revenue", revenue);
    renderSpark("sparkTotal", metricHistory.total);
    renderSpark("sparkCooking", metricHistory.cooking);
    renderSpark("sparkReady", metricHistory.ready);
    renderSpark("sparkRevenue", metricHistory.revenue);

    updateKpiStrip(total, cooking, ready, revenue);
}

// ===============================
// تاریخچه‌ی کوتاه برای مینی‌نمودارهای کارت‌های آمار (بر پایه‌ی داده‌ی واقعی هر بروزرسانی)
// ===============================
function pushHistory(key, value) {
    metricHistory[key].push(value);
    if (metricHistory[key].length > HISTORY_LEN) metricHistory[key].shift();
}

function renderSpark(elId, values) {
    const el = document.getElementById(elId);
    if (!el) return;
    if (!values.length) { el.innerHTML = ""; return; }
    const max = Math.max(...values, 1);
    el.innerHTML = values.map(v => {
        const h = Math.max(8, Math.round((v / max) * 100));
        return `<i style="height:${h}%"></i>`;
    }).join("");
}

// ===============================
// چیپ‌های KPI در بخش تحلیل‌ها
// ===============================
function updateKpiStrip(total, cooking, ready, revenue) {
    const el = document.getElementById("kpiStrip");
    if (!el) return;
    el.innerHTML = `
        <div class="kpi-chip"><span class="dot" style="background:var(--orange);"></span> مجموع سفارش‌های فعال: <strong>${total}</strong></div>
        <div class="kpi-chip"><span class="dot" style="background:var(--blue);"></span> در حال پخت: <strong>${cooking}</strong></div>
        <div class="kpi-chip"><span class="dot" style="background:var(--green);"></span> آماده ارسال: <strong>${ready}</strong></div>
        <div class="kpi-chip"><span class="dot" style="background:var(--yellow);"></span> درآمد جاری: <strong>${revenue.toLocaleString()} تومان</strong></div>
    `;
}

// ===============================
// رندر سفارش‌ها (سه ستونه: جدید / در حال آماده‌سازی / آماده ارسال)
// ===============================
function renderOrders(orders) {
    const newContainer = document.getElementById("ordersContainer");
    const cookingContainer = document.getElementById("cookingOrdersContainer");
    const readyContainer = document.getElementById("readyOrdersContainer");

    if (!newContainer) return;

    newContainer.innerHTML = "";
    if (cookingContainer) cookingContainer.innerHTML = "";
    if (readyContainer) readyContainer.innerHTML = "";

    let newCount = 0, cookingCount = 0, readyCount = 0;

    orders.forEach(order => {
        let foods = "";
        if (order.items) {
            order.items.forEach(item => {
                foods += `<p class="order-line">🍽 ${item.name} <span>× ${item.quantity}</span></p>`;
            });
        }

        if (order.status === "new") {
            newCount++;
            newContainer.innerHTML += `
                <div class="order-card new-order">
                    <div class="order-header">
                        <span>سفارش #${order.id}</span>
                        <span class="badge bg-warning">جدید</span>
                    </div>
                    <div class="order-body">
                        <p class="order-table-line">🪑 میز ${order.table}</p>
                        ${foods}
                        <p class="order-total-line">💰 ${Number(order.total).toLocaleString()} تومان</p>
                    </div>
                    <div class="order-footer">
                        <button class="btn btn-success w-100" onclick="acceptOrder(${order.id})">
                            <i class="bi bi-check-lg"></i> تأیید سفارش
                        </button>
                        <button class="btn btn-danger w-100" onclick="rejectOrder(${order.id})">
                            <i class="bi bi-x-lg"></i> رد سفارش
                        </button>
                    </div>
                </div>
            `;
        }

        if (order.status === "cooking") {
            cookingCount++;
            if (!cookingContainer) return;

            const minutes = Math.floor(order.remaining_seconds / 60);
            const seconds = order.remaining_seconds % 60;

            cookingContainer.innerHTML += `
                <div class="order-card cooking">
                    <div class="order-header">
                        <span>سفارش #${order.id}</span>
                        <span class="badge bg-primary">در حال آماده‌سازی</span>
                    </div>
                    <div class="order-body">
                        <p class="order-table-line">🪑 میز ${order.table}</p>
                        ${foods}
                        <div class="mt-3">
                            <div class="d-flex justify-content-between">
                                <span>زمان آماده‌سازی</span>
                                <strong>${order.progress}%</strong>
                            </div>
                            <div class="progress mt-2">
                                <div class="progress-bar" style="width: ${order.progress}%"></div>
                            </div>
                            <div class="text-center mt-2 remaining-time">
                                ⏱ ${minutes}:${String(seconds).padStart(2, "0")} باقی‌مانده
                            </div>
                        </div>
                    </div>
                    <div class="order-footer">
                        <button class="btn btn-success w-100" onclick="readyOrder(${order.id})">
                            <i class="bi bi-check-circle"></i> آماده شد
                        </button>
                    </div>
                </div>
            `;
        }

        if (order.status === "ready") {
            readyCount++;
            if (!readyContainer) return;

            readyContainer.innerHTML += `
                <div class="order-card ready-order">
                    <div class="order-header">
                        <span>سفارش #${order.id}</span>
                        <span class="badge bg-success">آماده ارسال</span>
                    </div>
                    <div class="order-body">
                        <p class="order-table-line">🪑 میز ${order.table}</p>
                        ${foods}
                        <p class="order-total-line">💰 ${Number(order.total).toLocaleString()} تومان</p>
                    </div>
                    <div class="order-footer">
                        <button class="btn-dispatch w-100" onclick="loadRobot(${order.id})">
                            <i class="bi bi-send-fill"></i> ارسال سفارش
                        </button>
                    </div>
                </div>
            `;
        }
    });

    const badgeNew = document.getElementById("newOrdersCount");
    const badgeCooking = document.getElementById("cookingOrdersCount");
    const badgeReady = document.getElementById("readyOrdersCount");
    if (badgeNew) badgeNew.innerHTML = newCount;
    if (badgeCooking) badgeCooking.innerHTML = cookingCount;
    if (badgeReady) badgeReady.innerHTML = readyCount;

    if (newCount === 0) newContainer.innerHTML = `<div class="empty-column">سفارش جدیدی در صف نیست.</div>`;
    if (cookingContainer && cookingCount === 0) cookingContainer.innerHTML = `<div class="empty-column">چیزی در حال آماده‌سازی نیست.</div>`;
    if (readyContainer && readyCount === 0) readyContainer.innerHTML = `<div class="empty-column">سفارشی آماده‌ی ارسال نیست.</div>`;
}

// ===============================
// پایپ‌لاین آشپزخانه (نمایشی، بر اساس وضعیت‌های واقعی سفارش‌ها)
// ===============================
function renderPipeline(orders) {
    const wrap = document.getElementById("pipelineTrack");
    if (!wrap) return;

    const steps = [
        { key: "new", label: "ثبت شد", icon: "bi-receipt" },
        { key: "accepted", label: "تایید شد", icon: "bi-check2" },
        { key: "cooking", label: "در حال پخت", icon: "bi-fire" },
        { key: "ready", label: "آماده", icon: "bi-box-seam" },
        { key: "sent", label: "ارسال شد", icon: "bi-send" },
    ];

    const counts = {
        new: orders.filter(o => o.status === "new").length,
        accepted: 0, // در مدل داده فعلی، وضعیت جدا برای «تایید شده» گزارش نمی‌شود
        cooking: orders.filter(o => o.status === "cooking").length,
        ready: orders.filter(o => o.status === "ready").length,
        sent: 0, // پس از ارسال، سفارش از لیست‌های فعال خارج می‌شود
    };

    wrap.innerHTML = steps.map((step, i) => {
        const hasActive = counts[step.key] > 0;
        const stateClass = hasActive ? "current" : (i === 0 ? "done" : "");
        return `
            <div class="pipeline-step ${stateClass}">
                <div class="pipeline-line"></div>
                <div class="dot"><i class="bi ${step.icon}"></i></div>
                <div class="label">${step.label}${counts[step.key] ? ` (${counts[step.key]})` : ""}</div>
            </div>
        `;
    }).join("");
}

// ===============================
// چیپ رنگی برای دسته‌بندی
// ===============================
function categoryChipClass(name) {
    const palette = ["chip-c1", "chip-c2", "chip-c3", "chip-c4", "chip-c5"];
    let hash = 0;
    for (let i = 0; i < (name || "").length; i++) hash = (hash + name.charCodeAt(i) * (i + 1)) % palette.length;
    return palette[hash];
}

// ===============================
// دریافت غذاها
// ===============================
async function loadFoods() {
    const response = await fetch("/api/foods/");
    const categories = await response.json();

    let foods = [];
    categories.forEach(category => {
        category.foods.forEach(food => {
            foods.push({ ...food, category: category.name });
        });
    });

    renderFoodsTable(foods);
    renderFoodStock(foods);
    refreshPopularFoodsChart(lastOrders);
}

// ===============================
// کارت‌های مدیریت غذا (منو)
// نکته: نام تابع طبق درخواست تغییر نکرده، فقط خروجی از جدول به گرید کارت تبدیل شده
// ===============================
function renderFoodsTable(foods) {
    const container = document.getElementById("foodsContainer");
    if (!container) return;

    container.innerHTML = "";

    if (!foods || foods.length === 0) {
        container.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">هنوز غذایی ثبت نشده است.</td></tr>`;
        return;
    }

    foods.forEach(food => {
        let status, statusClass;
        if (food.stock > 5) { status = "موجود"; statusClass = "available"; }
        else if (food.stock > 0) { status = "موجودی کم"; statusClass = "low"; }
        else { status = "تمام شده"; statusClass = "out"; }

        const chip = categoryChipClass(food.category);

        container.innerHTML += `
            <tr>
                <td>
                    ${food.image
                        ? `<img src="${food.image}" class="thumb" alt="${food.name}">`
                        : `<div class="thumb-placeholder"><i class="bi bi-image"></i></div>`}
                </td>
                <td class="row-food"><span class="name">${food.name}</span></td>
                <td><span class="category-chip ${chip}">${food.category || "—"}</span></td>
                <td class="mono">${Number(food.price).toLocaleString()} تومان</td>
                <td class="mono">${food.stock}</td>
                <td><span class="status-tag ${statusClass}">${status}</span></td>
                <td>
                    <button type="button" class="icon-btn" title="ویرایش" onclick="editFood(${food.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button type="button" class="icon-btn icon-btn-danger" title="حذف" onclick="deleteFood(${food.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
}

// ===============================
// انبار / موجودی (بخش Inventory) — کم‌موجودی‌ها اول نمایش داده می‌شوند
// ===============================
function renderFoodStock(foods) {
    const container = document.getElementById("foodStockContainer");
    if (!container) return;

    if (!foods || foods.length === 0) {
        container.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">غذایی ثبت نشده است.</td></tr>`;
        return;
    }

    const sorted = [...foods].sort((a, b) => a.stock - b.stock);
    const maxStock = Math.max(...sorted.map(f => f.stock), 10);

    let html = "";
    sorted.forEach(food => {
        let badgeClass, badgeText;
        if (food.stock === 0) { badgeClass = "out"; badgeText = "ناموجود"; }
        else if (food.stock <= 3) { badgeClass = "low"; badgeText = "کم"; }
        else { badgeClass = "available"; badgeText = "موجود"; }

        const pct = Math.max(4, Math.round((food.stock / maxStock) * 100));

        html += `
            <tr>
                <td class="fw-semibold">${food.name}</td>
                <td>
                    <div class="stock-bar-wrap">
                        <div class="stock-bar-track"><div class="stock-bar-fill ${badgeClass}" style="width:${pct}%"></div></div>
                    </div>
                </td>
                <td class="mono">${food.stock}</td>
                <td><span class="status-tag ${badgeClass}">${badgeText}</span></td>
            </tr>
        `;
    });

    container.innerHTML = html;
}

// ===============================
// افزودن غذا
// ===============================
async function createFood() {
    const categoryInput = document.getElementById("foodCategory");
    const nameInput = document.getElementById("foodName");
    const priceInput = document.getElementById("foodPrice");
    const stockInput = document.getElementById("foodStock");
    const imageInput = document.getElementById("foodImage");

    if (!categoryInput || !nameInput || !priceInput || !stockInput) {
        showToast("فیلدهای افزودن غذا پیدا نشدند.", "danger");
        return;
    }

    const categoryId = categoryInput.value;
    if (!categoryId) {
        showToast("لطفاً دسته‌بندی غذا را انتخاب کنید.", "warning");
        return;
    }

    const name = nameInput.value.trim();
    const price = Number(priceInput.value);
    const stock = Number(stockInput.value);

    if (!name) { showToast("نام غذا را وارد کنید.", "warning"); return; }
    if (priceInput.value === "" || price < 0) { showToast("قیمت معتبر وارد کنید.", "warning"); return; }
    if (stockInput.value === "" || stock < 0) { showToast("موجودی معتبر وارد کنید.", "warning"); return; }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("price", price);
    formData.append("stock", stock);
    formData.append("category_id", categoryId);

    if (imageInput && imageInput.files.length > 0) {
        formData.append("image", imageInput.files[0]);
    }

    try {
        const response = await fetch("/api/foods/create/", {
            method: "POST",
            headers: { "X-CSRFToken": csrftoken },
            body: formData
        });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();

        if (!data.success) {
            showToast(data.error || "خطا در افزودن غذا.", "danger");
            return;
        }

        const modalElement = document.getElementById("addFoodModal");
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }

        nameInput.value = "";
        priceInput.value = "";
        stockInput.value = "";
        if (imageInput) imageInput.value = "";
        categoryInput.selectedIndex = 0;

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
        const response = await fetch("/api/foods/");
        const categories = await response.json();

        let food = null;
        categories.forEach(category => {
            const match = category.foods.find(item => item.id === id);
            if (match) food = match;
        });

        if (!food) {
            showToast("غذا پیدا نشد", "danger");
            return;
        }

        document.getElementById("editFoodId").value = food.id;
        document.getElementById("editFoodName").value = food.name;
        document.getElementById("editFoodPrice").value = food.price;
        document.getElementById("editFoodStock").value = food.stock;

        const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById("editFoodModal"));
        modal.show();

    } catch (error) {
        console.error(error);
        showToast("خطا در دریافت غذا", "danger");
    }
}

// ===============================
// بروزرسانی غذا
// ===============================
async function updateFood() {
    const idInput = document.getElementById("editFoodId");
    const nameInput = document.getElementById("editFoodName");
    const priceInput = document.getElementById("editFoodPrice");
    const stockInput = document.getElementById("editFoodStock");

    if (!idInput || !nameInput || !priceInput || !stockInput) {
        showToast("فرم ویرایش غذا کامل نیست.", "danger");
        return;
    }

    const id = idInput.value;
    const name = nameInput.value.trim();
    const price = Number(priceInput.value);
    const stock = Number(stockInput.value);

    if (!id) { showToast("شناسه غذا مشخص نیست.", "danger"); return; }
    if (!name) { showToast("نام غذا را وارد کنید.", "warning"); return; }
    if (priceInput.value === "" || price < 0) { showToast("قیمت معتبر وارد کنید.", "warning"); return; }
    if (stockInput.value === "" || stock < 0) { showToast("موجودی معتبر وارد کنید.", "warning"); return; }

    try {
        const response = await fetch(`/api/foods/${id}/update/`, {
            method: "PUT",
            headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken },
            body: JSON.stringify({ name, price, stock })
        });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();

        if (!data.success) {
            showToast(data.error || "ویرایش غذا انجام نشد.", "danger");
            return;
        }

        const modalElement = document.getElementById("editFoodModal");
        if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) modal.hide();
        }

        await loadFoods();
        showToast("اطلاعات غذا با موفقیت ویرایش شد.", "success");

    } catch (error) {
        console.error("Update Food Error:", error);
        showToast("خطا در ارتباط با سرور.", "danger");
    }
}

// ===============================
// حذف غذا
// ===============================
async function deleteFood(id) {
    if (!confirm("آیا از حذف این غذا مطمئن هستید؟")) return;

    try {
        const response = await fetch(`/api/foods/${id}/delete/`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json", "X-CSRFToken": csrftoken }
        });
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
        const data = await response.json();

        if (!data.success) {
            showToast(data.error || "حذف غذا انجام نشد.", "danger");
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
// دریافت دسته‌بندی‌ها و پر کردن Select
// ===============================
async function loadCategories() {
    try {
        const response = await fetch("/api/categories/");
        if (!response.ok) throw new Error("Network response was not ok");

        const categories = await response.json();
        const categorySelect = document.getElementById("foodCategory");
        if (!categorySelect) return;

        categorySelect.innerHTML = '<option value="" disabled selected>یک دسته را انتخاب کنید</option>';
        categories.forEach(cat => {
            categorySelect.innerHTML += `<option value="${cat.id}">${cat.name}</option>`;
        });
    } catch (error) {
        console.error("خطا در بارگذاری دسته‌ها:", error);
    }
}

// ===============================
// ساخت دسته‌بندی جدید
// ===============================
async function createCategory() {
    const nameInput = document.getElementById("categoryName");
    const iconInput = document.getElementById("categoryIcon");

    const name = nameInput.value.trim();
    if (!name) {
        showToast("لطفاً نام دسته را وارد کنید.", "warning");
        return;
    }

    const formData = new FormData();
    formData.append("name", name);
    formData.append("icon", iconInput ? iconInput.value.trim() : "🍽");

    try {
        const response = await fetch("/api/categories/create/", {
            method: "POST",
            headers: { "X-CSRFToken": csrftoken },
            body: formData
        });
        const data = await response.json();

        if (data.success) {
            showToast("دسته‌بندی با موفقیت ساخته شد.", "success");

            const modal = bootstrap.Modal.getInstance(document.getElementById("addCategoryModal"));
            if (modal) modal.hide();

            nameInput.value = "";
            if (iconInput) iconInput.value = "🍽";

            await loadCategories();
        } else {
            showToast(data.error || "خطا در ساخت دسته.", "danger");
        }
    } catch (error) {
        console.error("Category Create Error:", error);
        showToast("خطا در ارتباط با سرور.", "danger");
    }
}

// ===============================
// سایدبار: باز/بسته شدن
// ===============================
function initSidebar() {
    const sidebar = document.getElementById("appSidebar");
    const mainCol = document.getElementById("mainCol");
    const toggleBtn = document.getElementById("sidebarToggle");
    const backdrop = document.getElementById("sidebarBackdrop");

    if (!sidebar || !toggleBtn) return;

    toggleBtn.addEventListener("click", () => {
        const isMobile = window.innerWidth <= 768;
        if (isMobile) {
            sidebar.classList.toggle("mobile-open");
            if (backdrop) backdrop.classList.toggle("show", sidebar.classList.contains("mobile-open"));
        } else {
            sidebar.classList.toggle("collapsed");
            if (mainCol) mainCol.classList.toggle("collapsed");
        }
    });

    if (backdrop) {
        backdrop.addEventListener("click", () => {
            sidebar.classList.remove("mobile-open");
            backdrop.classList.remove("show");
        });
    }
}

// ===============================
// ناوبری بین بخش‌ها (بدون وابستگی به کامپوننت تب بوت‌استرپ)
// ===============================
function initSectionNav() {
    const navItems = document.querySelectorAll("[data-section-target]");
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const target = item.getAttribute("data-section-target");

            document.querySelectorAll(".app-section").forEach(sec => sec.classList.remove("active"));
            const targetSection = document.getElementById(`section-${target}`);
            if (targetSection) {
                targetSection.classList.add("active");
                targetSection.classList.remove("fade-up");
                void targetSection.offsetWidth; // ری‌استارت انیمیشن
                targetSection.classList.add("fade-up");
            }

            document.querySelectorAll("[data-section-target]").forEach(el => el.classList.remove("active"));
            document.querySelectorAll(`[data-section-target="${target}"]`).forEach(el => el.classList.add("active"));

            const sidebar = document.getElementById("appSidebar");
            const backdrop = document.getElementById("sidebarBackdrop");
            if (sidebar && sidebar.classList.contains("mobile-open") && window.innerWidth <= 768) {
                sidebar.classList.remove("mobile-open");
                if (backdrop) backdrop.classList.remove("show");
            }
        });
    });
}

// ===============================
// ساعت زنده‌ی هدر
// ===============================
function updateClock() {
    const el = document.getElementById("headerClock");
    if (!el) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ===============================
// نمودارها (Chart.js)
// ===============================
let orderStatusChart = null;
let popularFoodsChart = null;
let dailySalesChart = null;

function initCharts() {
    if (typeof Chart === "undefined") return;

    Chart.defaults.color = "#9AA3B2";
    Chart.defaults.borderColor = "rgba(255,255,255,.08)";
    Chart.defaults.font.family = "Vazirmatn";

    const salesCtx = document.getElementById("dailySalesChart");
    if (salesCtx) {
        dailySalesChart = new Chart(salesCtx, {
            type: "line",
            data: {
                labels: ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"],
                datasets: [{
                    label: "فروش (تومان)",
                    data: [0, 0, 0, 0, 0, 0, 0],
                    borderColor: "#FF8A00",
                    backgroundColor: "rgba(255,138,0,.15)",
                    fill: true,
                    tension: .4,
                    pointRadius: 3,
                    pointBackgroundColor: "#FF8A00"
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, grid: { color: "rgba(255,255,255,.06)" } }, x: { grid: { display: false } } }
            }
        });
    }

    const statusCtx = document.getElementById("orderStatusChart");
    if (statusCtx) {
        orderStatusChart = new Chart(statusCtx, {
            type: "doughnut",
            data: {
                labels: ["جدید", "در حال پخت", "آماده ارسال"],
                datasets: [{ data: [0, 0, 0], backgroundColor: ["#FF8A00", "#3B82F6", "#22C55E"], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, cutout: "68%" }
        });
    }

    const popularCtx = document.getElementById("popularFoodsChart");
    if (popularCtx) {
        popularFoodsChart = new Chart(popularCtx, {
            type: "bar",
            data: { labels: [], datasets: [{ label: "تعداد سفارش", data: [], backgroundColor: "#22C55E", borderRadius: 6 }] },
            options: {
                indexAxis: "y", responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { beginAtZero: true, grid: { color: "rgba(255,255,255,.06)" } }, y: { grid: { display: false } } }
            }
        });
    }
}

function refreshOrderStatusChart(orders) {
    if (!orderStatusChart) return;
    const newCount = orders.filter(o => o.status === "new").length;
    const cookingCount = orders.filter(o => o.status === "cooking").length;
    const readyCount = orders.filter(o => o.status === "ready").length;
    orderStatusChart.data.datasets[0].data = [newCount, cookingCount, readyCount];
    orderStatusChart.update();
}

function refreshPopularFoodsChart(orders) {
    if (!popularFoodsChart || !orders || !orders.length) return;
    const tally = {};
    orders.forEach(order => {
        (order.items || []).forEach(item => {
            tally[item.name] = (tally[item.name] || 0) + Number(item.quantity || 0);
        });
    });
    const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 6);
    popularFoodsChart.data.labels = sorted.map(x => x[0]);
    popularFoodsChart.data.datasets[0].data = sorted.map(x => x[1]);
    popularFoodsChart.update();
}

// ===============================
// افکت کج‌شدن سه‌بعدی کارت‌های آمار با موس
// ===============================
function initTiltCards() {
    const cards = document.querySelectorAll(".stat-card.tilt");
    cards.forEach(card => {
        card.addEventListener("mousemove", e => {
            const rect = card.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width - 0.5;
            const y = (e.clientY - rect.top) / rect.height - 0.5;
            card.style.transform = `perspective(700px) rotateX(${(-y * 8).toFixed(2)}deg) rotateY(${(x * 10).toFixed(2)}deg) translateY(-2px)`;
        });
        card.addEventListener("mouseleave", () => {
            card.style.transform = "perspective(700px) rotateX(0) rotateY(0) translateY(0)";
        });
    });
}

// ===============================
// شروع داشبورد
// ===============================
document.addEventListener("DOMContentLoaded", function () {
    initSidebar();
    initSectionNav();
    initCharts();
    initTiltCards();
    updateClock();
    setInterval(updateClock, 1000);

    loadOrders();
    loadFoods();
    loadCategories();
    setInterval(loadOrders, 3000);
    setInterval(loadFoods, 5000);
});