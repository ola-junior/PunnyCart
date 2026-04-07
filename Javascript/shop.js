import { openModal, closeModal, addToCart, updateCartCount, toggleWishlist, isInWishlist, getUserWishlist, loadUserWishlist } from './main.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDlkoedJh9k940IofE8VKJ9-fT8Gz7WvoI",
  authDomain: "e-commerce-29a73.firebaseapp.com",
  projectId: "e-commerce-29a73",
  storageBucket: "e-commerce-29a73.firebasestorage.app",
  messagingSenderId: "870933397259",
  appId: "1:870933397259:web:7a0d6f50a6a11f92b66c0e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const productsGrid = document.getElementById('productsGrid');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');
const backToTop = document.getElementById('backToTop');
const sortSelect = document.getElementById('sortSelect');
const searchInput = document.getElementById('searchInput');

const filterAll = document.getElementById('filterAll');
const filterElectronics = document.getElementById('filterElectronics');
const filterFashion = document.getElementById('filterFashion');
const filterHome = document.getElementById('filterHome');
const filterAccessories = document.getElementById('filterAccessories');
const filterAudio = document.getElementById('filterAudio');

let allProducts = [];
let filteredProducts = [];
let currentFilter = 'All';
let currentSort = 'default';
let currentSearch = '';
let currentUser = null;

// PAGINATION VARIABLES
let currentPage = 1;
const PRODUCTS_PER_PAGE = 24;
let totalPages = 1;

function showToastMessage(message, type = 'error') {
  const toast = document.createElement('div');
  let bgColor = 'bg-red-500';
  if (type === 'success') bgColor = 'bg-green-500';
  if (type === 'warning') bgColor = 'bg-yellow-500';
  if (type === 'info') bgColor = 'bg-blue-500';
  
  toast.className = `fixed bottom-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce-slow`;
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    if (toast.parentNode) toast.remove();
  }, 3000);
}

// Mobile menu handlers
if (mobileMenuToggle && mobileMenu) {
  mobileMenuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });
}

// Back to top button
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

function setActiveFilter(activeButton) {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.classList.remove('bg-indigo-600', 'text-white');
    btn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
  });
  activeButton.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
  activeButton.classList.add('bg-indigo-600', 'text-white');
}

function filterAndSearch() {
  let result = [...allProducts];
  
  if (currentFilter !== 'All') {
    result = result.filter(p => p.category === currentFilter);
  }
  
  if (currentSearch.trim() !== '') {
    const searchTerm = currentSearch.toLowerCase();
    result = result.filter(p => 
      (p.name || p.title || '').toLowerCase().includes(searchTerm) ||
      (p.category || '').toLowerCase().includes(searchTerm) ||
      (p.description || '').toLowerCase().includes(searchTerm) ||
      (p.brand || '').toLowerCase().includes(searchTerm)
    );
  }
  
  filteredProducts = result;
  sortProducts();
  currentPage = 1;
  totalPages = Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE);
  displayProducts();
  displayPagination();
}

function filterProducts(category) {
  currentFilter = category;
  filterAndSearch();
}

function sortProducts() {
  switch (currentSort) {
    case 'price-low':
      filteredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
      break;
    case 'price-high':
      filteredProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
      break;
    case 'rating':
      filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      break;
    default:
      filteredProducts.sort((a, b) => (a.id || 0) - (b.id || 0));
  }
}

function handleSearch() {
  currentSearch = searchInput?.value || '';
  filterAndSearch();
}

function displayPagination() {
  const existingPagination = document.getElementById('paginationContainer');
  if (existingPagination) existingPagination.remove();
  
  if (totalPages <= 1) return;
  
  const paginationContainer = document.createElement('div');
  paginationContainer.id = 'paginationContainer';
  paginationContainer.className = 'flex justify-center items-center gap-2 mt-8 mb-8 flex-wrap';
  
  const prevBtn = document.createElement('button');
  prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
  prevBtn.className = `px-4 py-2 rounded-lg font-semibold transition-all ${currentPage === 1 ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`;
  prevBtn.disabled = currentPage === 1;
  if (currentPage > 1) {
    prevBtn.addEventListener('click', () => {
      currentPage--;
      displayProducts();
      displayPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  paginationContainer.appendChild(prevBtn);
  
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }
  
  if (startPage > 1) {
    const firstBtn = document.createElement('button');
    firstBtn.textContent = '1';
    firstBtn.className = `px-4 py-2 rounded-lg font-semibold transition-all ${1 === currentPage ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-600 hover:text-white'}`;
    firstBtn.addEventListener('click', () => {
      currentPage = 1;
      displayProducts();
      displayPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationContainer.appendChild(firstBtn);
    
    if (startPage > 2) {
      const dots = document.createElement('span');
      dots.textContent = '...';
      dots.className = 'px-2 text-gray-500';
      paginationContainer.appendChild(dots);
    }
  }
  
  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement('button');
    pageBtn.textContent = i;
    pageBtn.className = `px-4 py-2 rounded-lg font-semibold transition-all ${i === currentPage ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-600 hover:text-white'}`;
    pageBtn.addEventListener('click', () => {
      currentPage = i;
      displayProducts();
      displayPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationContainer.appendChild(pageBtn);
  }
  
  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement('span');
      dots.textContent = '...';
      dots.className = 'px-2 text-gray-500';
      paginationContainer.appendChild(dots);
    }
    
    const lastBtn = document.createElement('button');
    lastBtn.textContent = totalPages;
    lastBtn.className = `px-4 py-2 rounded-lg font-semibold transition-all ${totalPages === currentPage ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-indigo-600 hover:text-white'}`;
    lastBtn.addEventListener('click', () => {
      currentPage = totalPages;
      displayProducts();
      displayPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    paginationContainer.appendChild(lastBtn);
  }
  
  const nextBtn = document.createElement('button');
  nextBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
  nextBtn.className = `px-4 py-2 rounded-lg font-semibold transition-all ${currentPage === totalPages ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-50' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`;
  nextBtn.disabled = currentPage === totalPages;
  if (currentPage < totalPages) {
    nextBtn.addEventListener('click', () => {
      currentPage++;
      displayProducts();
      displayPagination();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
  paginationContainer.appendChild(nextBtn);
  
  const infoText = document.createElement('div');
  infoText.className = 'text-center text-sm text-gray-500 dark:text-gray-400 mt-4 w-full';
  const startItem = (currentPage - 1) * PRODUCTS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * PRODUCTS_PER_PAGE, filteredProducts.length);
  infoText.textContent = `Showing ${startItem} - ${endItem} of ${filteredProducts.length} products`;
  paginationContainer.appendChild(infoText);
  
  productsGrid.parentNode.appendChild(paginationContainer);
}

async function handleWishlistClick(e, product) {
  e.stopPropagation();
  if (!product || !product.id) return;
  
  const btn = e.currentTarget;
  const heartIcon = btn.querySelector('.heart-icon');
  const wasInWishlist = isInWishlist(product.id);

  await toggleWishlist(product);

  if (heartIcon) {
    if (!wasInWishlist) {
      heartIcon.classList.remove('text-gray-400', 'dark:text-gray-500');
      heartIcon.classList.add('text-red-500');
      heartIcon.innerHTML = '❤️';
    } else {
      heartIcon.classList.add('text-gray-400', 'dark:text-gray-500');
      heartIcon.classList.remove('text-red-500');
      heartIcon.innerHTML = '🤍';
    }
  }
}

async function handleAddToCartClick(e, product) {
  e.stopPropagation();
  
  if (!product || !product.id) {
    showToastMessage('Product data is invalid', 'error');
    return;
  }
  
  const btn = e.currentTarget;
  const originalText = btn.innerHTML;

  btn.innerHTML = `
    <svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  `;
  btn.disabled = true;

  const cartProduct = {
    id: product.id,
    title: product.name || product.title || 'Product',
    price: product.price || 0,
    image: product.image || product.thumbnail,
    brand: product.brand || 'PunnyCart',
    stock: product.stock || 0
  };
  
  const result = await addToCart(cartProduct, 1);

  if (result) {
    btn.innerHTML = '✓ Added';
    btn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
    btn.classList.add('bg-green-600', 'hover:bg-green-700');
  } else {
    btn.innerHTML = 'Failed';
    btn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
    btn.classList.add('bg-red-600', 'hover:bg-red-700');
  }

  setTimeout(() => {
    btn.innerHTML = 'Add to Cart';
    btn.classList.remove('bg-green-600', 'hover:bg-green-700', 'bg-red-600', 'hover:bg-red-700');
    btn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
    btn.disabled = false;
  }, 2000);
}

function displayProducts() {
  if (!productsGrid) return;

  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  if (currentProducts.length === 0) {
    productsGrid.innerHTML = `
      <div class="col-span-full text-center py-16">
        <i class="fas fa-search text-6xl text-gray-400 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No products found</h3>
        <p class="text-gray-500 dark:text-gray-400">Try adjusting your search or filter criteria</p>
      </div>
    `;
    return;
  }

  productsGrid.innerHTML = currentProducts.map(product => {
    const productName = product.name || product.title || 'Product';
    const productImage = product.image || product.thumbnail || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format';
    const productPrice = product.price || 0;
    const productRating = product.rating || 0;
    const productReviews = product.reviews || 0;
    const productBadge = product.badge;
    const productDiscount = product.discountPercentage;
    const productOriginalPrice = product.originalPrice;
    
    const badgeColor = productBadge === 'Best Seller' ? 'bg-yellow-400 text-gray-900' :
                        productBadge === 'New' ? 'bg-green-500 text-white' :
                        productBadge === 'Popular' ? 'bg-purple-500 text-white' :
                        productBadge === 'Trending' ? 'bg-blue-500 text-white' :
                        productBadge === 'Premium' ? 'bg-indigo-500 text-white' :
                        'bg-gray-500 text-white';

    const inWishlist = isInWishlist(product.id);
    const heartIcon = inWishlist ? '❤️' : '🤍';
    const heartColor = inWishlist ? 'text-red-500' : 'text-gray-400 dark:text-gray-500';
    const shortDescription = product.description?.length > 80 
      ? product.description.substring(0, 80) + '...' 
      : product.description || 'No description available';

    return `
      <div class="group bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative">
        <button onclick="event.stopPropagation()" 
                class="wishlist-btn absolute top-3 right-3 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:scale-110 transition-transform duration-300"
                data-product-id="${product.id}">
          <span class="heart-icon text-xl ${heartColor}">${heartIcon}</span>
        </button>
        
        <div onclick='openModal(${JSON.stringify(product).replace(/'/g, "\\'")})' class="cursor-pointer relative overflow-hidden h-48 sm:h-56 md:h-64">
          <img src="${productImage}" alt="${productName}"
               class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
               loading="lazy"
               onerror="this.src='https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format'">
          
          ${productDiscount ? `
            <div class="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded z-10">
              -${productDiscount}%
            </div>
          ` : ''}
          
          ${productBadge ? `
            <div class="absolute bottom-4 left-4 ${badgeColor} text-xs font-bold px-2 py-1 rounded z-10">
              ${productBadge}
            </div>
          ` : ''}
          
          ${productRating ? `
            <div class="absolute bottom-4 right-4 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1 z-10">
              <span>★</span>
              <span>${productRating}</span>
            </div>
          ` : ''}
        </div>

        <div onclick='openModal(${JSON.stringify(product).replace(/'/g, "\\'")})' class="p-4 cursor-pointer">
          <p class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">${product.category || 'General'}</p>
          <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">${productName}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">${shortDescription}</p>
          
          ${productRating ? `
            <div class="flex items-center gap-2 mb-3">
              <div class="flex text-yellow-400 text-sm">
                ${'★'.repeat(Math.floor(productRating))}${productRating % 1 >= 0.5 ? '½' : ''}${'☆'.repeat(5 - Math.ceil(productRating))}
              </div>
              <span class="text-xs text-gray-500 dark:text-gray-400">(${productReviews.toLocaleString()} reviews)</span>
            </div>
          ` : ''}

          <div class="flex items-center gap-2 mb-2">
            <span class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">$${productPrice.toFixed(2)}</span>
            ${productOriginalPrice ? `
              <span class="text-sm text-gray-500 line-through">$${productOriginalPrice.toFixed(2)}</span>
              <span class="text-xs text-green-600 dark:text-green-400 font-semibold">-${productDiscount}%</span>
            ` : ''}
          </div>
        </div>
        
        <div class="px-4 pb-4">
          <button class="add-to-cart-btn w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base"
                  data-product-id="${product.id}">
            <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Add to Cart
          </button>
        </div>
      </div>
    `;
  }).join('');

  document.querySelectorAll('.wishlist-btn').forEach(btn => {
    const productId = btn.dataset.productId;
    const product = filteredProducts.find(p => String(p.id) === String(productId));
    if (product) {
      btn.addEventListener('click', (e) => handleWishlistClick(e, product));
    }
  });

  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    const productId = btn.dataset.productId;
    const product = filteredProducts.find(p => String(p.id) === String(productId));
    if (product) {
      btn.addEventListener('click', (e) => handleAddToCartClick(e, product));
    }
  });
}

// Load products from Firebase (so admin added products appear)
async function loadProductsFromFirebase() {
  if (productsGrid) {
    productsGrid.innerHTML = `
      <div class="col-span-full text-center py-16">
        <div class="relative inline-flex items-center justify-center">
          <div class="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        </div>
        <p class="mt-6 text-gray-600 dark:text-gray-400 font-medium">Loading amazing products...</p>
      </div>
    `;
  }
  
  try {
    const productsRef = collection(db, 'products');
    const querySnapshot = await getDocs(productsRef);
    
    allProducts = [];
    querySnapshot.forEach(doc => {
      const data = doc.data();
      allProducts.push({ 
        id: doc.id, 
        ...data,
        name: data.name || data.title,
        title: data.title || data.name,
        image: data.image || data.thumbnail,
        thumbnail: data.thumbnail || data.image,
        price: data.price || 0,
        stock: data.stock || 0,
        rating: data.rating || 0,
        reviews: data.reviews || 0,
        category: data.category || 'General'
      });
    });
    
    console.log(`✅ Loaded ${allProducts.length} products from Firebase`);
    filterAndSearch();
    
  } catch (error) {
    console.error('Error loading products:', error);
    if (productsGrid) {
      productsGrid.innerHTML = `
        <div class="col-span-full text-center py-16">
          <i class="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
          <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Error loading products</h3>
          <p class="text-gray-500 dark:text-gray-400">Please try again later</p>
        </div>
      `;
    }
  }
}

// Filter button event listeners
if (filterAll) filterAll.addEventListener('click', () => { setActiveFilter(filterAll); filterProducts('All'); });
if (filterElectronics) filterElectronics.addEventListener('click', () => { setActiveFilter(filterElectronics); filterProducts('Electronics'); });
if (filterFashion) filterFashion.addEventListener('click', () => { setActiveFilter(filterFashion); filterProducts('Fashion'); });
if (filterHome) filterHome.addEventListener('click', () => { setActiveFilter(filterHome); filterProducts('Home'); });
if (filterAccessories) filterAccessories.addEventListener('click', () => { setActiveFilter(filterAccessories); filterProducts('Accessories'); });
if (filterAudio) filterAudio.addEventListener('click', () => { setActiveFilter(filterAudio); filterProducts('Audio'); });

if (sortSelect) {
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    sortProducts();
    currentPage = 1;
    displayProducts();
    displayPagination();
  });
}

if (searchInput) searchInput.addEventListener('input', handleSearch);

window.decrementQuantity = function () {
  const quantityEl = document.getElementById('quantity');
  if (!quantityEl) return;
  let quantity = parseInt(quantityEl.textContent);
  if (quantity > 1) quantityEl.textContent = quantity - 1;
};

window.incrementQuantity = function () {
  const quantityEl = document.getElementById('quantity');
  if (!quantityEl) return;
  let quantity = parseInt(quantityEl.textContent);
  if (quantity < 10) quantityEl.textContent = quantity + 1;
};

window.addToCartFromModal = function () {
  if (!window.currentProduct) return;
  const quantity = parseInt(document.getElementById('quantity').textContent);
  addToCart(window.currentProduct, quantity);
  closeModal();
};

function getCategoryFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('category');
}

// Initialize shop
document.addEventListener('DOMContentLoaded', async () => {
  await loadProductsFromFirebase();
  
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      await loadUserWishlist(user.uid);
      displayProducts(); // Refresh to show wishlist hearts
    }
    updateCartCount();
  });
  
  const category = getCategoryFromUrl();
  if (category) {
    const categoryMap = {
      'Electronics': filterElectronics,
      'Fashion': filterFashion,
      'Home': filterHome,
      'Accessories': filterAccessories,
      'Audio': filterAudio
    };
    const filterBtn = categoryMap[category];
    if (filterBtn) {
      setActiveFilter(filterBtn);
      filterProducts(category);
    }
  }
  
  window.openModal = openModal;
  window.closeModal = closeModal;
});