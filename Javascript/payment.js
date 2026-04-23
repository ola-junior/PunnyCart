import { updateCartCount } from './main.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, addDoc, collection } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const paymentItems = document.getElementById('paymentItems');
const paymentSubtotal = document.getElementById('paymentSubtotal');
const paymentTax = document.getElementById('paymentTax');
const paymentShipping = document.getElementById('paymentShipping');
const paymentTotal = document.getElementById('paymentTotal');
const shippingAddressDisplay = document.getElementById('shippingAddressDisplay');
const shippingMethodDisplay = document.getElementById('shippingMethodDisplay');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');
const backToTop = document.getElementById('backToTop');
const paymentForm = document.getElementById('paymentForm');

let cart = [];
let paymentData = null;
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

function loadPaymentData() {
  try {
    const savedData = sessionStorage.getItem('paymentData');
    if (savedData) {
      paymentData = JSON.parse(savedData);
      cart = paymentData.items || [];
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error('Error loading payment data:', error);
    return false;
  }
}

function displayShippingAddress() {
  if (!shippingAddressDisplay || !paymentData) return;

  const address = paymentData.shippingAddress || paymentData.address;
  const fullName = paymentData.fullName;

  shippingAddressDisplay.innerHTML = `
    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <h3 class="font-semibold mb-2">Shipping Address</h3>
      <p class="text-gray-600 dark:text-gray-300">
        <strong>${fullName}</strong><br>
        ${address.line1}<br>
        ${address.line2 ? address.line2 + '<br>' : ''}
        ${address.city}, ${address.state} ${address.zip}<br>
        ${address.country}<br>
        Phone: ${address.phone || paymentData.phone || 'N/A'}
      </p>
    </div>
  `;
}

function displayShippingMethod() {
  if (!shippingMethodDisplay || !paymentData) return;

  shippingMethodDisplay.innerHTML = `
    <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
      <h3 class="font-semibold mb-2">Shipping Method</h3>
      <p class="text-gray-600 dark:text-gray-300">
        <strong>${paymentData.shippingMethod}</strong><br>
        <span class="text-sm">$${paymentData.shippingCost.toFixed(2)}</span>
      </p>
    </div>
  `;
}

function displayOrderSummary() {
  if (!paymentItems) return;

  if (!cart || cart.length === 0) {
    window.location.href = 'checkout.html';
    return;
  }

  paymentItems.innerHTML = cart.map(item => {
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

  if (paymentSubtotal) paymentSubtotal.textContent = `$${paymentData.subtotal.toFixed(2)}`;
  if (paymentTax) paymentTax.textContent = `$${paymentData.tax.toFixed(2)}`;
  if (paymentShipping) paymentShipping.textContent = `$${paymentData.shippingCost.toFixed(2)}`;
  if (paymentTotal) paymentTotal.textContent = `$${paymentData.totalWithShipping.toFixed(2)}`;
}

function checkAuthAndLoadData() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }

    currentUser = user;
    const hasData = loadPaymentData();

    if (hasData && cart.length > 0) {
      dataLoaded = true;
      displayShippingAddress();
      displayShippingMethod();
      displayOrderSummary();
    } else {
      window.location.href = 'shipping.html';
    }
  });
}

function formatCardNumber(input) {
  let value = input.value.replace(/\s/g, '');
  value = value.replace(/\D/g, '').substring(0, 16);
  const parts = [];
  for (let i = 0; i < value.length; i += 4) {
    parts.push(value.substring(i, i + 4));
  }
  input.value = parts.join(' ');
}

function formatExpiry(input) {
  let value = input.value.replace(/\D/g, '');
  if (value.length >= 2) {
    value = value.substring(0, 2) + '/' + value.substring(2, 4);
  }
  input.value = value;
}

if (paymentForm) {
  paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!dataLoaded || !paymentData) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No payment data found. Please start over.'
      });
      return;
    }

    const cardNumber = document.getElementById('cardNumber')?.value.replace(/\s/g, '');
    const cardExpiry = document.getElementById('cardExpiry')?.value;
    const cardCvv = document.getElementById('cardCvv')?.value;
    const cardName = document.getElementById('cardName')?.value;

    if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please fill in all card details'
      });
      return;
    }
    
    if (cardNumber.length !== 16) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Card',
        text: 'Please enter a valid 16-digit card number'
      });
      return;
    }

    if (!cardExpiry.match(/^\d{2}\/\d{2}$/)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Expiry',
        text: 'Please enter expiry date in MM/YY format'
      });
      return;
    }

    if (cardCvv.length < 3 || cardCvv.length > 4) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid CVV',
        text: 'Please enter a valid CVV'
      });
      return;
    }
    
    Swal.fire({
      title: 'Processing Payment...',
      text: 'Please do not close this window',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const orderSaved = await saveOrderToFirebase();

    if (orderSaved) {
      Swal.fire({
        icon: 'success',
        title: 'Payment Successful!',
        text: 'Your order has been placed successfully.',
        timer: 2000,
        showConfirmButton: false
      });

      setTimeout(() => {
        window.location.href = 'successful.html';
      }, 2000);
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Payment Failed',
        text: 'There was an error processing your payment. Please try again.'
      });
    }
  });
}

async function saveOrderToFirebase() {
  if (!currentUser || !paymentData) return false;

  try {
    const address = paymentData.shippingAddress || paymentData.address;
    
    const order = {
      userId: currentUser.uid,
      userEmail: paymentData.email || currentUser.email,
      fullName: paymentData.fullName,
      phone: paymentData.phone,
      email: paymentData.email,
      items: cart,
      shippingAddress: {
        fullName: paymentData.fullName,
        line1: address.line1,
        line2: address.line2 || '',
        city: address.city,
        state: address.state,
        zip: address.zip,
        country: address.country,
        phone: paymentData.phone
      },
      shippingMethod: paymentData.shippingMethod,
      shippingCost: paymentData.shippingCost,
      subtotal: paymentData.subtotal,
      tax: paymentData.tax,
      total: paymentData.totalWithShipping,
      status: 'pending',
      orderDate: new Date().toISOString(),
      estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    const ordersRef = collection(db, 'orders');
    const docRef = await addDoc(ordersRef, order);

    const cartRef = doc(db, 'carts', currentUser.uid);
    await setDoc(cartRef, { items: [] }, { merge: true });

    sessionStorage.removeItem('checkoutData');
    sessionStorage.removeItem('paymentData');
    sessionStorage.setItem('lastOrderId', docRef.id);
    sessionStorage.setItem('orderTotal', order.total.toFixed(2));

    return true;
  } catch (error) {
    console.error('Error saving order:', error);
    return false;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const cardNumberInput = document.getElementById('cardNumber');
  if (cardNumberInput) {
    cardNumberInput.addEventListener('input', (e) => formatCardNumber(e.target));
  }

  const expiryInput = document.getElementById('cardExpiry');
  if (expiryInput) {
    expiryInput.addEventListener('input', (e) => formatExpiry(e.target));
  }

  const cvvInput = document.getElementById('cardCvv');
  if (cvvInput) {
    cvvInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/\D/g, '').substring(0, 4);
    });
  }

  checkAuthAndLoadData();
  updateCartCount();
});