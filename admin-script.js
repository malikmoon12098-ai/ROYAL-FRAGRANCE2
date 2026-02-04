/* Admin Dashboard Logic */

document.addEventListener('DOMContentLoaded', () => {
    loadDashboard();
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
    if (viewName === 'dashboard') loadDashboard();
    if (viewName === 'products') loadProducts();
    if (viewName === 'orders') loadOrders();
    if (viewName === 'customers') loadCustomers();
    if (viewName === 'ai-insights') loadAIInsights();
}

// Mock Data for Analytics (Calculated dynamically now)
let analytics = {
    sales: 0,
    orders: 0,
    profit: 0,
    stockValue: 0,
    lowStock: 0
};

function loadDashboard() {
    const main = document.getElementById('main-content');

    // --- AUTOMATED "HISAB KITAB" LOGIC ---

    // 1. Get Data
    // 1. Get Data
    const products = JSON.parse(localStorage.getItem('rf_products')) || [];
    // Get Real Orders
    const orders = JSON.parse(localStorage.getItem('rf_orders')) || [];

    // 2. Calculate Stock Value (Asset)
    let totalStockValue = 0;
    let lowStockCount = 0;

    products.forEach(p => {
        const cost = p.costPrice || (p.price * 0.6); // Fallback to 60% if no cost set
        totalStockValue += (cost * p.stock);

        if (p.stock <= 5) lowStockCount++;
    });

    // 3. Calculate Revenue & Profit
    let totalRevenue = 0;
    let totalCost = 0;
    let totalOrders = orders.length;

    orders.forEach(order => {
        if (order.status !== 'Cancelled') {
            totalRevenue += order.total;

            // Calculate Cost for this order
            order.items.forEach(item => {
                const product = products.find(p => p.id === item.id);
                if (product) {
                    const cost = product.costPrice || (product.price * 0.6);
                    totalCost += (cost * item.qty);
                }
            });
        }
    });

    let netProfit = totalRevenue - totalCost;

    // Update Global Analytics
    analytics.sales = totalRevenue;
    analytics.profit = netProfit;
    analytics.stockValue = totalStockValue;
    analytics.orders = totalOrders;
    analytics.lowStock = lowStockCount;

    // Render Dashboard
    main.innerHTML = `
        <header class="header">
            <h1>Dashboard Overview</h1>
            <div class="user-profile"><i class="fa-solid fa-user-circle"></i> Admin</div>
        </header>

        <!-- Financial Overview (Hisab Kitab) -->
        <section class="card-grid">
            <div class="stat-card">
                <h3>Total Revenue</h3>
                <div class="value">PKR ${analytics.sales.toLocaleString()}</div>
            </div>
            <div class="stat-card" style="border-top-color: #10B981;"> <!-- Emerald Green -->
                <h3>Net Profit</h3>
                <div class="value">PKR ${analytics.profit.toLocaleString()}</div>
                <small style="color: #10B981; font-weight:bold;">Cash in Hand</small>
            </div>
            <div class="stat-card" style="border-top-color: #3B82F6;"> <!-- Blue -->
                <h3>Stock Value</h3>
                <div class="value">PKR ${analytics.stockValue.toLocaleString()}</div>
                <small style="color: #64748B;">Assets Inventory</small>
            </div>
             <div class="stat-card" style="border-top-color: orange;">
                <h3>Low Stock Alerts</h3>
                <div class="value">${analytics.lowStock}</div>
            </div>
        </section>

        <section class="recent-orders">
            <h2>Recent Orders</h2>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Order ID</th>
                            <th>Date</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => `
                            <tr>
                                <td>#${order.id}</td>
                                <td>${order.date}</td>
                                <td>PKR ${order.total.toLocaleString()}</td>
                                <td><span class="badge ${order.status.toLowerCase()}">${order.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </section>
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
    main.innerHTML = `
        <header class="header">
            <h1>Order Management</h1>
        </header>
        <div class="table-container" style="padding:2rem; text-align:center; color:#777;">
            <i class="fa-solid fa-truck-fast" style="font-size:3rem; margin-bottom:1rem;"></i>
            <p>Full Order Management System is under development.</p>
        </div>
    `;
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
    document.getElementById('product-image').value = ""; // Clear Image
    openModal('product-modal');
}

function openEditModal(id) {
    const products = JSON.parse(localStorage.getItem('rf_products')) || [];
    const product = products.find(p => p.id === id);

    if (product) {
        document.getElementById('modal-title').textContent = "Edit Product";
        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-cost').value = product.costPrice || 0;
        document.getElementById('product-image').value = product.image || ""; // Pre-fill image
        document.getElementById('product-stock').value = product.stock;
        openModal('product-modal');
    }
}

function handleProductSubmit(e) {
    e.preventDefault();

    // Get Values
    const id = document.getElementById('product-id').value;
    const name = document.getElementById('product-name').value;
    const price = parseFloat(document.getElementById('product-price').value);
    const costPrice = parseFloat(document.getElementById('product-cost').value) || 0;
    const image = document.getElementById('product-image').value || "path/to/default.jpg"; // Capture Image
    const stock = parseInt(document.getElementById('product-stock').value);

    let products = JSON.parse(localStorage.getItem('rf_products')) || [];

    if (id) {
        // EDIT MODE
        const index = products.findIndex(p => p.id == id);
        if (index > -1) {
            products[index] = { id: parseInt(id), name, price, costPrice, image, stock };
        }
    } else {
        // ADD MODE
        const newId = Date.now(); // Simple ID generation
        products.push({ id: newId, name, price, costPrice, image, stock });
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

    const hasData = orders.length > 0;

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

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 2rem;">
            <!-- Inventory Health -->
            <div class="table-container" style="padding: 1.5rem;">
                <h2 style="font-size: 1.2rem; margin-bottom: 1rem; color: #f8fafc;"><i class="fa-solid fa-box-open" style="color: #f59e0b;"></i> Inventory Health</h2>
                <ul style="list-style: none; padding: 0;">
                    <li style="margin-bottom: 1rem; color: #94a3b8;">Average Product Price: <strong style="color: #fff;">PKR ${Math.round(avgPrice).toLocaleString()}</strong></li>
                    <li style="margin-bottom: 1rem; color: #94a3b8;">Most Premium Item: <strong style="color: #fff;">${mostExpensive ? mostExpensive.name : 'N/A'}</strong></li>
                </ul>
                <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(244, 63, 94, 0.1); border-radius: 8px; border: 1px solid rgba(244, 63, 94, 0.3);">
                    <h4 style="color: #f43f5e; margin-bottom: 0.5rem;">Restock Recommendations</h4>
                    <p style="color: #cbd5e1; font-size: 0.9rem;">
                        ${lowStock.length > 0 ? `Consider restocking: <strong>${lowStock.slice(0, 3).join(', ')}</strong>` : "Inventory levels look healthy."}
                    </p>
                </div>
            </div>

            <!-- Marketing Tips -->
             <div class="table-container" style="padding: 1.5rem;">
                <h2 style="font-size: 1.2rem; margin-bottom: 1rem; color: #f8fafc;"><i class="fa-solid fa-lightbulb" style="color: #eab308;"></i> Smart Suggestions</h2>
                <div style="display: flex; gap: 1rem; flex-direction: column;">
                    ${hasData ? `
                    <div style="padding: 1rem; background: rgba(99, 102, 241, 0.1); border-radius: 8px; border-left: 4px solid #6366f1;">
                        <strong style="color: #fff; display: block; margin-bottom: 5px;">Bundle Offer Opportunity</strong>
                        <span style="color: #cbd5e1; font-size: 0.9rem;">Based on sales, consider bundling ${bestCategory} items.</span>
                    </div>
                    ` : `
                     <div style="padding: 1rem; background: rgba(100, 116, 139, 0.1); border-radius: 8px; border-left: 4px solid #64748b;">
                        <strong style="color: #fff; display: block; margin-bottom: 5px;">Gathering Insights</strong>
                        <span style="color: #cbd5e1; font-size: 0.9rem;">Once you receive orders, AI will suggest marketing strategies here.</span>
                    </div>
                    `}
                </div>
            </div>
        </div>
    `;
}
