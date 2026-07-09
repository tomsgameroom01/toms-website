// 1. Import Firebase SDK Modules via CDN
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. Your Web App's Firebase Configuration (Replace with your actual keys)
const firebaseConfig = {
  apiKey: "AIzaSyAUjmoztsphbq5Np81Mwf2fS-b8UxjrjWY",
  authDomain: "tph-website-c3e61.firebaseapp.com",
  projectId: "tph-website-c3e61",
  storageBucket: "tph-website-c3e61.firebasestorage.app",
  messagingSenderId: "503878800624",
  appId: "1:503878800624:web:2f40248759d8e27cc0de35",
};

// Initialize Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Global State Management
let products = [];
let cart = [];

// DOM Bindings
const productsContainer = document.getElementById("products-container");
const cartSidebar = document.getElementById("cart-sidebar");
const cartToggle = document.getElementById("cart-toggle");
const closeCart = document.getElementById("close-cart");
const cartItemsContainer = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const cartTotal = document.getElementById("cart-total");
const filterButtons = document.querySelectorAll(".filter-btn");

// Updated App Initialization Sequence
async function initStore() {
  // 1. Sync cart storage
  if (sessionStorage.getItem("catStoreCart")) {
    cart = JSON.parse(sessionStorage.getItem("catStoreCart"));
    updateCartUI();
  }

  // 2. Fetch inventory collections and WAIT completely until done
  try {
    console.log("Starting Firestore fetch..."); // Debug line
    const querySnapshot = await getDocs(collection(db, "products"));
    products = [];
    querySnapshot.forEach((doc) => {
      products.push({ id: doc.id, ...doc.data() });
    });
    console.log("Successfully loaded products array:", products); // Debug line

    // 3. ONLY run page display logic after the data is fully loaded!
    if (productsContainer) {
      displayProducts("all");
    }

    if (document.getElementById("detail-title")) {
      console.log("On detail page. Attempting to parse URL parameters..."); // Debug line
      loadProductDetailPage();
    }
  } catch (error) {
    console.error("Firestore loading error:", error);
    if (productsContainer) {
      productsContainer.innerHTML =
        '<p style="color:red; font-weight:bold;">Failed to read catalog entries.</p>';
    }
  }

  setupEventListeners();
}

// Render catalog display grid items on shop front
function displayProducts(categoryFilter) {
  if (!productsContainer) return;

  productsContainer.innerHTML = "";
  const filteredProducts =
    categoryFilter === "all"
      ? products
      : products.filter((p) => p.category === categoryFilter);

  filteredProducts.forEach((product) => {
    const productCard = document.createElement("div");
    productCard.className = "product-card";

    // Pull the 'emoji' string value out to serve as thumbnail file source path
    const thumbnailSrc = product.emoji || "";
    const isImgLink =
      typeof thumbnailSrc === "string" &&
      (thumbnailSrc.startsWith("http") ||
        thumbnailSrc.startsWith("images/") ||
        thumbnailSrc.startsWith("asset/"));

    const imgContent = isImgLink
      ? `<img src="${thumbnailSrc}" alt="${product.name}" style="width:100%; height:100%; object-fit:cover;">`
      : thumbnailSrc;

    productCard.innerHTML = `
            <div style="cursor:pointer;" onclick="goToDetails('${product.id}')">
                <div class="product-img-placeholder">${imgContent}</div>
                <div class="product-info" style="padding-bottom: 0;">
                    <h4 class="product-title">${product.name}</h4>
                    <div class="product-price">$${Number(product.price).toFixed(2)}</div>
                </div>
            </div>
            <div style="padding: 0 1.5rem 1.5rem 1.5rem;">
                <button class="add-btn" onclick="addToCart('${product.id}')">Add to Cart</button>
            </div>
        `;
    productsContainer.appendChild(productCard);
  });
}

// Explicit global assignment for detail page route redirection
window.goToDetails = function (productId) {
  if (!productId) return;
  window.location.href = `product-detail.html?id=${productId}`;
};

// Build Dynamic Product Single View Layout Page
function loadProductDetailPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get("id");
  const product = products.find(
    (p) => String(p.id).trim() === String(productId).trim(),
  );

  if (!product) {
    document.querySelector(".detail-container").innerHTML =
      `<h2>Product not found! <a href="products.html">Go back</a></h2>`;
    return;
  }

  // Bind item text properties
  document.getElementById("detail-title").textContent = product.name;
  document.getElementById("detail-price").textContent =
    `$${Number(product.price).toFixed(2)}`;
  document.getElementById("detail-description").textContent =
    product.description;
  document.getElementById("detail-add-btn").onclick = () =>
    addToCart(product.id);

  const mainDisplay = document.getElementById("main-image-display");
  const thumbScroll = document.getElementById("thumbnail-scroll");

  const getImageMarkup = (src) => {
    return src.startsWith("http") ||
      src.startsWith("images/") ||
      src.startsWith("asset/")
      ? `<img src="${src}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;">`
      : src;
  };

  // Grab the array field named 'image' out from your document snapshot fields
  const galleryImages = product.image || [];

  if (galleryImages.length > 0) {
    mainDisplay.innerHTML = getImageMarkup(galleryImages[0]);
    thumbScroll.innerHTML = "";

    galleryImages.forEach((img, index) => {
      const thumb = document.createElement("div");
      thumb.className = `thumb-box ${index === 0 ? "active-thumb" : ""}`;

      if (
        img.startsWith("http") ||
        img.startsWith("images/") ||
        img.startsWith("asset/")
      ) {
        thumb.innerHTML = `<img src="${img}" style="width:100%; height:100%; object-fit:cover; border-radius:6px;">`;
      } else {
        thumb.textContent = img;
      }

      thumb.onclick = () => {
        mainDisplay.innerHTML = getImageMarkup(img);
        document
          .querySelectorAll(".thumb-box")
          .forEach((b) => b.classList.remove("active-thumb"));
        thumb.classList.add("active-thumb");
      };
      thumbScroll.appendChild(thumb);
    });
  } else {
    mainDisplay.innerHTML = getImageMarkup(product.emoji || "");
  }
}

// Add Item to Shopping Cart
window.addToCart = function (productId) {
  const product = products.find((p) => p.id === productId);
  const existingItem = cart.find((item) => item.id === productId);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  saveCart();
  updateCartUI();
};

// Increment Cart Qty (+)
window.increaseQuantity = function (productId) {
  const item = cart.find((item) => item.id === productId);
  if (item) {
    item.quantity += 1;
    saveCart();
    updateCartUI();
  }
};

// Decrement Cart Qty (-)
window.decreaseQuantity = function (productId) {
  const item = cart.find((item) => item.id === productId);
  if (item) {
    item.quantity -= 1;
    if (item.quantity <= 0) {
      window.removeFromCart(productId);
      return;
    }
    saveCart();
    updateCartUI();
  }
};

// Remove item stack completely from array (🗑️)
window.removeFromCart = function (productId) {
  cart = cart.filter((item) => item.id !== productId);
  saveCart();
  updateCartUI();
};

// Redraw Cart Sidebar Visual States
function updateCartUI() {
  if (!cartItemsContainer || !cartCount || !cartTotal) return;

  cartItemsContainer.innerHTML = "";
  let totalItems = 0;
  let totalPrice = 0;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML =
      '<p style="text-align:center; color:#718096; margin-top:2rem;">Your cart is empty 🐱</p>';
  }

  cart.forEach((item) => {
    totalItems += item.quantity;
    totalPrice += Number(item.price) * item.quantity;

    const cartItem = document.createElement("div");
    cartItem.className = "cart-item";
    cartItem.innerHTML = `
            <div style="flex-grow: 1; padding-right: 10px;">
                <div style="font-weight: 600; font-size: 0.95rem;">${item.name}</div>
                <div style="color: var(--primary-color); font-weight: bold; margin-top: 4px;">$${(Number(item.price) * item.quantity).toFixed(2)}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <button onclick="decreaseQuantity('${item.id}')" style="width:24px; height:24px; cursor:pointer; background:#edf2f7; border:none; border-radius:4px; font-weight:bold;">-</button>
                <span style="font-weight: bold; min-width: 20px; text-align: center;">${item.quantity}</span>
                <button onclick="increaseQuantity('${item.id}')" style="width:24px; height:24px; cursor:pointer; background:#edf2f7; border:none; border-radius:4px; font-weight:bold;">+</button>
                <button onclick="removeFromCart('${item.id}')" style="background:none; border:none; cursor:pointer; font-size:1.1rem; margin-left: 4px;" title="Remove item">🗑️</button>
            </div>
        `;
    cartItemsContainer.appendChild(cartItem);
  });

  cartCount.textContent = totalItems;
  cartTotal.textContent = totalPrice.toFixed(2);
}

function saveCart() {
  sessionStorage.setItem("catStoreCart", JSON.stringify(cart));
}

// Assemble text details and link straight out to WhatsApp API
window.sendWhatsAppOrder = function () {
  if (cart.length === 0) {
    alert("Your cart is empty! Add some cat food before checking out.");
    return;
  }

  const phoneNumber = "6287882833196";
  let message = "🐾 *NEW ORDER FROM PURRFECT BITES* 🐾\n\n";
  message += "Hi! I've got my order ready:\n";
  message += "----------------------------------\n";

  let grandTotal = 0;
  cart.forEach((item, index) => {
    const itemTotal = Number(item.price) * item.quantity;
    grandTotal += itemTotal;
    message += `${index + 1}. *${item.name}*\n`;
    message += `   Qty: ${item.quantity} x $${Number(item.price).toFixed(2)} = *$${itemTotal.toFixed(2)}*\n\n`;
  });

  message += "----------------------------------\n";
  message += `💰 *Grand Total: $${grandTotal.toFixed(2)}*\n\n`;
  message +=
    "Please let me know how to proceed with payment and delivery. Thanks! 🐱";

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodedMessage}`;
  window.open(whatsappUrl, "_blank");
};

function setupEventListeners() {
  if (cartToggle)
    cartToggle.addEventListener("click", () =>
      cartSidebar.classList.add("open"),
    );
  if (closeCart)
    closeCart.addEventListener("click", () =>
      cartSidebar.classList.remove("open"),
    );

  filterButtons.forEach((button) => {
    button.addEventListener("click", (e) => {
      filterButtons.forEach((btn) => btn.classList.remove("active"));
      e.target.classList.add("active");
      displayProducts(e.target.dataset.filter);
    });
  });
}

document.addEventListener("DOMContentLoaded", initStore);
