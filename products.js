// 1. Initial Data (No defaults - Admin will add products)
const defaultProducts = [];

// 2. Load from LocalStorage or Fallback to Empty Array
let productsEncoded = localStorage.getItem('rf_products');
let products;

if (productsEncoded === null) {
    // Key doesn't exist (First time load), start with empty array
    products = defaultProducts;
    localStorage.setItem('rf_products', JSON.stringify(products));
} else {
    // Key respects user changes (even if empty)
    products = JSON.parse(productsEncoded);
}

/* Render Function */
function renderProducts(containerId, productList) {
    const container = document.getElementById(containerId);
    if (!container) return; // Exit if container not found on this page

    container.innerHTML = ""; // Clear loader/content

    if (productList.length === 0) {
        container.innerHTML = '<p style="text-align:center; color:#94a3b8; padding:3rem;">No products found.</p>';
        return;
    }

    productList.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card fade-in';
        // Navigate on click logic
        const openProduct = () => window.location.href = `product.html?id=${product.id}`;

        card.innerHTML = `
            <div class="product-image" onclick="window.location.href='product.html?id=${product.id}'" style="cursor:pointer;">
                <!-- Placeholder Image Logic -->
                ${product.image && product.image.trim() !== '' && !product.image.includes('path/to') ? `<img src="${product.image}" alt="${product.name}" style="width:100%; height:100%; object-fit:cover;">` : `
                <div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:#f9f9f9; color:#aaa;">
                   <i class="fa-solid fa-bottle-droplet" style="font-size:3rem; opacity:0.3;"></i>
                </div>`}
                <div class="product-actions">
                    <button class="action-btn" onclick="event.stopPropagation(); window.location.href='product.html?id=${product.id}'">View Details</button>
                    <button class="action-btn" onclick="event.stopPropagation(); addToCart(${product.id})">Add to Cart</button>
                </div>
            </div>
            <div class="product-info">
                <span class="product-category">${product.category}</span>
                ${product.brand ? `<p style="font-size: 0.85rem; color: #6366f1; font-weight: 600; margin: 0.2rem 0;">${product.brand}</p>` : ''}
                <h3 class="product-title" onclick="window.location.href='product.html?id=${product.id}'" style="cursor:pointer;">${product.name}</h3>
                <p class="product-price">PKR ${product.price.toLocaleString()}</p>
            </div>
        `;
        container.appendChild(card);
    });
}
