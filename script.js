console.log("Royal Fragrance - System Initialized");

/* 
   Cart & Global UI Logic 
   Injects Cart Sidebar into every page
*/

document.addEventListener('DOMContentLoaded', () => {
    injectCartHTML();
    setupCartListeners();
    updateCartUI(); // Load any saved items
});

function injectCartHTML() {
    const cartHTML = `
        <div class="cart-overlay" id="cart-overlay"></div>
        <div class="cart-sidebar" id="cart-sidebar">
            <div class="cart-header">
                <h2>Your Collection</h2>
                <button class="close-cart" id="close-cart">&times;</button>
            </div>
            <div class="cart-items" id="cart-items-container">
                <!-- Items injected here -->
                <p style="text-align:center; color:#999; margin-top:2rem;">Your cart is empty.</p>
            </div>
            <div class="cart-footer">
                <div class="cart-total">
                    <span>Total</span>
                    <span id="cart-total-price">$0.00</span>
                </div>
                <a href="checkout.html" class="btn btn-primary checkout-btn">Proceed to Checkout</a>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', cartHTML);
}

function setupCartListeners() {
    // Mobile Menu
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('.main-nav');
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            mainNav.classList.toggle('active');
            mainNav.style.display = mainNav.classList.contains('active') ? 'block' : 'none';
            // Simple visual toggle for now
            if (mainNav.classList.contains('active')) {
                mainNav.style.position = 'absolute';
                mainNav.style.top = '100%';
                mainNav.style.left = '0';
                mainNav.style.width = '100%';
                mainNav.style.background = 'white';
                mainNav.style.padding = '1rem';
                mainNav.style.boxShadow = '0 5px 15px rgba(0,0,0,0.1)';
            }
        });
    }

    // Cart Toggles
    const cartBtns = document.querySelectorAll('.cart-btn');
    const cartSidebar = document.getElementById('cart-sidebar');
    const cartOverlay = document.getElementById('cart-overlay');
    const closeCartBtn = document.getElementById('close-cart');

    function openCart() {
        cartSidebar.classList.add('open');
        cartOverlay.classList.add('open');
    }

    function closeCart() {
        cartSidebar.classList.remove('open');
        cartOverlay.classList.remove('open');
    }

    cartBtns.forEach(btn => btn.addEventListener('click', openCart));
    if (closeCartBtn) closeCartBtn.addEventListener('click', closeCart);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCart);
}

/* Cart Data Logic (Global) */
// Check if cart exists in localStorage, else init
let cart = JSON.parse(localStorage.getItem('rf_cart')) || [];

function addToCart(id) {
    // Assuming 'products' is available globally from products.js
    if (typeof products === 'undefined') return;

    const product = products.find(p => p.id === id);
    if (product) {
        // Check if already in cart
        const existing = cart.find(item => item.id === id);
        if (existing) {
            existing.qty = (existing.qty || 1) + 1;
        } else {
            cart.push({ ...product, qty: 1 });
        }

        saveCart();
        updateCartUI();

        // Open cart feedback
        const cartSidebar = document.getElementById('cart-sidebar');
        const cartOverlay = document.getElementById('cart-overlay');
        if (cartSidebar && cartOverlay) {
            cartSidebar.classList.add('open');
            cartOverlay.classList.add('open');
        }
    }
}

function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    updateCartUI();
}

function saveCart() {
    localStorage.setItem('rf_cart', JSON.stringify(cart));
}

function updateCartUI() {
    // Update Badge
    const countElements = document.querySelectorAll('.cart-count');
    const totalQty = cart.reduce((acc, item) => acc + (item.qty || 1), 0);
    countElements.forEach(el => el.textContent = totalQty);

    // Update Sidebar List
    const container = document.getElementById('cart-items-container');
    const totalPriceEl = document.getElementById('cart-total-price');

    if (!container) return;

    if (cart.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#999; margin-top:2rem;">Your cart is empty.</p>';
        if (totalPriceEl) totalPriceEl.textContent = '$0.00';
        return;
    }

    let html = '';
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * (item.qty || 1);
        total += itemTotal;
        html += `
            <div class="cart-item">
                <div class="cart-item-img-placeholder" style="width:60px; height:60px; background:#f4f4f4; display:flex; align-items:center; justify-content:center;">
                    <i class="fa-solid fa-bottle-droplet" style="color:#ccc;"></i>
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-title">${item.name}</div>
                    <div class="cart-item-price">$${item.price} x ${item.qty || 1}</div>
                </div>
                <button onclick="removeFromCart(${item.id})" style="background:none; border:none; color:red; cursor:pointer;">&times;</button>
            </div>
        `;
    });

    container.innerHTML = html;
    if (totalPriceEl) totalPriceEl.textContent = '$' + total.toFixed(2);
}

// Update DOMContentLoaded to include setup
document.addEventListener('DOMContentLoaded', () => {
    // Other initializations
});
