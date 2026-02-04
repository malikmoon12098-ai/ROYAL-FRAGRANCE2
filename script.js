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

/* AI Chatbot Logic */
function injectChatbot() {
    const chatHTML = `
        <div class="chat-widget-btn" id="chat-toggle">
            <i class="fa-solid fa-comments"></i>
        </div>
        <div class="chat-window" id="chat-window">
            <div class="chat-header">
                <div style="width:40px; height:40px; background:white; border-radius:50%; display:flex; align-items:center; justify-content:center;">
                    <i class="fa-solid fa-robot" style="color:var(--color-primary);"></i>
                </div>
                <div>
                    <h3 style="margin:0; font-size:1rem;">Royal AI Assistant</h3>
                    <span style="font-size:0.7rem; opacity:0.8;">Online | Replies Instantly</span>
                </div>
                <button id="close-chat" style="margin-left:auto; background:none; border:none; color:white; font-size:1.2rem; cursor:pointer;">&times;</button>
            </div>
            <div class="chat-messages" id="chat-messages">
                <div class="message bot">
                    Hello! Welcome to Royal Fragrance. How can I assist you today?
                </div>
                <div class="message bot">
                    You can ask me about:
                    <br>📦 Order Status
                    <br>💎 Best Sellers
                    <br>👃 Perfume Recommendations
                </div>
            </div>
            <form class="chat-input-area" id="chat-form">
                <input type="text" id="chat-input" placeholder="Type a message..." autocomplete="off">
                <button type="submit"><i class="fa-solid fa-paper-plane"></i></button>
            </form>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', chatHTML);
    setupChatListeners();
}

function setupChatListeners() {
    const toggle = document.getElementById('chat-toggle');
    const window = document.getElementById('chat-window');
    const close = document.getElementById('close-chat');
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const messages = document.getElementById('chat-messages');

    if (toggle) {
        toggle.addEventListener('click', () => {
            window.classList.add('open');
            toggle.style.display = 'none';
        });
    }

    if (close) {
        close.addEventListener('click', () => {
            window.classList.remove('open');
            toggle.style.display = 'flex';
        });
    }

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;

            // Add User Message
            addMessage(text, 'user');
            input.value = '';

            // Simulate AI Response
            simulateAIResponse(text);
        });
    }

    function addMessage(text, type) {
        const div = document.createElement('div');
        div.className = `message ${type}`;
        div.innerHTML = text;
        messages.appendChild(div);
        messages.scrollTop = messages.scrollHeight;
    }

    function simulateAIResponse(userText) {
        // Simple keyword matching for demo
        let response = "I'm sorry, I didn't verify that. Could you please rephrase?";
        const lower = userText.toLowerCase();

        if (lower.includes('hello') || lower.includes('hi')) {
            response = "Greetings! How may I help you find your signature scent?";
        } else if (lower.includes('order') || lower.includes('status')) {
            response = "For order status, please provide your Order ID. You can also check your email for the tracking link.";
        } else if (lower.includes('price') || lower.includes('cost')) {
            response = "Our perfumes range from $75 to $150. Would you like to see our 'Under $100' collection?";
        } else if (lower.includes('recommend') || lower.includes('best') || lower.includes('suggestion')) {
            response = "Our best seller is 'Emerald Oud'. It's a unisex fragrance with woody notes. Would you like to view it?";
        } else if (lower.includes('delivery') || lower.includes('shipping')) {
            response = "We offer complimentary shipping on orders over $100. Standard delivery takes 3-5 business days.";
        }

        // Simulating typing delay
        setTimeout(() => {
            addMessage('<i class="fa-solid fa-ellipsis fa-fade"></i>', 'botTyping');
            setTimeout(() => {
                const typing = document.querySelector('.message.botTyping');
                if (typing) typing.remove();
                addMessage(response, 'bot');
            }, 1000);
        }, 500);
    }
}

// Update DOMContentLoaded to include chat
document.addEventListener('DOMContentLoaded', () => {
    // ... existing calls handled by previous code replacement logic if I replace the whole block again?
    // Wait, I am appending here. The previous event listener is at the top of file.
    // I should just call injectChatbot() if I can, but I can't easily hook into the previous listener without replacing it.
    // So I will add a NEW listener or just call it if document is ready (which it won't be if this runs script top level).
    // Safest is to add another listener.
    injectChatbot();
});
