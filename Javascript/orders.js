import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, query, where, orderBy, getDocs, doc, getDoc, addDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { openModal, closeModal, addToCart, updateCartCount } from './main.js';

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

const ordersList = document.getElementById('ordersList');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profileAvatar = document.getElementById('profileAvatar');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');

let currentUser = null;
let currentReviewProduct = null;
let selectedRating = 0;

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

async function loadUserProfile(user) {
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();
    if (profileName) profileName.textContent = userData?.fullName || user.displayName || 'User';
    if (profileEmail) profileEmail.textContent = user.email;
    if (profileAvatar) profileAvatar.src = userData?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=4f46e5&color=fff&bold=true`;
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

async function loadUserOrders(userId) {
  if (!ordersList) return;
  ordersList.innerHTML = `
    <div class="flex justify-center items-center py-12">
      <div class="text-center">
        <div class="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
        <p class="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading your orders...</p>
      </div>
    </div>
  `;
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('userId', '==', userId), orderBy('orderDate', 'desc'));
    const querySnapshot = await getDocs(q);
    const orders = [];
    querySnapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
    displayOrders(orders);
  } catch (error) {
    console.error('Error loading orders:', error);
    ordersList.innerHTML = `
      <div class="text-center py-12">
        <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 max-w-md mx-auto">
          <i class="fas fa-exclamation-triangle text-red-500 text-4xl mb-3"></i>
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Failed to Load Orders</h3>
          <p class="text-gray-600 dark:text-gray-400 text-sm">Please try again later</p>
          <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors">Try Again</button>
        </div>
      </div>
    `;
  }
}

async function hasUserReviewedProduct(userId, productId) {
  if (!userId) return false;
  try {
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, where('customerId', '==', userId), where('productId', '==', String(productId)));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    return false;
  }
}

function getStatusColor(status) {
  const s = status?.toLowerCase();
  if (s === 'delivered') return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
  if (s === 'processing') return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  if (s === 'pending') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
  if (s === 'shipped') return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
  if (s === 'cancelled') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
}

async function displayOrders(orders) {
  if (!ordersList) return;
  if (orders.length === 0) {
    ordersList.innerHTML = `
      <div class="text-center py-16">
        <div class="bg-gray-50 dark:bg-gray-800 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4">
          <i class="fas fa-shopping-bag text-4xl text-gray-400"></i>
        </div>
        <h3 class="text-xl font-semibold text-gray-900 dark:text-white mb-2">No Orders Yet</h3>
        <p class="text-gray-500 dark:text-gray-400 mb-6">Looks like you haven't placed any orders yet.</p>
        <a href="shop.html" class="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-md">
          <i class="fas fa-shopping-cart"></i>
          Start Shopping
        </a>
      </div>
    `;
    return;
  }
  let html = '';
  for (const order of orders) {
    const orderId = order.id;
    const orderDate = new Date(order.orderDate || Date.now());
    const formattedDate = orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const statusColor = getStatusColor(order.status);
    const items = order.items || [];
    const orderTotal = order.total || items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
    let itemsHtml = '';
    for (const item of items) {
      const itemTitle = item.title || item.name || 'Product';
      const itemImage = item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&auto=format';
      const itemPrice = item.price || 0;
      const itemQuantity = item.quantity || 1;
      const hasReviewed = await hasUserReviewedProduct(currentUser?.uid, item.id);
      itemsHtml += `
        <div class="flex items-start gap-4 py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
          <img src="${itemImage}" class="w-16 h-16 object-cover rounded-xl shadow-sm flex-shrink-0" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&auto=format'">
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900 dark:text-white text-base">${itemTitle}</h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Quantity: ${itemQuantity} × $${itemPrice.toFixed(2)}</p>
          </div>
          <div class="text-right">
            <span class="font-bold text-indigo-600 dark:text-indigo-400 text-lg">$${(itemPrice * itemQuantity).toFixed(2)}</span>
            ${order.status?.toLowerCase() === 'delivered' && !hasReviewed ? `
              <button onclick='openReviewModalForItem(${JSON.stringify(item).replace(/'/g, "\\'")})' 
                      class="block text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 mt-2 transition-colors">
                <i class="fas fa-star mr-1"></i> Write a Review
              </button>
            ` : hasReviewed ? `
              <span class="block text-xs font-medium text-green-600 dark:text-green-400 mt-2">
                <i class="fas fa-check-circle mr-1"></i> Reviewed
              </span>
            ` : ''}
          </div>
        </div>
      `;
    }
    html += `
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <div class="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-center gap-3 flex-wrap">
              <span class="text-sm font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">
                #${orderId.slice(-8).toUpperCase()}
              </span>
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${statusColor}">
                <span class="w-1.5 h-1.5 rounded-full ${statusColor.replace('bg-', 'bg-').replace('text-', '')} mr-1.5"></span>
                ${order.status || 'Pending'}
              </span>
            </div>
            <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <i class="far fa-calendar-alt"></i>
              <span>${formattedDate}</span>
            </div>
          </div>
        </div>
        <div class="p-5 space-y-3">
          ${itemsHtml}
        </div>
        <div class="p-5 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-500 dark:text-gray-400">Total Amount:</span>
              <span class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">$${orderTotal.toFixed(2)}</span>
            </div>
            <button onclick="viewOrderDetails('${orderId}')" 
                    class="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl font-medium text-sm transition-all duration-200">
              <i class="fas fa-eye"></i>
              View Details
            </button>
          </div>
        </div>
      </div>
    `;
  }
  ordersList.innerHTML = html;
}

function openReviewModal(product) {
  currentReviewProduct = product;
  selectedRating = 0;
  document.getElementById('reviewProductName').textContent = product.title || product.name;
  document.getElementById('reviewProductImage').src = product.image || product.thumbnail || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&auto=format';
  document.getElementById('reviewComment').value = '';
  const stars = document.querySelectorAll('.star-select');
  stars.forEach(star => { star.textContent = '☆'; star.classList.remove('text-yellow-400'); star.classList.add('text-gray-300'); });
  document.getElementById('reviewModal').classList.remove('hidden');
  document.getElementById('reviewModal').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

window.openReviewModalForItem = function(product) { openReviewModal(product); };
window.closeReviewModal = function() {
  document.getElementById('reviewModal').classList.add('hidden');
  document.getElementById('reviewModal').style.display = 'none';
  document.body.style.overflow = 'auto';
  currentReviewProduct = null;
  selectedRating = 0;
};
window.submitReview = async function() {
  if (!currentUser) { Swal.fire({ icon: 'warning', title: 'Login Required', text: 'Please log in to leave a review' }); return; }
  if (!currentReviewProduct) { Swal.fire({ icon: 'error', title: 'Error', text: 'Product not found' }); return; }
  if (selectedRating === 0) { Swal.fire({ icon: 'warning', title: 'Rating Required', text: 'Please select a rating' }); return; }
  const comment = document.getElementById('reviewComment').value.trim();
  if (!comment) { Swal.fire({ icon: 'warning', title: 'Comment Required', text: 'Please write your review' }); return; }
  Swal.fire({ title: 'Submitting...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
  try {
    const alreadyReviewed = await hasUserReviewedProduct(currentUser.uid, currentReviewProduct.id);
    if (alreadyReviewed) { Swal.fire({ icon: 'warning', title: 'Already Reviewed', text: 'You have already reviewed this product' }); return; }
    await addDoc(collection(db, 'reviews'), {
      productId: String(currentReviewProduct.id),
      productName: currentReviewProduct.title || currentReviewProduct.name,
      customerId: currentUser.uid,
      customerName: currentUser.displayName || currentUser.email.split('@')[0],
      customerEmail: currentUser.email,
      rating: selectedRating,
      comment: comment,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
    Swal.fire({ icon: 'success', title: 'Review Submitted!', text: 'Thank you! Your review will appear after admin approval.' });
    closeReviewModal();
    await loadUserOrders(currentUser.uid);
  } catch (error) {
    Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to submit review' });
  }
};
function initStarRating() {
  const stars = document.querySelectorAll('.star-select');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      const rating = parseInt(star.dataset.rating);
      selectedRating = rating;
      stars.forEach((s, index) => {
        if (index < rating) { s.textContent = '★'; s.classList.add('text-yellow-400'); s.classList.remove('text-gray-300'); }
        else { s.textContent = '☆'; s.classList.remove('text-yellow-400'); s.classList.add('text-gray-300'); }
      });
    });
  });
}
window.viewOrderDetails = async function(orderId) {
  try {
    const orderDoc = await getDoc(doc(db, 'orders', orderId));
    if (!orderDoc.exists()) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Order not found' });
      return;
    }

    const order = orderDoc.data();
    const orderDate = new Date(order.orderDate || Date.now());
    const formattedDate = orderDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const statusColor = getStatusColor(order.status);
    const shippingAddress = order.shippingAddress || {};
    
    const fullName = shippingAddress.fullName || order.fullName || currentUser?.displayName || 'N/A';
    const phone = shippingAddress.phone || order.phone || 'N/A';
    const email = shippingAddress.email || order.email || currentUser?.email || 'N/A';
    
    const line1 = shippingAddress.line1 || shippingAddress.address || 'N/A';
    const line2 = shippingAddress.line2 || '';
    const city = shippingAddress.city || '';
    const state = shippingAddress.state || '';
    const zip = shippingAddress.zip || '';
    const country = shippingAddress.country || 'United States';
    
    let addressString = line1;
    if (line2) addressString += `<br>${line2}`;
    const cityStateZip = [city, state, zip].filter(part => part).join(', ');
    if (cityStateZip) addressString += `<br>${cityStateZip}`;
    if (country) addressString += `<br>${country}`;
    
    const items = order.items || [];
    const subtotal = order.subtotal || items.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
    const shippingCost = order.shippingCost || 5.99;
    const tax = order.tax || (subtotal * 0.1);
    const total = order.total || (subtotal + shippingCost + tax);
    const paymentMethod = order.paymentMethod || 'Credit Card';
    
    const itemsHTML = items.map(item => {
      const itemTitle = item.title || item.name || 'Product';
      const itemImage = item.image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&auto=format';
      const itemPrice = item.price || 0;
      const itemQuantity = item.quantity || 1;
      return `
        <div class="flex items-start gap-4 py-4 border-b border-gray-100 dark:border-gray-700 last:border-0">
          <img src="${itemImage}" class="w-16 h-16 object-cover rounded-xl shadow-sm flex-shrink-0" onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100&auto=format'">
          <div class="flex-1">
            <h4 class="font-semibold text-gray-900 dark:text-white">${itemTitle}</h4>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">Quantity: ${itemQuantity} × $${itemPrice.toFixed(2)}</p>
          </div>
          <div class="text-right">
            <span class="font-bold text-indigo-600 dark:text-indigo-400">$${(itemPrice * itemQuantity).toFixed(2)}</span>
          </div>
        </div>
      `;
    }).join('');
    
    Swal.fire({
      title: `<span class="text-xl font-bold">Order #${orderId.slice(-8).toUpperCase()}</span>`,
      html: `
        <div class="text-left max-h-[70vh] overflow-y-auto px-2">
          <!-- Order Info Card -->
          <div class="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">Order Date</p>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">${formattedDate}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">Status</p>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColor}">
                  ${order.status || 'Pending'}
                </span>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">Payment Method</p>
                <p class="text-sm font-semibold text-gray-900 dark:text-white">${paymentMethod}</p>
              </div>
              <div>
                <p class="text-xs text-gray-500 dark:text-gray-400">Order Total</p>
                <p class="text-sm font-bold text-indigo-600 dark:text-indigo-400">$${total.toFixed(2)}</p>
              </div>
            </div>
          </div>
          
          <!-- Shipping Address Card -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
            <h3 class="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i class="fas fa-map-marker-alt text-indigo-500 text-sm"></i>
              Shipping Address
            </h3>
            <div class="space-y-2 text-sm">
              <p class="font-medium text-gray-900 dark:text-white">${fullName}</p>
              <p class="text-gray-600 dark:text-gray-400">${addressString}</p>
              <p class="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <i class="fas fa-phone-alt text-xs"></i> ${phone}
              </p>
              <p class="text-gray-600 dark:text-gray-400 flex items-center gap-2">
                <i class="fas fa-envelope text-xs"></i> ${email}
              </p>
            </div>
          </div>
          
          <!-- Order Items Card -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-4">
            <h3 class="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i class="fas fa-box text-indigo-500 text-sm"></i>
              Order Items (${items.length})
            </h3>
            <div class="space-y-2 max-h-64 overflow-y-auto">
              ${itemsHTML || '<p class="text-center text-gray-500 py-4">No items found</p>'}
            </div>
          </div>
          
          <!-- Price Breakdown Card -->
          <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
            <h3 class="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i class="fas fa-receipt text-indigo-500 text-sm"></i>
              Price Breakdown
            </h3>
            <div class="space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span class="font-medium text-gray-900 dark:text-white">$${subtotal.toFixed(2)}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Shipping</span>
                <span class="font-medium text-gray-900 dark:text-white">$${shippingCost.toFixed(2)}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-600 dark:text-gray-400">Tax (10%)</span>
                <span class="font-medium text-gray-900 dark:text-white">$${tax.toFixed(2)}</span>
              </div>
              ${order.discount ? `
                <div class="flex justify-between text-sm">
                  <span class="text-gray-600 dark:text-gray-400">Discount</span>
                  <span class="font-medium text-green-600">-$${order.discount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <div class="flex justify-between">
                  <span class="font-semibold text-gray-900 dark:text-white">Total</span>
                  <span class="font-bold text-indigo-600 dark:text-indigo-400 text-lg">$${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `,
      width: '650px',
      confirmButtonColor: '#4f46e5',
      confirmButtonText: 'Close',
      showCloseButton: true,
      background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff',
      customClass: {
        popup: 'rounded-2xl',
        confirmButton: 'px-6 py-2.5 rounded-lg font-semibold'
      }
    });
  } catch (error) {
    console.error('Error loading order details:', error);
    Swal.fire({ 
      icon: 'error', 
      title: 'Error', 
      text: 'Failed to load order details. Please try again.' 
    });
  }
};
onAuthStateChanged(auth, async (user) => {
  if (!user) { window.location.href = 'signup.html'; return; }
  currentUser = user;
  await loadUserProfile(user);
  await loadUserOrders(user.uid);
});
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  initStarRating();
});