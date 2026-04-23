import { updateCartCount } from './main.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const checkoutItems = document.getElementById('checkoutItems');
const checkoutSubtotal = document.getElementById('checkoutSubtotal');
const checkoutTax = document.getElementById('checkoutTax');
const checkoutTotal = document.getElementById('checkoutTotal');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');
const backToTop = document.getElementById('backToTop');
const checkoutForm = document.getElementById('checkoutForm');

let cart = [];
let currentUser = null;
let appliedCoupon = null;
let discountAmount = 0;

// Mobile menu
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

// Back to top
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

// Load user cart
async function loadUserCart(userId) {
  try {
    const cartRef = doc(db, 'carts', userId);
    const cartDoc = await getDoc(cartRef);
    
    if (cartDoc.exists()) {
      cart = cartDoc.data().items || [];
    } else {
      cart = [];
    }
    
    return cart;
  } catch (error) {
    console.error('Error loading cart:', error);
    cart = [];
    return [];
  }
}

// Check auth and load cart
function checkAuthAndLoadCart() {
  if (checkoutItems) {
    checkoutItems.innerHTML = `
      <div class="flex justify-center items-center py-8">
        <div class="text-center">
          <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading your cart...</p>
        </div>
      </div>
    `;
  }

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    
    currentUser = user;
    await loadUserCart(user.uid);
    displayCheckoutItems();
    updateCartCount();
  });
}

// Calculate totals
function calculateTotals() {
  const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
  const discountedSubtotal = subtotal - discountAmount;
  const tax = discountedSubtotal * 0.10;
  const total = discountedSubtotal + tax;

  if (checkoutSubtotal) {
    if (discountAmount > 0) {
      checkoutSubtotal.innerHTML = `<span class="line-through text-gray-400 mr-2">$${subtotal.toFixed(2)}</span>$${discountedSubtotal.toFixed(2)}`;
    } else {
      checkoutSubtotal.textContent = `$${subtotal.toFixed(2)}`;
    }
  }
  if (checkoutTax) checkoutTax.textContent = `$${tax.toFixed(2)}`;
  if (checkoutTotal) checkoutTotal.textContent = `$${total.toFixed(2)}`;

  return { subtotal: discountedSubtotal, tax, total, originalSubtotal: subtotal };
}

function displayCheckoutItems() {
  if (!checkoutItems) return;

  if (!cart || cart.length === 0) {
    checkoutItems.innerHTML = `
      <div class="text-center py-12">
        <svg class="w-20 h-20 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <h3 class="text-xl font-semibold mb-2">Your cart is empty</h3>
        <p class="text-gray-600 dark:text-gray-400 mb-6">Add some items to your cart before checkout.</p>
        <a href="shop.html" class="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-8 rounded-lg transition-all">
          Continue Shopping
        </a>
      </div>
    `;
    return;
  }

  checkoutItems.innerHTML = cart.map(item => {
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

  calculateTotals();
}

// Apply coupon function
async function applyCoupon() {
  const codeInput = document.getElementById('couponCode');
  const code = codeInput.value.toUpperCase().trim();
  const messageDiv = document.getElementById('couponMessage');
  
  if (!code) {
    showCouponMessage('Please enter a coupon code', 'error');
    return;
  }
  
  if (appliedCoupon) {
    showCouponMessage('Coupon already applied. Remove current coupon to apply another.', 'error');
    return;
  }
  
  try {
    const couponsRef = collection(db, 'coupons');
    const q = query(couponsRef, where('code', '==', code));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      showCouponMessage('Invalid coupon code', 'error');
      return;
    }
    
    const couponDoc = querySnapshot.docs[0];
    const coupon = couponDoc.data();
    const now = new Date();
    const expiryDate = new Date(coupon.expiryDate);
    const subtotal = cart.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
    
    // Check if expired
    if (expiryDate < now) {
      showCouponMessage('This coupon has expired', 'error');
      return;
    }
    
    // Check if active
    if (coupon.status === 'expired') {
      showCouponMessage('This coupon is no longer active', 'error');
      return;
    }
    
    // Check usage limit
    if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
      showCouponMessage('This coupon has reached its usage limit', 'error');
      return;
    }
    
    // Check minimum purchase
    if (coupon.minPurchase && subtotal < coupon.minPurchase) {
      showCouponMessage(`Minimum purchase of $${coupon.minPurchase.toFixed(2)} required`, 'error');
      return;
    }
    
    // Calculate discount
    let discount = 0;
    if (coupon.discountType === 'percentage') {
      discount = (subtotal * coupon.discountValue) / 100;
    } else {
      discount = coupon.discountValue;
    }
    
    discountAmount = Math.min(discount, subtotal);
    appliedCoupon = { id: couponDoc.id, ...coupon };
    
    // Update totals with discount
    calculateTotals();
    
    showCouponMessage(`Coupon applied! You saved $${discountAmount.toFixed(2)}`, 'success');
    codeInput.disabled = true;
    const applyBtn = document.getElementById('applyCouponBtn');
    applyBtn.textContent = 'Applied ✓';
    applyBtn.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    applyBtn.classList.add('bg-green-600', 'text-white');
    
    // Add remove coupon button
    addRemoveCouponButton();
    
  } catch (error) {
    console.error('Error applying coupon:', error);
    showCouponMessage('Error applying coupon. Please try again.', 'error');
  }
}

function addRemoveCouponButton() {
  const couponSection = document.getElementById('couponSection');
  const existingRemove = document.getElementById('removeCouponBtn');
  if (existingRemove) return;
  
  const removeBtn = document.createElement('button');
  removeBtn.id = 'removeCouponBtn';
  removeBtn.className = 'text-xs text-red-500 hover:text-red-600 mt-1 flex items-center gap-1';
  removeBtn.innerHTML = '<i class="fas fa-times-circle"></i> Remove coupon';
  removeBtn.onclick = removeCoupon;
  
  couponSection.appendChild(removeBtn);
}

function removeCoupon() {
  discountAmount = 0;
  appliedCoupon = null;
  
  const codeInput = document.getElementById('couponCode');
  const applyBtn = document.getElementById('applyCouponBtn');
  const removeBtn = document.getElementById('removeCouponBtn');
  
  codeInput.disabled = false;
  codeInput.value = '';
  applyBtn.textContent = 'Apply';
  applyBtn.classList.remove('bg-green-600', 'text-white');
  applyBtn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
  if (removeBtn) removeBtn.remove();
  
  calculateTotals();
  
  const messageDiv = document.getElementById('couponMessage');
  messageDiv.innerHTML = '';
  messageDiv.classList.add('hidden');
}

function showCouponMessage(message, type) {
  const messageDiv = document.getElementById('couponMessage');
  messageDiv.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'} mr-1"></i>${message}`;
  messageDiv.classList.remove('hidden', 'text-green-600', 'text-red-600');
  messageDiv.classList.add(type === 'success' ? 'text-green-600' : 'text-red-600');
  
  setTimeout(() => {
    if (messageDiv) {
      messageDiv.classList.add('hidden');
    }
  }, 5000);
}

// Checkout form submit
if (checkoutForm) {
  checkoutForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('checkoutEmail')?.value;
    const phone = document.getElementById('checkoutPhone')?.value;
    const fullName = document.getElementById('checkoutFullName')?.value;
    const address1 = document.getElementById('checkoutAddress1')?.value;
    const address2 = document.getElementById('checkoutAddress2')?.value || '';
    const city = document.getElementById('checkoutCity')?.value;
    const state = document.getElementById('checkoutState')?.value;
    const zip = document.getElementById('checkoutZip')?.value;
    const country = document.getElementById('checkoutCountry')?.value || 'United States';
    
    if (!email || !phone || !fullName || !address1 || !city || !state || !zip) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please fill in all required fields'
      });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Please enter a valid email address'
      });
      return;
    }
    
    const totals = calculateTotals();
    
    const checkoutData = {
      email: email,
      phone: phone,
      fullName: fullName,
      shippingAddress: {
        fullName: fullName,
        line1: address1,
        line2: address2,
        city: city,
        state: state,
        zip: zip,
        country: country,
        phone: phone
      },
      items: cart,
      subtotal: totals.subtotal,
      originalSubtotal: totals.originalSubtotal,
      tax: totals.tax,
      total: totals.total,
      couponApplied: appliedCoupon ? {
        code: appliedCoupon.code,
        discountType: appliedCoupon.discountType,
        discountValue: appliedCoupon.discountValue,
        discountAmount: discountAmount
      } : null,
      orderDate: new Date().toISOString(),
      userId: currentUser ? currentUser.uid : null,
      userEmail: currentUser ? currentUser.email : email
    };

    // Update coupon usage count if coupon was applied
    if (appliedCoupon) {
      try {
        const couponRef = doc(db, 'coupons', appliedCoupon.id);
        await updateDoc(couponRef, {
          usedCount: increment(1)
        });
      } catch (error) {
        console.error('Error updating coupon usage:', error);
      }
    }

    sessionStorage.setItem('checkoutData', JSON.stringify(checkoutData));
    localStorage.setItem('checkoutData_backup', JSON.stringify(checkoutData));
    
    Swal.fire({
      title: 'Processing...',
      text: 'Redirecting to shipping...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    
    setTimeout(() => {
      window.location.href = 'shippings.html';
    }, 500);
  });
}

// Auto-fill user data
async function autoFillUserData() {
  const user = auth.currentUser;
  if (!user) return;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      const emailInput = document.getElementById('checkoutEmail');
      const fullNameInput = document.getElementById('checkoutFullName');
      const phoneInput = document.getElementById('checkoutPhone');
      
      if (emailInput && user.email) emailInput.value = user.email;
      if (fullNameInput && userData.fullName) fullNameInput.value = userData.fullName;
      if (phoneInput && userData.phone) phoneInput.value = userData.phone;
    }
  } catch (error) {
    console.error('Error auto-filling user data:', error);
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  checkAuthAndLoadCart();
  setTimeout(autoFillUserData, 500);
  
  // Add coupon button event listener
  const applyBtn = document.getElementById('applyCouponBtn');
  if (applyBtn) {
    applyBtn.addEventListener('click', applyCoupon);
  }
});