/* Admin Dashboard Logic */

document.addEventListener('DOMContentLoaded', () => {
    loadProducts();
    setupNavigation();
});

function setupNavigation() {
    const links = document.querySelectorAll('.sidebar a');
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            // UI Update is handled in switchView mainly, but let's handle active state here
            links.forEach(l => l.classList.remove('active'));
            e.target.closest('a').classList.add('active');
        });
    });
}

function switchView(viewName) {
    if (viewName === 'products') loadProducts();
    if (viewName === 'orders') loadOrders();
    if (viewName === 'analytics') loadAnalytics();
    if (viewName === 'hisab-kitab') loadHisabKitab();
    if (viewName === 'customers') loadCustomers();
    if (viewName === 'ai-insights') loadAIInsights();
    if (viewName === 'contact-settings') loadContactSettings();
}

// Update Global Analytics (Placeholder for potential future use)

function loadAnalytics() {
    const main = document.getElementById('main-content');
    const orders = JSON.parse(localStorage.getItem('rf_orders')) || [];
    const products = JSON.parse(localStorage.getItem('rf_products')) || [];

    // Calculate basic stats
    const totalRevenue = orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => sum + o.total, 0);
    const totalOrders = orders.length;
    const lowStockCount = products.filter(p => p.stock < 10).length;
    const totalStockValue = products.reduce((sum, p) => sum + (p.price * p.stock), 0);

    // Calculate Net Profit (using 60% fallback for cost if not set)
    const netProfit = orders.filter(o => o.status !== 'Cancelled').reduce((sum, o) => {
        let orderCost = 0;
        o.items.forEach(item => {
            const product = products.find(p => p.id === item.id);
            const cost = product ? (product.costPrice || (product.price * 0.6)) : 0;
            orderCost += (cost * item.qty);
        });
        return sum + (o.total - orderCost);
    }, 0);

    main.innerHTML = `
        <header class="header">
            <h1>Analytics Overview</h1>
            <div class="user-profile"><i class="fa-solid fa-user-circle"></i> Admin</div>
        </header>

        <section class="card-grid">
            <div class="stat-card">
                <h3>Total Revenue</h3>
                <div class="value">PKR ${totalRevenue.toLocaleString()}</div>
            </div>
            <div class="stat-card" style="border-top-color: #10B981;">
                <h3>Total Profit</h3>
                <div class="value">PKR ${netProfit.toLocaleString()}</div>
            </div>
            <div class="stat-card" style="border-top-color: #F59E0B;">
                <h3>Total Orders</h3>
                <div class="value">${totalOrders}</div>
            </div>
            <div class="stat-card" style="border-top-color: #EF4444;">
                <h3>Low Stock Items</h3>
                <div class="value">${lowStockCount}</div>
            </div>
        </section>

        <div style="margin-top: 2rem;">
            <div class="table-container" style="padding: 2rem; border: 1px dashed #334155; text-align: center;">
                <p style="color: #94a3b8; font-size: 1.1rem;">
                    Check <strong>Hisab Kitab</strong> for detailed financial charts and monthly reports.
                </p>
                <button class="btn-primary" style="margin-top: 1rem;" onclick="switchView('hisab-kitab')">Go to Hisab Kitab</button>
            </div>
        </div>
    `;
}

function loadProducts() {
    const main = document.getElementById('main-content');

    // Check localStorage first
    let products = JSON.parse(localStorage.getItem('rf_products'));

    // Sync with global products if empty (First Load)
    if (!products || products.length === 0) {
        if (typeof window.products !== 'undefined') {
            products = window.products;
            localStorage.setItem('rf_products', JSON.stringify(products));
        }
    }

    // Filter Logic
    const searchTerm = document.getElementById('product-search') ? document.getElementById('product-search').value.toLowerCase() : '';

    if (searchTerm) {
        products = products.filter(p => p.name.toLowerCase().includes(searchTerm) || p.id.toString().includes(searchTerm));
    }

    let rows = products.map(p => `
        <tr>
            <td>${p.id}</td>
            <td><strong>${p.name}</strong></td>
            <td>PKR ${p.price.toLocaleString()}</td>
            <td style="color:#64748B;">PKR ${(p.costPrice || 0).toLocaleString()}</td> <!-- Show Cost -->
            <td>${p.stock}</td>
            <td>
                <button class="action-btn btn-edit" onclick="openEditModal(${p.id})"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn btn-delete" onclick="openDeleteModal(${p.id})"><i class="fa-solid fa-trash"></i></button>
            </td>
        </tr>
    `).join('');

    main.innerHTML = `
        <header class="header">
            <h1>Product Management</h1>
            <div class="user-profile"><i class="fa-solid fa-user-circle"></i> Admin</div>
        </header>

        <section class="products-controls" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <div class="search-wrapper" style="position: relative; width: 300px;">
                <i class="fa-solid fa-search" style="position: absolute; left: 15px; top: 50%; transform: translateY(-50%); color: #94a3b8;"></i>
                <input type="text" id="product-search" placeholder="Search products..." value="${searchTerm}" oninput="loadProducts()" style="width: 100%; padding: 0.8rem 1rem 0.8rem 2.5rem; background: #1e293b; border: 1px solid #334155; border-radius: 50px; color: #fff; outline: none;">
            </div>
            <button class="btn-primary" onclick="openAddModal()">+ Add Product</button>
        </section>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Price</th>
                        <th>Cost Price</th>
                        <th>Stock</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${rows.length > 0 ? rows : '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#94a3b8;">No products found</td></tr>'}
                </tbody>
            </table>
        </div>
    `;

    // Re-focus search input if it exists (to maintain focus while typing)
    const searchInput = document.getElementById('product-search');
    if (searchInput) {
        searchInput.focus();
        // Move cursor to end
        const len = searchInput.value.length;
        searchInput.setSelectionRange(len, len);
    }
}

function loadOrders() {
    const main = document.getElementById('main-content');
    const orders = JSON.parse(localStorage.getItem('rf_orders')) || [];

    // Filter Logic
    const pendingOrders = orders.filter(o => o.status === 'Pending');
    const completedOrders = orders.filter(o => o.status === 'Completed');

    main.innerHTML = `
        <header class="header">
            <h1>Order Management</h1>
            <div class="user-profile"><i class="fa-solid fa-user-circle"></i> Admin</div>
        </header>

        <section class="orders-layout" style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
            <!-- Pending Orders Column -->
            <div class="card" style="background: #1e293b; border: 1px solid #334155; padding: 1rem; border-radius: 8px;">
                <h3 style="color: #f59e0b; margin-bottom: 1rem;"><i class="fa-solid fa-clock"></i> Pending Orders (${pendingOrders.length})</h3>
                <div class="order-list">
                    ${pendingOrders.length > 0 ? pendingOrders.map(order => `
                        <div class="order-card" style="background: rgba(255,255,255,0.05); padding: 1rem; margin-bottom: 1rem; border-radius: 6px; border-left: 4px solid #f59e0b;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                                <strong>#${order.id}</strong>
                                <span style="font-size:0.8rem; color:#ccc;">${order.date}</span>
                            </div>
                            <div style="margin-bottom:0.8rem; font-size:0.9rem; line-height:1.6;">
                                <strong style="color:#6366f1;">Customer:</strong> ${order.customer ? order.customer.name : 'Guest'}<br>
                                <strong style="color:#10b981;">Total:</strong> PKR ${order.total.toLocaleString()}
                            </div>
                            <details style="margin-bottom:0.8rem; font-size:0.85rem; color:#94a3b8;">
                                <summary style="cursor:pointer; font-weight:600; color:#fff; margin-bottom:0.5rem;">📋 Customer Details</summary>
                                <div style="margin-top:0.5rem; padding:0.5rem; background:rgba(0,0,0,0.2); border-radius:4px; line-height:1.8;">
                                    ${order.customer ? `
                                        <div><strong>📧 Email:</strong> ${order.customer.email}</div>
                                        <div><strong>📱 Phone:</strong> ${order.customer.phone}</div>
                                        <div><strong>📍 Address:</strong> ${order.customer.address}, ${order.customer.city}</div>
                                    ` : 'No customer details available'}
                                </div>
                            </details>
                            <details style="margin-bottom:0.8rem; font-size:0.85rem; color:#94a3b8;">
                                <summary style="cursor:pointer; font-weight:600; color:#fff;">🛍️ View Items</summary>
                                <ul style="margin-top:0.5rem; padding-left:1rem;">
                                    ${order.items.map(i => `<li>${i.name} (x${i.qty}) - PKR ${(i.price * i.qty).toLocaleString()}</li>`).join('')}
                                </ul>
                            </details>
                            <button class="btn-primary" style="width:100%; background: #10b981;" onclick="updateOrderStatus(${order.id}, 'Completed')">
                                <i class="fa-solid fa-check"></i> Mark Complete & Deduct Stock
                            </button>
                        </div>
                    `).join('') : '<p style="color:#64748b;">No pending orders.</p>'}
                </div>
            </div>

            <!-- Completed Orders Column -->
            <div class="card" style="background: #1e293b; border: 1px solid #334155; padding: 1rem; border-radius: 8px;">
                <h3 style="color: #10b981; margin-bottom: 1rem;"><i class="fa-solid fa-check-circle"></i> Completed History</h3>
                <div class="order-list">
                    ${completedOrders.length > 0 ? completedOrders.map(order => `
                        <div class="order-card" style="background: rgba(255,255,255,0.02); padding: 1rem; margin-bottom: 1rem; border-radius: 6px; border-left: 4px solid #10b981; opacity: 0.8;">
                             <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem;">
                                <strong>#${order.id}</strong>
                                <span class="badge completed">Completed</span>
                            </div>
                             <div style="font-size:0.9rem; margin-bottom:0.8rem;">
                                ${order.customer ? order.customer.name : 'Guest'} - PKR ${order.total.toLocaleString()}
                            </div>
                            <button class="btn-primary" style="width:100%; background: #ef4444; font-size:0.85rem;" onclick="deleteOrder(${order.id})">
                                <i class="fa-solid fa-trash"></i> Delete Order
                            </button>
                        </div>
                    `).join('') : '<p style="color:#64748b;">No completed orders yet.</p>'}
                </div>
            </div>
        </section>
    `;
}

function updateOrderStatus(orderId, newStatus) {
    let orders = JSON.parse(localStorage.getItem('rf_orders')) || [];
    let products = JSON.parse(localStorage.getItem('rf_products')) || [];

    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    const order = orders[orderIndex];

    // If marking as Completed, deduct stock
    if (newStatus === 'Completed' && order.status !== 'Completed') {
        let stockIssue = false;

        // Check and Deduct Stock
        order.items.forEach(item => {
            const product = products.find(p => p.id === item.id);
            if (product) {
                if (product.stock >= item.qty) {
                    product.stock -= item.qty;
                } else {
                    stockIssue = true;
                    alert(`Warning: Not enough stock for ${item.name}! Stock might go negative.`);
                    product.stock -= item.qty; // Allow negative for logic consistency or stop? Let's allow but warn.
                }
            }
        });

        // Save updated products stock
        localStorage.setItem('rf_products', JSON.stringify(products));
    }

    // Update Order Status
    orders[orderIndex].status = newStatus;
    localStorage.setItem('rf_orders', JSON.stringify(orders));

    // Refresh View
    loadOrders();
    // Also refresh product list if checking stock there
}

/* --- MODAL FUNCTIONS --- */

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('open');
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('open');
}

/* Add / Edit Logic */
function openAddModal() {
    document.getElementById('modal-title').textContent = "Add New Product";
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = ""; // Clear ID for new add
    document.getElementById('product-brand').value = ""; // Clear Brand
    document.getElementById('product-image').value = ""; // Clear Image
    document.getElementById('product-category').value = "Unisex"; // Default
    openModal('product-modal');
}

function openEditModal(id) {
    const products = JSON.parse(localStorage.getItem('rf_products')) || [];
    const product = products.find(p => p.id === id);

    if (product) {
        document.getElementById('modal-title').textContent = "Edit Product";
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-brand').value = product.brand || ""; // Load Brand
        document.getElementById('product-category').value = product.category || "Unisex"; // Load Category
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-cost').value = product.costPrice || 0;
        document.getElementById('product-image').value = product.image || "";
        document.getElementById('product-stock').value = product.stock;
        openModal('product-modal');
    }
}

function handleProductSubmit(e) {
    e.preventDefault();

    // Get Values
    const id = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value;
    const brand = document.getElementById('product-brand').value.trim(); // Get Brand
    const category = document.getElementById('product-category').value; // Get Category
    const price = parseFloat(document.getElementById('product-price').value);
    const costPrice = parseFloat(document.getElementById('product-cost').value) || 0;
    const image = document.getElementById('product-image').value.trim() || "";
    const stock = parseInt(document.getElementById('product-stock').value);

    let products = JSON.parse(localStorage.getItem('rf_products')) || [];

    if (id) {
        // EDIT MODE
        const index = products.findIndex(p => p.id == id);
        if (index > -1) {
            products[index] = { id: parseInt(id), name, brand, category, price, costPrice, image, stock };
        }
    } else {
        // ADD MODE
        const newId = Date.now();
        products.push({ id: newId, name, brand, category, price, costPrice, image, stock });
    }

    localStorage.setItem('rf_products', JSON.stringify(products));

    closeModal('product-modal');
    loadProducts(); // Refresh Table

    // Optional: Show Success Notification (Simulated)
    // alert("Product Saved Successfully!"); // User asked to remove alerts, but a toast would be better. For now just refresh.
}

/* Delete Logic */
function openDeleteModal(id) {
    document.getElementById('delete-product-id').value = id;
    openModal('delete-modal');
}

function confirmDelete() {
    const id = document.getElementById('delete-product-id').value;
    let products = JSON.parse(localStorage.getItem('rf_products')) || [];

    products = products.filter(p => p.id != id);
    localStorage.setItem('rf_products', JSON.stringify(products));

    closeModal('delete-modal');
    loadProducts(); // Refresh Table
}

function loadCustomers() {
    const main = document.getElementById('main-content');

    // Get Orders to derive customers
    const orders = JSON.parse(localStorage.getItem('rf_orders')) || [];

    // Group orders by Customer (assuming order object has customerName/email)
    // If orders don't have customer data yet, this will be empty (which is desired behavior)
    const customersMap = new Map();

    orders.forEach(order => {
        if (order.customer && order.customer.email) {
            const key = order.customer.email;
            if (!customersMap.has(key)) {
                customersMap.set(key, {
                    id: customersMap.size + 1,
                    name: order.customer.name,
                    email: order.customer.email,
                    totalOrders: 0,
                    totalSpent: 0,
                    lastActive: order.date
                });
            }
            const cust = customersMap.get(key);
            cust.totalOrders++;
            cust.totalSpent += order.total;
            // Update last active if this order is newer
            if (new Date(order.date) > new Date(cust.lastActive)) {
                cust.lastActive = order.date;
            }
        }
    });

    const customers = Array.from(customersMap.values());

    main.innerHTML = `
        <header class="header">
            <h1>Customer Database</h1>
            <div class="user-profile"><i class="fa-solid fa-user-circle"></i> Admin</div>
        </header>

        <section class="card-grid">
            <div class="stat-card">
                <h3>Total Customers</h3>
                <div class="value">${customers.length}</div>
            </div>
            <!-- Only show New Customers if there are any -->
            <div class="stat-card" style="border-top-color: #ec4899;">
                <h3>Active</h3>
                <div class="value">${customers.filter(c => c.totalOrders > 0).length}</div>
            </div>
        </section>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Orders</th>
                        <th>Total Spent</th>
                        <th>Last Active</th>
                    </tr>
                </thead>
                <tbody>
                    ${customers.length > 0 ? customers.map(c => `
                        <tr>
                            <td>#${c.id}</td>
                            <td><strong>${c.name}</strong></td>
                            <td>${c.email}</td>
                            <td>${c.totalOrders}</td>
                            <td>PKR ${c.totalSpent.toLocaleString()}</td>
                            <td>${c.lastActive}</td>
                        </tr>
                    `).join('') : '<tr><td colspan="6" style="text-align:center; padding:2rem; color:#94a3b8;">No customer data available yet.</td></tr>'}
                </tbody>
            </table>
        </div>
    `;
}

function loadAIInsights() {
    const main = document.getElementById('main-content');
    const products = JSON.parse(localStorage.getItem('rf_products')) || [];
    const orders = JSON.parse(localStorage.getItem('rf_orders')) || [];

    // --- Dynamic Analysis ---

    // 1. Inventory
    const lowStock = products.filter(p => p.stock < 10).map(p => p.name);
    const mostExpensive = products.length > 0 ? products.sort((a, b) => b.price - a.price)[0] : null;
    const avgPrice = products.length > 0 ? products.reduce((acc, p) => acc + p.price, 0) / products.length : 0;

    // 2. Sales / prediction
    let totalRevenue = 0;
    let categoryCount = {};

    orders.forEach(o => {
        totalRevenue += o.total;
        // Count categories if items exist (Assuming items have category linked via product id, requiring lookup)
        o.items.forEach(item => {
            const prod = products.find(p => p.id === item.id);
            if (prod && prod.category) {
                categoryCount[prod.category] = (categoryCount[prod.category] || 0) + item.qty;
            }
        });
    });

    // Forecast logic (Simple Average based on orders existence)
    const expectedSales = orders.length > 0 ? Math.round(totalRevenue * 1.2) : 0; // Dumb projection: 20% growth

    // Find Top Category
    let bestCategory = "N/A";
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoryCount)) {
        if (count > maxCount) {
            maxCount = count;
            bestCategory = cat;
        }
    }

    main.innerHTML = `
        <header class="header">
            <h1>AI Insights & Business Intelligence</h1>
            <div class="user-profile"><i class="fa-solid fa-user-circle"></i> Admin</div>
        </header>

        <div class="card-grid">
             <div class="stat-card" style="background: linear-gradient(135deg, #1e293b, #0f172a); border-color: #6366f1;">
                <h3 style="color: #6366f1;">AI Prediction</h3>
                <div class="value" style="font-size: 1.2rem; color: #fff;">${hasData ? 'Expected Sales (Next Month)' : 'Status'}</div>
                <p style="font-size: 2rem; font-weight: bold; color: #6366f1; margin-top: 5px;">${hasData ? 'PKR ' + expectedSales.toLocaleString() : 'Waiting for Data...'}</p>
                <small style="color: #94a3b8;">${hasData ? 'Based on recent trends' : 'System is learning'}</small>
            </div>
             <div class="stat-card" style="background: linear-gradient(135deg, #1e293b, #0f172a); border-color: #10b981;">
                <h3 style="color: #10b981;">Top Performer</h3>
                <div class="value" style="font-size: 1.2rem; color: #fff;">Best Selling Category</div>
                <p style="font-size: 2rem; font-weight: bold; color: #10b981; margin-top: 5px;">${bestCategory}</p>
                <small style="color: #94a3b8;">${hasData ? 'Highest conversion rate' : 'No sales recorded yet'}</small>
            </div>
        </div>

        <!-- AI Assistant Chatbot -->
        <div style="margin-top: 2rem; display: grid; grid-template-columns: 1fr; gap: 2rem;">
            <div class="table-container" style="padding: 0; display: flex; flex-direction: column; height: 500px; background: #0f172a; border: 1px solid #334155;">
                <div style="padding: 1rem 1.5rem; background: #1e293b; border-bottom: 1px solid #334155; display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-robot" style="color: #6366f1; font-size: 1.5rem;"></i>
                    <h2 style="font-size: 1.2rem; color: #fff; margin: 0;">Royal AI Assistant (Roman Urdu)</h2>
                </div>
                
                <div id="ai-chat-messages" style="flex-grow: 1; overflow-y: auto; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
                    <div style="align-self: flex-start; background: #1e293b; padding: 0.8rem 1rem; border-radius: 12px 12px 12px 0; color: #cbd5e1; max-width: 80%; line-height: 1.5;">
                        Asalam-o-Alaikum Admin! Main aapka AI assistant hoon. Aap mujhse business ke bare mein kuch bhi pooch sakte hain Roman Urdu mein. <br><br>
                        Example: "Iss mahine kitni sale hui?", "Konsa product zyada bika?", ya "Perfume A ka stock kitna hai?"
                    </div>
                </div>

                <div style="padding: 1rem; border-top: 1px solid #334155; display: flex; gap: 10px; background: #1e293b;">
                    <input type="text" id="ai-chat-input" placeholder="Yahan apna sawal likhein..." 
                           style="flex-grow: 1; padding: 0.8rem 1.2rem; background: #0f172a; border: 1px solid #334155; border-radius: 25px; color: #fff; outline: none;"
                           onkeypress="if(event.key === 'Enter') sendAdminAIMessage()">
                    <button onclick="sendAdminAIMessage()" style="background: #6366f1; border: none; width: 45px; height: 45px; border-radius: 50%; color: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function sendAdminAIMessage() {
    const input = document.getElementById('ai-chat-input');
    const container = document.getElementById('ai-chat-messages');
    const message = input.value.trim();
    if (!message) return;

    // User message
    const userMsg = document.createElement('div');
    userMsg.style.cssText = "align-self: flex-end; background: #6366f1; padding: 0.8rem 1rem; border-radius: 12px 12px 0 12px; color: #fff; max-width: 80%; line-height: 1.5;";
    userMsg.textContent = message;
    container.appendChild(userMsg);
    input.value = "";
    container.scrollTop = container.scrollHeight;

    // Thinking state
    const botMsg = document.createElement('div');
    botMsg.style.cssText = "align-self: flex-start; background: #1e293b; padding: 0.8rem 1rem; border-radius: 12px 12px 12px 0; color: #cbd5e1; max-width: 80%; line-height: 1.5;";
    botMsg.innerHTML = '<i class="fa-solid fa-ellipsis fa-fade"></i> AI soch raha hai...';
    container.appendChild(botMsg);

    setTimeout(() => {
        const response = processAdminAIQuery(message);
        botMsg.innerHTML = response;
        container.scrollTop = container.scrollHeight;
    }, 1000);
}

function processAdminAIQuery(query) {
    const q = query.toLowerCase();
    const products = JSON.parse(localStorage.getItem('rf_products')) || [];
    const orders = JSON.parse(localStorage.getItem('rf_orders')) || [];

    // --- Sale Logic ---
    if (q.includes('sale') || q.includes('kitni kamai') || q.includes('paisa')) {
        let total = 0;
        let thisMonthTotal = 0;
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        orders.forEach(o => {
            if (o.status !== 'Cancelled') {
                total += o.total;
                const d = new Date(o.date);
                if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) {
                    thisMonthTotal += o.total;
                }
            }
        });

        if (q.includes('mahine') || q.includes('month') || q.includes('abhi')) {
            return `Iss mahine abhi tak total **PKR ${thisMonthTotal.toLocaleString()}** ki sale hui hai. Allah barkat de!`;
        }
        return `Abhi tak website par total **PKR ${total.toLocaleString()}** ki sale hui hai.`;
    }

    // --- Stock / Bacha Logic ---
    if (q.includes('bacha') || q.includes('stock') || q.includes('item') || q.includes('quantity')) {
        // Try to find product name in query
        const found = products.find(p => q.includes(p.name.toLowerCase()));
        if (found) {
            return `**${found.name}** ka stock filter-haal **${found.stock}** units bacha hua hai.`;
        }

        const lowStock = products.filter(p => p.stock < 5);
        if (lowStock.length > 0) {
            return `Aapke pas **${lowStock.length}** products ka stock khatam hone wala hai (less than 5). In par nazar rakhein.`;
        }
        return "Sab products ka stock filhal sahi lag raha hai. Aap kisi specific product ka naam le kar bhi pooch sakte hain.";
    }

    // --- Best Selling Logic ---
    if (q.includes('zyada') || q.includes('best') || q.includes('bikka') || q.includes('top')) {
        const productSales = {};
        orders.forEach(o => {
            if (o.status !== 'Cancelled') {
                o.items.forEach(i => {
                    productSales[i.name] = (productSales[i.name] || 0) + i.qty;
                });
            }
        });

        const sorted = Object.entries(productSales).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
            const best = sorted[0];
            return `Sab se zyada bikanay wala product **${best[0]}** hai, jis ke **${best[1]}** units sale hue hain.`;
        }
        return "Abhi tak koi product sale nahi hua, is liye comparison mushkil hai.";
    }

    // --- Orders Count ---
    if (q.includes('order') || q.includes('customer')) {
        const pending = orders.filter(o => o.status === 'Pending').length;
        return `Pass abhi total **${orders.length}** orders hain, jin mein se **${pending}** abhi pending hain. Inhein jald jald check karein!`;
    }

    return "Maaf kijiye, mujhe samajh nahi aaya. Aap mujhse sale, stock, ya best products ke bare mein Roman Urdu mein pooch sakte hain. <br><br> (Tip: Product ka sahi naam likhein)";
}

function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;

    let orders = JSON.parse(localStorage.getItem('rf_orders')) || [];
    orders = orders.filter(o => o.id !== orderId);
    localStorage.setItem('rf_orders', JSON.stringify(orders));
    loadOrders();
}

function loadHisabKitab() {
    const main = document.getElementById('main-content');
    const orders = JSON.parse(localStorage.getItem('rf_orders')) || [];
    const products = JSON.parse(localStorage.getItem('rf_products')) || [];

    // Aggregation Logic
    const monthlyData = {};
    const yearlyData = {};
    const productSales = {};

    orders.forEach(order => {
        if (order.status === 'Cancelled') return;

        const date = new Date(order.date);
        const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        const year = date.getFullYear().toString();

        // Calculate Cost
        let orderCost = 0;
        order.items.forEach(item => {
            const product = products.find(p => p.id === item.id);
            const cost = product ? (product.costPrice || (product.price * 0.6)) : 0;
            orderCost += (cost * item.qty);

            // Track product demand
            productSales[item.name] = (productSales[item.name] || 0) + item.qty;
        });

        const profit = order.total - orderCost;

        // Monthly aggregation
        if (!monthlyData[monthYear]) {
            monthlyData[monthYear] = { revenue: 0, profit: 0, cost: 0 };
        }
        monthlyData[monthYear].revenue += order.total;
        monthlyData[monthYear].profit += profit;
        monthlyData[monthYear].cost += orderCost;

        // Yearly aggregation
        if (!yearlyData[year]) {
            yearlyData[year] = { revenue: 0, profit: 0, cost: 0 };
        }
        yearlyData[year].revenue += order.total;
        yearlyData[year].profit += profit;
        yearlyData[year].cost += orderCost;
    });

    // Prepare chart data
    const monthLabels = Object.keys(monthlyData);
    const monthRevenue = monthLabels.map(l => monthlyData[l].revenue);
    const monthProfit = monthLabels.map(l => monthlyData[l].profit);

    const yearLabels = Object.keys(yearlyData);
    const yearProfit = yearLabels.map(l => yearlyData[l].profit);

    // Top Products
    const topProducts = Object.entries(productSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    main.innerHTML = `
        <header class="header">
            <h1>Hisab Kitab (Financial Reports)</h1>
            <div class="user-profile"><i class="fa-solid fa-user-circle"></i> Admin</div>
        </header>

        <section class="card-grid">
            <div class="stat-card">
                <h3>Total Revenue</h3>
                <div class="value">PKR ${Object.values(yearlyData).reduce((a, b) => a + b.revenue, 0).toLocaleString()}</div>
            </div>
            <div class="stat-card" style="border-top-color: #10B981;">
                <h3>Total Lifetime Profit</h3>
                <div class="value">PKR ${Object.values(yearlyData).reduce((a, b) => a + b.profit, 0).toLocaleString()}</div>
            </div>
        </section>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 2rem; margin-top: 2rem;">
            <!-- Monthly Trends Chart -->
            <div class="table-container" style="padding: 1.5rem;">
                <h3 style="margin-bottom: 1rem;"><i class="fa-solid fa-chart-line"></i> Monthly Sales & Profit</h3>
                <canvas id="monthlyChart"></canvas>
            </div>

            <!-- Yearly Comparison Chart -->
            <div class="table-container" style="padding: 1.5rem;">
                <h3 style="margin-bottom: 1rem;"><i class="fa-solid fa-chart-bar"></i> Yearly Profit Comparison</h3>
                <canvas id="yearlyChart"></canvas>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem;">
            <!-- Best Selling Products -->
            <div class="table-container" style="padding: 1.5rem;">
                <h3 style="margin-bottom: 1.5rem;"><i class="fa-solid fa-fire"></i> Best Selling Products</h3>
                <table style="width: 100%;">
                    <thead>
                        <tr style="text-align: left; border-bottom: 1px solid #334155;">
                            <th style="padding: 10px;">Product Name</th>
                            <th style="padding: 10px;">Units Sold</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${topProducts.map(p => `
                            <tr style="border-bottom: 1px solid #1e293b;">
                                <td style="padding: 10px;">${p[0]}</td>
                                <td style="padding: 10px; font-weight: bold; color: #10B981;">${p[1]} Units</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Monthly Breakdown Tables -->
            <div class="table-container" style="padding: 1.5rem;">
                <h3 style="margin-bottom: 1.5rem;"><i class="fa-solid fa-calendar-days"></i> Monthly Summary</h3>
                 <div style="max-height: 300px; overflow-y: auto;">
                    <table style="width: 100%;">
                        <thead>
                            <tr style="text-align: left; border-bottom: 1px solid #334155;">
                                <th style="padding: 10px;">Month</th>
                                <th style="padding: 10px;">Profit</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${monthLabels.reverse().map(l => `
                                <tr style="border-bottom: 1px solid #1e293b;">
                                    <td style="padding: 10px;">${l}</td>
                                    <td style="padding: 10px; font-weight: bold; color: #6366f1;">PKR ${monthlyData[l].profit.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                 </div>
            </div>
        </div>
    `;

    // Initialize Charts
    const ctxTitle = { color: '#fff' };

    new Chart(document.getElementById('monthlyChart'), {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [
                {
                    label: 'Revenue',
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    data: monthRevenue,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Profit',
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    data: monthProfit,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
            }
        }
    });

    new Chart(document.getElementById('yearlyChart'), {
        type: 'bar',
        data: {
            labels: yearLabels,
            datasets: [{
                label: 'Yearly Profit',
                data: yearProfit,
                backgroundColor: '#6366f1',
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { labels: { color: '#fff' } } },
            scales: {
                x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
                y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
            }
        }
    });
}

// --- CONTACT SETTINGS LOGIC ---
function loadContactSettings() {
    const main = document.getElementById('main-content');
    const contactInfo = JSON.parse(localStorage.getItem('rf_contact_info')) || {
        address: '123 Luxury Lane, Fashion District, Paris, France 75001',
        email: 'concierge@royalfragrance.com',
        phone: '+33 1 23 45 67 89'
    };

    main.innerHTML = `
        <header class="header">
            <h1>Contact Settings</h1>
            <div class="user-profile"><i class="fa-solid fa-user-circle"></i> Admin</div>
        </header>

        <section class="card" style="max-width: 600px; margin-top: 2rem; padding: 2rem; background: #1e293b; border: 1px solid #334155;">
            <h3 style="margin-bottom: 2rem; color: #6366f1;"><i class="fa-solid fa-edit"></i> Update Contact Details</h3>
            
            <form id="contact-settings-form" onsubmit="saveContactInfo(event)">
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label style="display:block; margin-bottom:0.5rem; color:#94a3b8;">Store Address</label>
                    <textarea id="contact-address" style="width:100%; padding:0.8rem; background:#0f172a; border:1px solid #334155; border-radius:8px; color:#fff; font-family:inherit;" rows="3" required>${contactInfo.address}</textarea>
                </div>
                
                <div class="form-group" style="margin-bottom: 1.5rem;">
                    <label style="display:block; margin-bottom:0.5rem; color:#94a3b8;">Public Email</label>
                    <input type="email" id="contact-email" value="${contactInfo.email}" style="width:100%; padding:0.8rem; background:#0f172a; border:1px solid #334155; border-radius:8px; color:#fff;" required>
                </div>
                
                <div class="form-group" style="margin-bottom: 2rem;">
                    <label style="display:block; margin-bottom:0.5rem; color:#94a3b8;">Phone Number</label>
                    <input type="text" id="contact-phone" value="${contactInfo.phone}" style="width:100%; padding:0.8rem; background:#0f172a; border:1px solid #334155; border-radius:8px; color:#fff;" required>
                </div>
                
                <button type="submit" class="btn-primary" style="width:100%; padding:1rem; font-weight:700;">
                    <i class="fa-solid fa-save"></i> Save Contact Details
                </button>
            </form>
        </section>
    `;
}

function saveContactInfo(event) {
    event.preventDefault();

    const contactInfo = {
        address: document.getElementById('contact-address').value,
        email: document.getElementById('contact-email').value,
        phone: document.getElementById('contact-phone').value
    };

    localStorage.setItem('rf_contact_info', JSON.stringify(contactInfo));
    alert('Contact information updated successfully! Changes are now live on the website.');
}
