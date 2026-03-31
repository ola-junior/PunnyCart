import { updateCartCount } from './main.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const db = getFirestore(app);

const shippingItems = document.getElementById('shippingItems');
const shippingSubtotal = document.getElementById('shippingSubtotal');
const shippingTax = document.getElementById('shippingTax');
const shippingTotal = document.getElementById('shippingTotal');
const shippingAddressDisplay = document.getElementById('shippingAddressDisplay');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');
const backToTop = document.getElementById('backToTop');
const shippingForm = document.getElementById('shippingForm');

let cart = [];
let checkoutData = null;
let currentUser = null;
let dataLoaded = false;

if (mobileMenuToggle && mobileMenu) {
  mobileMenuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });
}

window.addEventListener('resize', () => {
  if (window.innerWidth >= 768 && mobileMenu) {
    mobileMenu.classList.add('hidden');
  }
});

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

function loadCheckoutData() {
  try {
    let savedData = sessionStorage.getItem('checkoutData');
    if (!savedData) {
      savedData = localStorage.getItem('checkoutData_backup');
    }
    
    if (savedData) {
      checkoutData = JSON.parse(savedData);
      cart = checkoutData.items || [];
      displayShippingAddress();
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error loading checkout data:', error);
    return false;
  }
}

function displayShippingAddress() {
  if (!shippingAddressDisplay || !checkoutData) return;
  
  const address = checkoutData.shippingAddress;
  const fullName = checkoutData.fullName;
  
  shippingAddressDisplay.innerHTML = `
    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <h3 class="font-semibold mb-2">Shipping To:</h3>
      <p class="text-gray-600 dark:text-gray-300">
        <strong>${fullName}</strong><br>
        ${address.line1}<br>
        ${address.line2 ? address.line2 + '<br>' : ''}
        ${address.city}, ${address.state} ${address.zip}<br>
        ${address.country}<br>
        Phone: ${address.phone || checkoutData.phone}
      </p>
    </div>
  `;
}

function displayOrderSummary() {
  if (!shippingItems) return;

  if (!cart || cart.length === 0) {
    window.location.href = 'checkout.html';
    return;
  }

  shippingItems.innerHTML = cart.map(item => {
    const displayTitle = item.title || 'Product';
    const displayImage = item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&auto=format';
    const displayPrice = item.price || 0;
    const quantity = item.quantity || 1;
    
    return `
    <div class="flex items-center gap-3 border-b border-gray-200 dark:border-gray-700 pb-3 last:border-0">
      <img src="${displayImage}" alt="${displayTitle}" class="w-16 h-16 object-cover rounded-lg">
      <div class="flex-1">
        <p class="font-semibold text-sm line-clamp-1">${displayTitle}</p>
        <p class="text-xs text-gray-500 dark:text-gray-400">Qty: ${quantity}</p>
      </div>
      <p class="font-semibold text-indigo-600 dark:text-indigo-400">$${(displayPrice * quantity).toFixed(2)}</p>
    </div>
  `}).join('');

  if (shippingSubtotal) shippingSubtotal.textContent = `$${checkoutData.subtotal.toFixed(2)}`;
  if (shippingTax) shippingTax.textContent = `$${checkoutData.tax.toFixed(2)}`;
  if (shippingTotal) shippingTotal.textContent = `$${checkoutData.total.toFixed(2)}`;
}

function calculateTotalWithShipping() {
  const selectedShipping = document.querySelector('input[name="shipping"]:checked');
  const shippingCost = selectedShipping ? parseFloat(selectedShipping.value) : 0;
  const total = checkoutData.total + shippingCost;
  
  document.getElementById('shippingCost').textContent = `$${shippingCost.toFixed(2)}`;
  document.getElementById('finalTotal').textContent = `$${total.toFixed(2)}`;
  
  return { shippingCost, total };
}

function checkAuthAndLoadData() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'signup.html';
      return;
    }
    
    currentUser = user;
    const hasData = loadCheckoutData();
    
    if (hasData && cart.length > 0) {
      dataLoaded = true;
      displayOrderSummary();
      
      const shippingRadios = document.querySelectorAll('input[name="shipping"]');
      shippingRadios.forEach(radio => {
        radio.addEventListener('change', calculateTotalWithShipping);
      });

      calculateTotalWithShipping();
    } else {
      window.location.href = 'checkout.html';
    }
  });
}

if (shippingForm) {
  shippingForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!dataLoaded || !checkoutData) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No checkout data found. Please start over.'
      });
      return;
    }
    
    const selectedShipping = document.querySelector('input[name="shipping"]:checked');
    if (!selectedShipping) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please select a shipping method'
      });
      return;
    }
    
    const shippingMethod = selectedShipping.closest('label').querySelector('.flex-1 p.font-semibold').textContent;
    const shippingCost = parseFloat(selectedShipping.value);
    const { total } = calculateTotalWithShipping();

    const paymentData = {
      ...checkoutData,
      shippingMethod: shippingMethod,
      shippingCost: shippingCost,
      totalWithShipping: total
    };

    sessionStorage.setItem('paymentData', JSON.stringify(paymentData));
    
    Swal.fire({
      title: 'Processing...',
      text: 'Redirecting to payment...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    
    setTimeout(() => {
      window.location.href = 'payment.html';
    }, 500);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  checkAuthAndLoadData();
  updateCartCount();
});