/*
==========================
Robot Restaurant — Bold / World-class UI
customer.js
==========================
API endpoints unchanged:
  GET  /api/foods/
  POST /api/create_order/
*/

// ==========================
// CSRF
// ==========================

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


// ==========================
// State
// ==========================

let menuData = [];
let cart = [];
let currentCategoryId = "all";
let currentSearch = "";


// ==========================
// Start
// ==========================

window.onload = function () {
    loadFoods();

    const savedCart = sessionStorage.getItem("cart");
    if (savedCart) cart = JSON.parse(savedCart);
    renderCart();

    setupCartDrawer();
    setupSearch();
    hideLoader();
};

function hideLoader() {
    const loader = document.getElementById("pageLoader");
    if (!loader) return;
    setTimeout(function () { loader.classList.add("hide"); }, 1400);
}


// ==========================
// Save Cart
// ==========================

function saveCart() {
    sessionStorage.setItem("cart", JSON.stringify(cart));
}


// ==========================
// Stock Helper
// ==========================

function isSoldOut(food) {
    if (!food) return false;
    if (food.available === false) return true;
    if (food.is_available === false) return true;
    if (food.in_stock === false) return true;
    if (food.sold_out === true) return true;
    if (typeof food.stock === "number" && food.stock <= 0) return true;
    return false;
}


// ==========================
// Load Foods
// ==========================

async function loadFoods() {
    try {
        const response = await fetch("/api/foods/");
        menuData = await response.json();

        if (!menuData || menuData.length === 0) {
            showEmptyState();
            return;
        }

        renderCategories();
        renderFoods(menuData);

    } catch (error) {
        console.error("Load Foods Error:", error);
        showEmptyState();
    }
}


// ==========================
// Empty State
// ==========================

function showEmptyState() {
    const container = document.getElementById("menuContainer");
    if (!container) return;
    container.innerHTML = `
    <div class="empty-state">
        <p class="title">چیزی پیدا نشد</p>
        <p>آشپزخانه مشغول کار است، کمی بعد دوباره سر بزن.</p>
    </div>
    `;
}


// ==========================
// Categories
// ==========================

function renderCategories() {
    const box = document.getElementById("categoryContainer");
    if (!box) return;

    box.innerHTML = "";

    const allTab = document.createElement("div");
    allTab.className = "category-item active is-accent";
    allTab.dataset.categoryId = "all";
    allTab.innerHTML = `<div>✦</div>همه`;
    allTab.addEventListener("click", function () {
        currentCategoryId = "all";
        setActiveCategory(allTab);
        applyFilters();
    });
    box.appendChild(allTab);

    menuData.forEach(function (cat) {
        const item = document.createElement("div");
        item.className = "category-item";
        item.dataset.categoryId = cat.id;
        item.innerHTML = `<div>${cat.icon || ""}</div>${cat.name}`;
        item.addEventListener("click", function () {
            currentCategoryId = cat.id;
            setActiveCategory(item);
            applyFilters();
        });
        box.appendChild(item);
    });
}

function setActiveCategory(activeEl) {
    document.querySelectorAll("#categoryContainer .category-item").forEach(function (el) {
        el.classList.remove("active", "is-accent");
    });
    activeEl.classList.add("active");
    if (activeEl.dataset.categoryId === "all") activeEl.classList.add("is-accent");
}


// ==========================
// Filters (Category + Search)
// ==========================

function getAllFoodsFlat() {
    return menuData.flatMap(cat => (cat.foods || []).map(f => Object.assign({}, f, { category: cat.name, category_id: cat.id })));
}

function applyFilters() {
    let foods = getAllFoodsFlat();

    if (currentCategoryId !== "all") {
        foods = foods.filter(f => f.category_id === currentCategoryId);
    }
    if (currentSearch.trim() !== "") {
        const q = currentSearch.trim();
        foods = foods.filter(f => (f.name || "").indexOf(q) !== -1);
    }

    renderFoods([{ foods: foods }]);
}


// ==========================
// Search
// ==========================

function setupSearch() {
    const input = document.getElementById("searchInput");
    if (!input) return;
    input.addEventListener("input", function () {
        currentSearch = input.value;
        applyFilters();
    });
}


// ==========================
// Render Foods
// ==========================

function renderFoods(data) {
    const container = document.getElementById("menuContainer");
    if (!container) return;

    container.innerHTML = "";
    let totalCount = 0;

    data.forEach(function (cat) {
        (cat.foods || []).forEach(function (food) {
            totalCount++;

            const soldOut = isSoldOut(food);
            const imgSrc = food.image || "/static/images/no-food.png";

            const card = document.createElement("div");
            card.className = "food-card" + (soldOut ? " sold-out" : "");
            card.dataset.foodId = food.id;

            card.innerHTML = `
                <div class="food-img-wrap">
                    <img src="${imgSrc}" onerror="this.src='/static/images/no-food.png'" alt="${food.name}">
                    ${soldOut ? '<span class="food-out-label">ناموجود</span>' : ''}
                </div>
                <div class="food-info">
                    <span class="badge bg-secondary">${food.category || ""}</span>
                    <h4>${food.name}</h4>
                    <p>${food.description || ""}</p>
                    <div class="food-footer">
                        <div class="food-price">${Number(food.price).toLocaleString()} <small>تومان</small></div>
                        <button class="add-btn" ${soldOut ? "disabled" : ""} aria-label="افزودن ${food.name}">+</button>
                    </div>
                </div>
            `;

            if (!soldOut) {
                const btn = card.querySelector(".add-btn");
                btn.addEventListener("click", function () {
                    addFood(food.id, food.name, food.price, btn);
                });
            }

            container.appendChild(card);
        });
    });

    if (totalCount === 0) {
        showEmptyState();
    } else {
        observeReveal();
    }
}


// ==========================
// Scroll Reveal
// ==========================

function observeReveal() {
    const cards = document.querySelectorAll(".food-card:not(.reveal)");
    if (!("IntersectionObserver" in window)) {
        cards.forEach(c => c.classList.add("reveal"));
        return;
    }
    const io = new IntersectionObserver(function (entries, obs) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add("reveal");
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    cards.forEach(c => io.observe(c));
}


// ==========================
// Add / Increase / Decrease / Remove
// ==========================

function addFood(id, name, price, sourceBtn) {
    let item = cart.find(food => food.id === id);
    if (item) {
        item.qty++;
    } else {
        cart.push({ id: id, name: name, price: Number(price), qty: 1 });
    }

    saveCart();
    renderCart();

    if (sourceBtn) {
        const fly = document.createElement("span");
        fly.className = "fly-plus";
        fly.textContent = "+1";
        sourceBtn.appendChild(fly);
        setTimeout(function () { fly.remove(); }, 700);
    }
}

function increase(index) {
    cart[index].qty++;
    saveCart();
    renderCart();
}

function decrease(index) {
    cart[index].qty--;
    if (cart[index].qty <= 0) cart.splice(index, 1);
    saveCart();
    renderCart();
}

function removeItem(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
}


// ==========================
// Render Cart
// ==========================

function renderCart() {
    const cartItems = document.getElementById("cartItems");
    const totalPrice = document.getElementById("totalPrice");
    if (!cartItems || !totalPrice) return;

    cartItems.innerHTML = "";

    if (cart.length === 0) {
        cartItems.innerHTML = `<div class="empty-cart">سبد خرید خالی است</div>`;
        totalPrice.innerHTML = "0";
        updateHeaderCart(0);
        updateMobileBar(0, 0);
        return;
    }

    let total = 0;
    let count = 0;

    cart.forEach(function (item, index) {
        total += item.price * item.qty;
        count += item.qty;

        cartItems.innerHTML += `
        <div class="cart-item">
            <h6>${item.name}</h6>
            <p>${item.price.toLocaleString()} تومان</p>
            <div>
                <button onclick="increase(${index})">+</button>
                <span>${item.qty}</span>
                <button onclick="decrease(${index})">-</button>
                <button onclick="removeItem(${index})" class="btn btn-danger btn-sm">
                    <i class="bi bi-trash"></i>
                </button>
            </div>
        </div>
        `;
    });

    totalPrice.innerHTML = total.toLocaleString();
    updateHeaderCart(count);
    updateMobileBar(count, total);
}

function updateHeaderCart(count) {
    const badge = document.getElementById("headerCartCount");
    if (!badge) return;
    badge.textContent = count;
    badge.classList.add("bump");
    setTimeout(function () { badge.classList.remove("bump"); }, 250);
}

function updateMobileBar(count, total) {
    const bar = document.getElementById("mobileCartBar");
    if (!bar) return;
    if (count > 0) {
        bar.classList.add("show");
        document.getElementById("mcbCount").textContent = count + " آیتم";
        document.getElementById("mcbTotal").textContent = total.toLocaleString() + " تومان";
    } else {
        bar.classList.remove("show");
    }
}


// ==========================
// Cart Drawer
// ==========================

function setupCartDrawer() {
    const drawer = document.getElementById("cartDrawer");
    const overlay = document.getElementById("drawerOverlay");
    const openBtns = document.querySelectorAll("[data-open-cart]");
    const closeBtn = document.getElementById("drawerClose");

    function openCart() { drawer.classList.add("open"); overlay.classList.add("open"); }
    function closeCart() { drawer.classList.remove("open"); overlay.classList.remove("open"); }

    openBtns.forEach(btn => btn.addEventListener("click", openCart));
    if (closeBtn) closeBtn.addEventListener("click", closeCart);
    if (overlay) overlay.addEventListener("click", closeCart);
}


// ==========================
// Submit Order
// ==========================

async function submitOrder() {
    const table = document.getElementById("tableNumber").value;

    if (table === "") {
        alert("ابتدا شماره میز را انتخاب کنید.");
        return;
    }
    if (cart.length === 0) {
        alert("سبد خرید خالی است.");
        return;
    }

    const order = { table: table, foods: cart };

    try {
        const response = await fetch("/api/create_order/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRFToken": csrftoken
            },
            body: JSON.stringify(order)
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.error || "خطا در ثبت سفارش");
            return;
        }

        if (data.success) {
            cart = [];
            saveCart();
            renderCart();
            window.location.href = `/order/${data.order_id}/`;
        } else {
            alert(data.error || "خطا در ثبت سفارش");
        }

    } catch (error) {
        console.error("Submit Order Error:", error);
        alert("خطا در ارتباط با سرور");
    }
}


// ==========================
// Hero Parallax (پرسپکتیو لایه‌ای)
// ==========================

(function () {
    const floaties = document.querySelectorAll(".floaty");
    if (!floaties.length) return;

    window.addEventListener("scroll", function () {
        const y = window.scrollY;
        floaties.forEach(function (el, i) {
            const speed = 0.06 + (i % 4) * 0.03;
            el.style.transform = `translateY(${y * speed}px)`;
        });
    }, { passive: true });
})();


// ==========================
// Tilt Micro-interaction (کارت‌های منو)
// ==========================

document.addEventListener("mousemove", function (e) {
    document.querySelectorAll(".food-card").forEach(function (card) {
        const rect = card.getBoundingClientRect();
        const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (!inside) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const rotateX = ((y - rect.height / 2) / rect.height) * -6;
        const rotateY = ((x - rect.width / 2) / rect.width) * 6;
        card.style.transform = `translateY(-6px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });
});
document.addEventListener("mouseout", function (e) {
    const card = e.target.closest && e.target.closest(".food-card");
    if (card) card.style.transform = "";
});