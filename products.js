// 1. Initial Data (Defaults)
const defaultProducts = [
    {
        id: 1,
        name: "Emerald Oud",
        price: 12500,
        costPrice: 8000,
        category: "Unisex",
        stock: 15,
        image: "path/to/img1.jpg",
        tags: ["Woody", "Evening", "Bold"],
        description: "A deep, resinous scent with notes of agarwood and rose."
    },
    {
        id: 2,
        name: "Golden Citrus",
        price: 8500,
        costPrice: 5000,
        category: "Women",
        stock: 8,
        image: "path/to/img2.jpg",
        tags: ["Fresh", "Day", "Citrus"],
        description: "Sparkling bergamot meets delicate jasmine."
    },
    {
        id: 3,
        name: "Midnight Musk",
        price: 9500,
        costPrice: 6000,
        category: "Men",
        stock: 20,
        image: "path/to/img3.jpg",
        tags: ["Musk", "Night", "Seductive"],
        description: "Intense musk with a hint of spicy pepper."
    },
    {
        id: 4,
        name: "Royal Rose",
        price: 11000,
        costPrice: 7500,
        category: "Women",
        stock: 45,
        image: "path/to/img4.jpg",
        tags: ["Floral", "Romantic", "Classic"],
        description: "A bouquet of velvety roses and soft vanilla."
    },
    {
        id: 5,
        name: "Oceanic Breeze",
        price: 7500,
        costPrice: 4500,
        category: "Unisex",
        stock: 12,
        image: "path/to/img5.jpg",
        tags: ["Fresh", "Summer", "Casual"],
        description: "Crisp sea salt and sage for a refreshing vibe."
    },
    {
        id: 6,
        name: "Amber Noir",
        price: 13500,
        costPrice: 9000,
        category: "Men",
        stock: 5,
        image: "path/to/img6.jpg",
        tags: ["Warm", "Winter", "Luxury"],
        description: "Rich amber and leather for the modern gentleman."
    }
];

// 2. Load from LocalStorage or Fallback to Defaults logic
let productsEncoded = localStorage.getItem('rf_products');
let products;

if (productsEncoded === null) {
    // Key doesn't exist (First time load), seed defaults
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

    productList.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card fade-in';
        // Navigate on click logic
        const openProduct = () => window.location.href = `product.html?id=${product.id}`;

        card.innerHTML = `
            <div class="product-image" onclick="window.location.href='product.html?id=${product.id}'" style="cursor:pointer;">
                <!-- Placeholder Image Logic -->
                ${product.image && !product.image.includes('path/to') ? `<img src="${product.image}" alt="${product.name}">` : `
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
                <h3 class="product-title" onclick="window.location.href='product.html?id=${product.id}'" style="cursor:pointer;">${product.name}</h3>
                <p class="product-price">PKR ${product.price.toLocaleString()}</p>
            </div>
        `;
        container.appendChild(card);
    });
}
