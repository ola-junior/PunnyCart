import { products, showToast, getUserCart, updateCartItemQuantity, removeFromCart, updateCartCount } from './main.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

const firebaseConfig = {
  apiKey: "AIzaSyDlkoedJh9k940IofE8VKJ9-fT8Gz7WvoI",
  authDomain: "e-commerce-29a73.firebaseapp.com",
  projectId: "e-commerce-29a73",
  storageBucket: "e-commerce-29a73.firebasestorage.app",
  messagingSenderId: "870933397259",
  appId: "1:870933397259:web:7a0d6f50a6a11f92b66c0e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let cartItems = document.getElementById('cartItems');
let emptyCart = document.getElementById('emptyCart');
let subtotalEl = document.getElementById('subtotal');
let taxEl = document.getElementById('tax');
let totalEl = document.getElementById('total');
let checkoutBtn = document.getElementById('checkoutBtn');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');
const backToTop = document.getElementById('backToTop');
const cartContainer = document.querySelector('.max-w-7xl.mx-auto.px-4.sm\\:px-6.lg\\:px-8.py-12');
const pageHeader = document.querySelector('.bg-gradient-to-r.from-indigo-600.to-purple-600');

let cart = [];
let isAuthenticated = false;
let currentUserId = null;

function checkAuthAndProtect() {
  console.log('Checking authentication...');

  if (cartContainer) {
    cartContainer.innerHTML = `
      <div class="flex justify-center items-center py-20">
        <div class="text-center">
          <div class="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">Loading your cart...</p>
        </div>
      </div>
    `;
  }

  onAuthStateChanged(auth, async (user) => {
    console.log('Auth state changed in cart page:', user ? `Logged in as ${user.uid}` : 'Not logged in');

    if (!user) {
      console.log('User not logged in, showing login required');
      showLoginRequired();
      currentUserId = null;
    } else {
      console.log('User logged in, loading cart for:', user.uid);
      isAuthenticated = true;
      currentUserId = user.uid;
      await loadCart();
    }
  });
}

async function loadCart() {
  try {
    console.log('Loading cart from Firebase...');
    cart = await getUserCart();
    console.log('Cart loaded for user', currentUserId, ':', cart);
    restoreCartContent();

  } catch (error) {
    console.error('Error loading cart:', error);
    cart = [];
    restoreCartContent();
  }
}

function showLoginRequired() {
  if (!cartContainer) return;

  if (pageHeader) {
    pageHeader.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center py-12">
        <h1 class="text-3xl md:text-4xl font-bold mb-2">Shopping Cart</h1>
        <p class="text-lg opacity-90">Review and manage your items before checkout</p>
      </div>
    `;
  }

  cartContainer.innerHTML = `
    <div class="flex flex-col items-center justify-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <div class="w-24 h-24 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6">
        <svg class="w-12 h-12 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      
      <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-3">Login Required</h2>
      <p class="text-gray-600 dark:text-gray-400 text-center max-w-md mb-8">
        You need to be logged in to view your shopping cart. Please sign in or create an account to continue.
      </p>
      
      <div class="flex flex-col sm:flex-row gap-4">
        <a href="login.html" 
           class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105">
          Sign In / Sign Up
        </a>
        <a href="shop.html" 
           class="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300">
          Continue Shopping
        </a>
      </div>
      
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-6">
        By signing in, you'll be able to save items to your cart and checkout faster.
      </p>
    </div>
  `;

  if (emptyCart) emptyCart.classList.add('hidden');
}

function restoreCartContent() {
  if (!cartContainer) return;

  console.log('Restoring cart content for user', currentUserId);

  if (pageHeader) {
    pageHeader.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 class="text-3xl md:text-4xl font-bold mb-2">Shopping Cart</h1>
        <p class="text-lg opacity-90">Review and manage your items before checkout</p>
      </div>
    `;
  }

  cartContainer.innerHTML = `
    <div class="flex flex-col lg:flex-row gap-8">
      <!-- Cart Items -->
      <div class="lg:w-2/3">
        <div id="cartItems" class="space-y-4"></div>
        
        <!-- Empty Cart State -->
        <div id="emptyCart" class="hidden text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
          <svg class="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h3 class="text-xl font-semibold mb-2">Your cart is empty</h3>
          <p class="text-gray-600 dark:text-gray-400 mb-6">Looks like you haven't added any items yet.</p>
          <a href="shop.html" class="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 transform hover:scale-105">
            Continue Shopping
          </a>
        </div>
      </div>

      <!-- Order Summary -->
      <div class="lg:w-1/3">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 sticky top-24">
          <h2 class="text-xl font-bold mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">Order Summary</h2>
          
          <div class="space-y-4 mb-6">
            <div class="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span id="subtotal">$0.00</span>
            </div>
            <div class="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Shipping</span>
              <span id="shipping">$5.99</span>
            </div>
            <div class="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Tax (10%)</span>
              <span id="tax">$0.00</span>
            </div>
            <div class="flex justify-between font-bold text-lg pt-4 border-t border-gray-200 dark:border-gray-700">
              <span>Total</span>
              <span id="total">$0.00</span>
            </div>
          </div>

          <a href="checkout.html" id="checkoutBtn" class="block w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg text-center transition-all duration-300 transform hover:scale-105 mb-3">
            Proceed to Checkout
          </a>
          
          <a href="shop.html" class="block w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-3 px-6 rounded-lg text-center transition-all duration-300">
            Continue Shopping
          </a>
        </div>
      </div>
    </div>
  `;

  reassignDOMElements();
  displayCartItems();
  displayRecommendedProducts();
  updateCartCount();
}

function reassignDOMElements() {
  cartItems = document.getElementById('cartItems');
  emptyCart = document.getElementById('emptyCart');
  subtotalEl = document.getElementById('subtotal');
  taxEl = document.getElementById('tax');
  totalEl = document.getElementById('total');
  checkoutBtn = document.getElementById('checkoutBtn');

  console.log('DOM elements reassigned');
}

if (mobileMenuToggle && mobileMenu) {
  mobileMenuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });
}

if (backToTop) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
      backToTop.style.opacity = '1';
      backToTop.style.visibility = 'visible';
    } else {
      backToTop.style.opacity = '0';
      backToTop.style.visibility = 'hidden';
    }
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

window.addEventListener('resize', () => {
  if (window.innerWidth >= 768 && mobileMenu) {
    mobileMenu.classList.add('hidden');
  }
});

async function updateQuantity(productId, newQuantity) {
  console.log('updateQuantity called:', productId, newQuantity);

  if (!isAuthenticated) {
    window.location.href = 'signup.html';
    return;
  }

  const success = await updateCartItemQuantity(productId, newQuantity);

  if (success) {
    const item = cart.find(item => item.id === productId);
    if (item) {
      if (newQuantity <= 0) {
        cart = cart.filter(item => item.id !== productId);
      } else {
        item.quantity = newQuantity;
      }
    }

    displayCartItems();
    updateCartCount();
  }
}

async function removeItem(productId) {
  console.log('removeItem called:', productId);

  if (!isAuthenticated) {
    window.location.href = 'signup.html';
    return;
  }

  const success = await removeFromCart(productId);

  if (success) {
    cart = cart.filter(item => item.id !== productId);
    displayCartItems();
    updateCartCount();
    showToast('Item removed from cart');
  }
}

function calculateTotals() {
  const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
  const tax = subtotal * 0.10;
  const shipping = subtotal > 0 ? 5.99 : 0;
  const total = subtotal + tax + shipping;

  if (subtotalEl) subtotalEl.textContent = `$${subtotal.toFixed(2)}`;
  if (taxEl) taxEl.textContent = `$${tax.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `$${total.toFixed(2)}`;

  return { subtotal, tax, shipping, total };
}

function displayCartItems() {
  if (!cartItems) {
    console.error('cartItems element not found');
    return;
  }

  console.log('Displaying cart items for user', currentUserId, ':', cart);

  if (!cart || cart.length === 0) {
    console.log('Cart is empty');
    cartItems.innerHTML = '';
    if (emptyCart) emptyCart.classList.remove('hidden');
    if (checkoutBtn) {
      checkoutBtn.classList.add('pointer-events-none', 'opacity-50');
    }
    calculateTotals();
    return;
  }

  if (emptyCart) emptyCart.classList.add('hidden');
  if (checkoutBtn) {
    checkoutBtn.classList.remove('pointer-events-none', 'opacity-50');
  }

  cartItems.innerHTML = cart.map(item => {
    const displayTitle = item.title || 'Product';
    const displayBrand = item.brand || 'PrimeLane';
    const displayImage = item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&auto=format';
    const displayPrice = item.price || 0;
    const quantity = item.quantity || 1;

    return `
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 flex flex-col sm:flex-row gap-4">
      <img src="${displayImage}" alt="${displayTitle}" class="w-24 h-24 object-cover rounded-lg">
      
      <div class="flex-1">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 class="font-semibold text-gray-900 dark:text-white mb-1">${displayTitle}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400">${displayBrand}</p>
          </div>
          <p class="text-lg font-bold text-indigo-600 dark:text-indigo-400">$${(displayPrice * quantity).toFixed(2)}</p>
        </div>

        <div class="flex items-center justify-between mt-4">
          <div class="flex items-center gap-3">
            <button onclick="updateQuantity(${item.id}, ${quantity - 1})" 
              class="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              -
            </button>
            <span class="w-8 text-center font-semibold">${quantity}</span>
            <button onclick="updateQuantity(${item.id}, ${quantity + 1})" 
              class="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
              +
            </button>
          </div>
          
          <button onclick="removeItem(${item.id})" 
            class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  `}).join('');

  calculateTotals();
}

function displayRecommendedProducts() {
  const recommendedContainer = document.getElementById('recommendedProducts');
  if (!recommendedContainer) return;

  const cartIds = cart.map(item => item.id);
  const availableProducts = products.filter(p => !cartIds.includes(p.id));
  const shuffled = availableProducts.sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 4);

  if (selected.length === 0) {
    recommendedContainer.innerHTML = '<p class="text-center text-gray-500 col-span-4">No recommendations available</p>';
    return;
  }

  recommendedContainer.innerHTML = selected.map(product => `
    <div onclick='window.location.href="shop.html"' 
         class="group bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer">
      <div class="relative overflow-hidden h-48">
        <img src="${product.image}" alt="${product.title}"
             class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
             loading="lazy">
      </div>
      <div class="p-4">
        <h3 class="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">${product.title}</h3>
        <p class="text-lg font-bold text-indigo-600 dark:text-indigo-400">$${product.price.toFixed(2)}</p>
      </div>
    </div>
  `).join('');
}

window.updateQuantity = updateQuantity;
window.removeItem = removeItem;

document.addEventListener('DOMContentLoaded', () => {
  console.log('Cart page initialized');
  checkAuthAndProtect();
});