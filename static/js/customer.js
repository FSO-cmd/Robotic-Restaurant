/*
==========================
LUMEN — Smart Menu
customer.js
==========================
API endpoints used:
  GET  /api/foods/
  POST /api/create_order/
  GET  /api/orders/<id>/
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
let selectedSeat = null;   // { tableIndex, tableId, chairId, tableLabel }
let foodsLoaded = false;


// ==========================
// Start
// ==========================

window.onload = function () {
    initLoader();
    initSessionCode();
    initMarquee();
    initMusicToggle();
    initSeatPicker();
    initTrackDrawer();

    loadFoods();

    const savedCart = sessionStorage.getItem("cart");
    if (savedCart) cart = JSON.parse(savedCart);

    const savedSeat = sessionStorage.getItem("selectedSeat");
    if (savedSeat) {
        selectedSeat = JSON.parse(savedSeat);
        applySeatSelectionUI();
    }

    renderCart();
    setupCartDrawer();
    setupSearch();
    checkForActiveOrder();
};


// ==========================================================
// LOADER  (progress ring + particles + optional 3D shape)
// ==========================================================

let loaderProgress = 0;
let loaderDone = false;

function initLoader() {
    spawnLoaderParticles();
    start3DLoaderShape();

    // Simulated progress so the ring/percentage always animate smoothly,
    // even though the actual network request is fast. Real completion
    // (loadFoods finishing) fast-forwards it to 100.
    const fakeTimer = setInterval(function () {
        if (loaderProgress >= 92 || loaderDone) {
            clearInterval(fakeTimer);
            return;
        }
        loaderProgress += Math.random() * 9 + 3;
        if (loaderProgress > 92) loaderProgress = 92;
        setLoaderProgress(loaderProgress);
    }, 180);

    const enterBtn = document.getElementById("loaderEnter");
    if (enterBtn) {
        enterBtn.addEventListener("click", function () {
            hideLoader();
        });
    }
}

function setLoaderProgress(pct) {
    pct = Math.max(0, Math.min(100, Math.round(pct)));
    const ring = document.getElementById("loaderRingFill");
    const label = document.getElementById("loaderPct");
    if (ring) {
        const circumference = 565; // matches stroke-dasharray in CSS
        ring.style.strokeDashoffset = circumference - (circumference * pct / 100);
    }
    if (label) label.textContent = pct + "%";
}

function finishLoaderProgress() {
    loaderDone = true;
    loaderProgress = 100;
    setLoaderProgress(100);
    const enterBtn = document.getElementById("loaderEnter");
    if (enterBtn) enterBtn.classList.add("ready");
    // Auto-continue shortly after reaching 100%, but the button also
    // lets the user jump in immediately.
    setTimeout(hideLoader, 900);
}

function hideLoader() {
    const loader = document.getElementById("pageLoader");
    if (!loader || loader.classList.contains("hidden")) return;
    loader.classList.add("hidden");
    stop3DLoaderShape();
}

function spawnLoaderParticles() {
    const box = document.getElementById("loaderParticles");
    if (!box) return;
    const count = 22;
    for (let i = 0; i < count; i++) {
        const p = document.createElement("span");
        const size = Math.random() * 4 + 2;
        p.style.width = size + "px";
        p.style.height = size + "px";
        p.style.left = Math.random() * 100 + "%";
        p.style.bottom = "0px";
        p.style.animationDuration = (Math.random() * 3 + 3) + "s";
        p.style.animationDelay = (Math.random() * 3) + "s";
        box.appendChild(p);
    }
}

// Lightweight rotating wireframe shape using three.js (loaded via CDN in
// the page). Fails silently if three.js isn't available.
let _loaderRenderer = null;
let _loaderAnimId = null;

function start3DLoaderShape() {
    const canvas = document.getElementById("loader3d");
    if (!canvas || typeof THREE === "undefined") return;

    try {
        const size = canvas.clientWidth || 150;
        const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
        renderer.setSize(size, size, false);
        _loaderRenderer = renderer;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.z = 4.2;

        const geo = new THREE.IcosahedronGeometry(1.4, 0);
        const wire = new THREE.WireframeGeometry(geo);
        const mat = new THREE.LineBasicMaterial({ color: 0xc9a227, transparent: true, opacity: 0.85 });
        const shape = new THREE.LineSegments(wire, mat);
        scene.add(shape);

        function animate() {
            shape.rotation.x += 0.006;
            shape.rotation.y += 0.009;
            renderer.render(scene, camera);
            _loaderAnimId = requestAnimationFrame(animate);
        }
        animate();
    } catch (e) {
        console.warn("Loader 3D shape skipped:", e);
    }
}

function stop3DLoaderShape() {
    if (_loaderAnimId) cancelAnimationFrame(_loaderAnimId);
    if (_loaderRenderer) {
        _loaderRenderer.dispose();
        _loaderRenderer = null;
    }
}


// ==========================
// Session code (cosmetic identifier for this browsing session)
// ==========================

function initSessionCode() {
    const el = document.getElementById("sessionCode");
    if (!el) return;
    let code = sessionStorage.getItem("sessionCode");
    if (!code) {
        code = Math.random().toString(36).slice(2, 7).toUpperCase();
        sessionStorage.setItem("sessionCode", code);
    }
    el.textContent = code;
}


// ==========================
// Marquee
// ==========================

function initMarquee() {
    const track = document.getElementById("marqueeTrack");
    if (!track) return;

    const phrases = [
        "مواد اولیه تازه",
        "سرو سریع",
        "پیگیری زنده سفارش",
        "کیفیت بدون مصالحه",
        "پرداخت امن"
    ];

    // Build the strip twice back-to-back so the CSS animation
    // (translateX -50%) loops seamlessly.
    let html = "";
    for (let rep = 0; rep < 2; rep++) {
        phrases.forEach(function (text) {
            html += `<span>${text}<span class="sep">✦</span></span>`;
        });
    }
    track.innerHTML = html;
}


// ==========================
// Background music toggle
// ==========================

const AUDIO_SRC = "/static/audio/ambient.mp3"; // update to your actual track
let bgAudio = null;
let musicPlaying = false;

function initMusicToggle() {
    const btn = document.getElementById("musicToggle");
    const fab = document.getElementById("musicFab");

    bgAudio = new Audio(AUDIO_SRC);
    bgAudio.loop = true;
    bgAudio.volume = 0.4;

    function toggleMusic() {
        if (!bgAudio) return;
        if (musicPlaying) {
            bgAudio.pause();
            musicPlaying = false;
        } else {
            bgAudio.play().catch(function (err) {
                console.warn("Background music could not start:", err);
            });
            musicPlaying = true;
        }
        updateMusicIcons();
    }

    if (btn) btn.addEventListener("click", toggleMusic);
    if (fab) fab.addEventListener("click", toggleMusic);
}

function updateMusicIcons() {
    [document.getElementById("musicToggle"), document.getElementById("musicFab")].forEach(function (el) {
        if (!el) return;
        const icon = el.querySelector("i");
        el.classList.toggle("active", musicPlaying);
        el.classList.toggle("playing", musicPlaying);
        if (icon) icon.className = musicPlaying ? "bi bi-volume-up-fill" : "bi bi-volume-mute-fill";
    });
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

        foodsLoaded = true;
        finishLoaderProgress();

        if (!menuData || menuData.length === 0) {
            showEmptyState();
            return;
        }

        renderCategories();
        renderFoods(menuData);

    } catch (error) {
        console.error("Load Foods Error:", error);
        foodsLoaded = true;
        finishLoaderProgress();
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
    allTab.className = "cat-chip active";
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
        item.className = "cat-chip";
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
    document.querySelectorAll("#categoryContainer .cat-chip").forEach(function (el) {
        el.classList.remove("active");
    });
    activeEl.classList.add("active");
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

            const row = document.createElement("div");
            row.className = "menu-row glass" + (soldOut ? " sold-out" : "");
            row.dataset.foodId = food.id;

            row.innerHTML = `
                <div class="thumb">
                    <img src="${imgSrc}" onerror="this.src='/static/images/no-food.png'" alt="${food.name}">
                    ${soldOut ? '<span class="badge out">ناموجود</span>' : ''}
                </div>
                <div class="body">
                    <h4>${food.name}</h4>
                    <div class="stat-line"><i class="bi bi-tag-fill"></i> ${food.category || ""}</div>
                    <p class="desc">${food.description || ""}</p>
                    <div class="price-chip"><span class="mono-num">${Number(food.price).toLocaleString()}</span><span class="unit">تومان</span></div>
                </div>
                <div class="side">
                    <button class="add-btn" ${soldOut ? "disabled" : ""} aria-label="افزودن ${food.name}"><i class="bi bi-plus-lg"></i></button>
                </div>
            `;

            if (!soldOut) {
                const btn = row.querySelector(".add-btn");
                btn.addEventListener("click", function () {
                    addFood(food.id, food.name, food.price, btn);
                });
            }

            container.appendChild(row);
        });
    });

    if (totalCount === 0) {
        showEmptyState();
    } else {
        observeReveal();
    }
}

function observeReveal() {
    const rows = document.querySelectorAll(".menu-row:not(.reveal)");
    if (!("IntersectionObserver" in window)) {
        rows.forEach(c => c.classList.add("reveal"));
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
    rows.forEach(c => io.observe(c));
}


// ==========================
// Cart
// ==========================

function saveCart() {
    sessionStorage.setItem("cart", JSON.stringify(cart));
}

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

function renderCart() {
    const cartItems = document.getElementById("cartItems");
    const totalPrice = document.getElementById("totalPrice");
    const orderBtn = document.getElementById("submitOrderBtn");
    const seatMsg = document.getElementById("seatRequiredMsg");
    if (!cartItems || !totalPrice) return;

    cartItems.innerHTML = "";

    if (cart.length === 0) {
        cartItems.innerHTML = `<div class="empty-cart"><i class="bi bi-basket3" style="font-size:1.8rem;display:block;margin-bottom:10px;"></i>سبد خرید خالی است</div>`;
        totalPrice.innerHTML = "0";
        if (orderBtn) orderBtn.disabled = true;
        if (seatMsg) seatMsg.classList.remove("show");
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
        <div class="cart-line">
            <div class="info">
                <h5>${item.name}</h5>
                <span class="mono-num">${item.price.toLocaleString()} تومان</span>
            </div>
            <div class="qty-stepper">
                <button onclick="decrease(${index})">-</button>
                <span>${item.qty}</span>
                <button onclick="increase(${index})">+</button>
            </div>
            <button class="remove" onclick="removeItem(${index})"><i class="bi bi-trash"></i></button>
        </div>
        `;
    });

    totalPrice.innerHTML = total.toLocaleString();

    if (seatMsg) seatMsg.classList.toggle("show", !selectedSeat);
    if (orderBtn) orderBtn.disabled = !selectedSeat;

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

function setupCartDrawer() {
    const drawer = document.getElementById("cartDrawer");
    const overlay = document.getElementById("drawerOverlay");
    const openBtns = document.querySelectorAll("[data-open-cart]");
    const closeBtn = document.getElementById("drawerClose");
    const submitBtn = document.getElementById("submitOrderBtn");

    function openCart() { drawer.classList.add("open"); overlay.classList.add("open"); }
    function closeCart() { drawer.classList.remove("open"); overlay.classList.remove("open"); }

    openBtns.forEach(btn => btn.addEventListener("click", openCart));
    if (closeBtn) closeBtn.addEventListener("click", closeCart);
    if (overlay) overlay.addEventListener("click", closeCart);
    if (submitBtn) submitBtn.addEventListener("click", submitOrder);
}

async function submitOrder() {
    if (!selectedSeat) {
        const seatMsg = document.getElementById("seatRequiredMsg");
        if (seatMsg) seatMsg.classList.add("show");
        showToast("ابتدا میز خود را انتخاب کنید.", true);
        openSeatModal();
        return;
    }
    if (cart.length === 0) {
        showToast("سبد خرید خالی است.", true);
        return;
    }

    const order = { table: selectedSeat.tableIndex, seat: selectedSeat.chairId, foods: cart };

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
            showToast(data.error || "خطا در ثبت سفارش", true);
            return;
        }

        if (data.success) {
            cart = [];
            saveCart();
            renderCart();

            const orderId = data.order_id;
            const tableLabel = selectedSeat.tableLabel;

            sessionStorage.setItem("lastOrder", JSON.stringify({
                id: orderId,
                tableLabel: tableLabel
            }));

            // Close the cart drawer instead of navigating away
            const cartDrawer = document.getElementById("cartDrawer");
            const cartOverlay = document.getElementById("drawerOverlay");
            if (cartDrawer) cartDrawer.classList.remove("open");
            if (cartOverlay) cartOverlay.classList.remove("open");

            showToast("سفارش با موفقیت ثبت شد!", false);

            // Reveal the tracking fab and open tracking right here on the page
            const fab = document.getElementById("trackFab");
            const ping = document.getElementById("trackPing");
            if (fab) fab.classList.add("show");
            if (ping) ping.style.display = "block";

            openTrackDrawer(orderId, tableLabel);
        } else {
            showToast(data.error || "خطا در ثبت سفارش", true);
        }

    } catch (error) {
        console.error("Submit Order Error:", error);
        showToast("خطا در ارتباط با سرور", true);
    }
}


// ==========================================================
// SEAT / TABLE PICKER
// ==========================================================

// Positions are percentages of the .seat-floor box (not fixed pixels),
// so the layout scales correctly instead of overflowing on narrow
// mobile widths (where .seat-floor is smaller than its 460px reference size).
const SEAT_LAYOUT = [
    { id: "T1", leftPct: 8.7,  topPct: 9.4  },
    { id: "T2", leftPct: 42.4, topPct: 9.4  },
    { id: "T3", leftPct: 72.0, topPct: 9.4  },
    { id: "T4", leftPct: 8.7,  topPct: 59.4 },
    { id: "T5", leftPct: 42.4, topPct: 59.4 },
    { id: "T6", leftPct: 72.0, topPct: 59.4 }
];
const CHAIR_OFFSETS = [
    { key: "top",    left: 27, top: -6  },
    { key: "right",  left: 60, top: 27  },
    { key: "bottom", left: 27, top: 60  },
    { key: "left",   left: -6, top: 27  }
];

let seatOccupancy = null; // built once per page load

function buildSeatOccupancy() {
    if (seatOccupancy) return seatOccupancy;
    seatOccupancy = {};
    SEAT_LAYOUT.forEach(function (table) {
        CHAIR_OFFSETS.forEach(function (chair) {
            const key = table.id + "-" + chair.key;
            seatOccupancy[key] = Math.random() < 0.28; // ~28% occupied, mock data
        });
    });
    return seatOccupancy;
}

function initSeatPicker() {
    const pillBtn = document.getElementById("seatPillBtn");
    const closeBtn = document.getElementById("seatClose");
    const overlay = document.getElementById("seatOverlay");
    const rotateLeft = document.getElementById("rotateLeft");
    const rotateRight = document.getElementById("rotateRight");
    const confirmBtn = document.getElementById("seatConfirmBtn");

    renderSeatFloor();

    if (pillBtn) pillBtn.addEventListener("click", openSeatModal);
    if (closeBtn) closeBtn.addEventListener("click", closeSeatModal);
    if (overlay) overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeSeatModal();
    });

    let rotated = false;
    const floor = document.getElementById("seatFloor");
    function toggleRotate() {
        rotated = !rotated;
        if (floor) floor.classList.toggle("rotated", rotated);
    }
    if (rotateLeft) rotateLeft.addEventListener("click", toggleRotate);
    if (rotateRight) rotateRight.addEventListener("click", toggleRotate);

    if (confirmBtn) confirmBtn.addEventListener("click", confirmSeatSelection);
}

function openSeatModal() {
    const overlay = document.getElementById("seatOverlay");
    if (overlay) overlay.classList.add("open");
}
function closeSeatModal() {
    const overlay = document.getElementById("seatOverlay");
    if (overlay) overlay.classList.remove("open");
}

function renderSeatFloor() {
    const floor = document.getElementById("seatFloor");
    if (!floor) return;
    floor.innerHTML = "";

    const occ = buildSeatOccupancy();

    SEAT_LAYOUT.forEach(function (table, tIndex) {
        const group = document.createElement("div");
        group.className = "table-group";
        group.style.left = table.leftPct + "%";
        group.style.top = table.topPct + "%";
        group.dataset.tableId = table.id;

        const core = document.createElement("div");
        core.className = "table-core";
        core.textContent = tIndex + 1;
        group.appendChild(core);

        CHAIR_OFFSETS.forEach(function (chairDef) {
            const chairKey = table.id + "-" + chairDef.key;
            const isOccupied = occ[chairKey];

            const chair = document.createElement("div");
            chair.className = "chair " + (isOccupied ? "occupied" : "free");
            chair.style.left = chairDef.left + "px";
            chair.style.top = chairDef.top + "px";
            chair.dataset.tableId = table.id;
            chair.dataset.tableIndex = tIndex + 1;
            chair.dataset.chairKey = chairKey;

            const reticle = document.createElement("div");
            reticle.className = "chair-reticle";
            chair.appendChild(reticle);

            if (!isOccupied) {
                chair.addEventListener("click", function () {
                    selectChair(table, tIndex + 1, chairKey, group, chair);
                });
            }

            group.appendChild(chair);
        });

        floor.appendChild(group);
    });
}

function selectChair(table, tableIndex, chairKey, groupEl, chairEl) {
    document.querySelectorAll(".chair.selected").forEach(function (c) { c.classList.remove("selected"); });
    document.querySelectorAll(".table-group.selected").forEach(function (g) { g.classList.remove("selected"); });

    chairEl.classList.add("selected");
    groupEl.classList.add("selected");

    const pendingSeat = {
        tableIndex: tableIndex,
        tableId: table.id,
        chairId: chairKey,
        tableLabel: "میز " + tableIndex
    };

    updateSeatSummary(pendingSeat);

    const confirmBtn = document.getElementById("seatConfirmBtn");
    if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.onclick = function () { confirmSeatSelection(pendingSeat); };
    }
}

function updateSeatSummary(pendingSeat) {
    const title = document.getElementById("seatSummaryTitle");
    const sub = document.getElementById("seatSummarySub");
    const dots = document.getElementById("seatSummaryDots");

    if (title) title.textContent = pendingSeat.tableLabel + " انتخاب شد";
    if (sub) sub.textContent = "برای تأیید روی دکمه بزن";
    if (dots) {
        dots.innerHTML = "";
        for (let i = 0; i < 4; i++) {
            const d = document.createElement("span");
            if (i === 0) d.classList.add("filled");
            dots.appendChild(d);
        }
    }
}

function confirmSeatSelection(pendingSeat) {
    if (!pendingSeat) return;
    selectedSeat = pendingSeat;
    sessionStorage.setItem("selectedSeat", JSON.stringify(selectedSeat));
    applySeatSelectionUI();
    closeSeatModal();
    renderCart();
    showToast(selectedSeat.tableLabel + " با موفقیت انتخاب شد.", false);
}

function applySeatSelectionUI() {
    const pill = document.getElementById("seatPillBtn");
    const label = document.getElementById("seatPillLabel");
    if (!selectedSeat) return;
    if (label) label.textContent = selectedSeat.tableLabel;
    if (pill) pill.classList.add("chosen");

    const seatMsg = document.getElementById("seatRequiredMsg");
    if (seatMsg) seatMsg.classList.remove("show");
}


// ==========================================================
// TOAST
// ==========================================================

function showToast(message, isError) {
    const toast = document.getElementById("toast");
    const msg = document.getElementById("toastMsg");
    const icon = document.getElementById("toastIcon");
    if (!toast || !msg) { alert(message); return; }
    msg.textContent = message;
    toast.classList.toggle("error", !!isError);
    if (icon) icon.className = isError ? "bi bi-exclamation-circle-fill" : "bi bi-check-circle-fill";
    toast.classList.add("show");
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(function () { toast.classList.remove("show"); }, 2600);
}


// ==========================================================
// ORDER TRACKING DRAWER
// ==========================================================

// Matches the actual backend order.status values (see accept_order /
// ready_order... views: new -> accepted -> cooking -> sent -> done, or rejected).
const TRACK_STEPS = [
    { key: "new",      label: "سفارش ثبت شد",     desc: "سفارش شما با موفقیت دریافت شد" },
    { key: "accepted", label: "تایید سفارش",       desc: "رستوران در حال بررسی سفارش است" },
    { key: "cooking",  label: "آماده‌سازی غذا",    desc: "آشپزخانه در حال آماده کردن غذاست" },
    { key: "sent",     label: "ارسال با ربات",     desc: "ربات سفارش شما را حمل می‌کند" },
    { key: "done",     label: "تحویل سفارش",       desc: "سفارش به میز شما تحویل داده شد" }
];

let trackPollTimer = null;

function initTrackDrawer() {
    const fab = document.getElementById("trackFab");
    const closeBtn = document.getElementById("trackClose");
    const overlay = document.getElementById("trackOverlay");

    if (fab) {
        fab.addEventListener("click", function () {
            const saved = sessionStorage.getItem("lastOrder");
            if (!saved) return;
            const order = JSON.parse(saved);
            openTrackDrawer(order.id, order.tableLabel);
        });
    }
    if (closeBtn) closeBtn.addEventListener("click", closeTrackDrawer);
    if (overlay) overlay.addEventListener("click", function (e) {
        if (e.target === overlay) closeTrackDrawer();
    });
}

function openTrackDrawer(orderId, tableLabel) {
    const drawer = document.getElementById("trackDrawer");
    const overlay = document.getElementById("trackOverlay");
    if (!drawer || !overlay) return;

    drawer.classList.add("open");
    overlay.classList.add("open");

    loadOrderTracking(orderId, tableLabel);
    startTrackPolling(orderId, tableLabel);
}

function closeTrackDrawer() {
    const drawer = document.getElementById("trackDrawer");
    const overlay = document.getElementById("trackOverlay");
    if (drawer) drawer.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    stopTrackPolling();
}

function startTrackPolling(orderId, tableLabel) {
    stopTrackPolling();
    // Same 3s cadence the old standalone tracking page used.
    trackPollTimer = setInterval(function () {
        loadOrderTracking(orderId, tableLabel);
    }, 3000);
}

function stopTrackPolling() {
    if (trackPollTimer) {
        clearInterval(trackPollTimer);
        trackPollTimer = null;
    }
}

function checkForActiveOrder() {
    const saved = sessionStorage.getItem("lastOrder");
    const fab = document.getElementById("trackFab");
    const ping = document.getElementById("trackPing");
    if (!saved || !fab) return;
    fab.classList.add("show");
    if (ping) ping.style.display = "block";
}

// Lazily injects a small info row (order total + table) above the steps,
// without needing to touch the HTML template.
function ensureTrackInfoBox() {
    let box = document.getElementById("trackInfoBox");
    if (box) return box;

    const stepsBox = document.getElementById("trackSteps");
    if (!stepsBox || !stepsBox.parentNode) return null;

    box = document.createElement("div");
    box.id = "trackInfoBox";
    box.className = "seat-summary";
    box.style.marginTop = "18px";
    box.innerHTML = `
        <div class="ss-info">
            <h5 id="trackStatusText">در انتظار تایید</h5>
            <p id="trackTotalText">—</p>
        </div>
    `;
    stepsBox.parentNode.insertBefore(box, stepsBox);
    return box;
}

async function loadOrderTracking(orderId, tableLabel) {
    const idEl = document.getElementById("trackOrderId");
    const seatEl = document.getElementById("trackSeatLabel");
    const errBox = document.getElementById("trackError");
    const errMsg = document.getElementById("trackErrorMsg");
    const infoBox = ensureTrackInfoBox();

    if (idEl) idEl.textContent = orderId;
    if (seatEl) seatEl.textContent = tableLabel || "—";
    if (errBox) errBox.style.display = "none";

    try {
        const response = await fetch(`/api/orders/${orderId}/`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "خطا در دریافت وضعیت سفارش");
        }

        renderTrackSteps(data.status);

        if (infoBox) {
            const statusText = infoBox.querySelector("#trackStatusText");
            const totalText = infoBox.querySelector("#trackTotalText");
            const labels = {
                new: "در انتظار تایید", accepted: "سفارش تایید شد", cooking: "در حال پخت",
                sent: "ربات در مسیر است", done: "نوش جان!", rejected: "سفارش رد شد"
            };
            if (statusText) statusText.textContent = labels[data.status] || labels.new;
            if (totalText && typeof data.table !== "undefined") {
                const totalPart = data.total ? Number(data.total).toLocaleString() + " تومان" : "";
                totalText.textContent = `میز ${data.table}${totalPart ? " • " + totalPart : ""}`;
            }
        }

        if (data.status === "rejected") {
            stopTrackPolling();
            if (errBox && errMsg) {
                errMsg.textContent = "متأسفانه سفارش شما رد شد.";
                errBox.style.display = "flex";
            }
        } else if (data.status === "done") {
            stopTrackPolling();
        }
    } catch (error) {
        console.error("Order Tracking Error:", error);
        if (errBox && errMsg) {
            errMsg.textContent = "امکان دریافت وضعیت سفارش نیست.";
            errBox.style.display = "flex";
        }
    }
}

function renderTrackSteps(status) {
    const box = document.getElementById("trackSteps");
    if (!box) return;
    box.innerHTML = "";

    if (status === "rejected") {
        // Only the "order received" step is marked done; the rest show as rejected.
        TRACK_STEPS.forEach(function (step, i) {
            const el = document.createElement("div");
            el.className = "track-step";
            const dotColor = i === 0 ? "" : "background:#C2495B;border-color:#C2495B;color:#fff;";
            el.innerHTML = `
                <div class="track-dot" style="${i === 0 ? '' : dotColor}"><i class="bi ${i === 0 ? 'bi-check-lg' : 'bi-x-lg'}"></i></div>
                <div class="track-info">
                    <h5 style="${i === 0 ? '' : 'color:#C2495B;'}">${i === 0 ? step.label : 'لغو شد'}</h5>
                    <p>${i === 0 ? step.desc : ''}</p>
                </div>
            `;
            if (i === 0) el.classList.add("done");
            box.appendChild(el);
        });
        return;
    }

    const currentIndex = TRACK_STEPS.findIndex(s => s.key === status);

    TRACK_STEPS.forEach(function (step, i) {
        const el = document.createElement("div");
        el.className = "track-step";
        if (currentIndex >= 0) {
            if (i < currentIndex) el.classList.add("done");
            else if (i === currentIndex) el.classList.add("active");
        }

        el.innerHTML = `
            <div class="track-dot"><i class="bi ${i <= currentIndex ? 'bi-check-lg' : 'bi-circle'}"></i></div>
            <div class="track-info">
                <h5>${step.label}</h5>
                <p>${step.desc}</p>
            </div>
        `;
        box.appendChild(el);
    });
}