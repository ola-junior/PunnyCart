import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

const firebaseConfig = { apiKey: "AIzaSyDlkoedJh9k940IofE8VKJ9-fT8Gz7WvoI", authDomain: "e-commerce-29a73.firebaseapp.com", projectId: "e-commerce-29a73", storageBucket: "e-commerce-29a73.firebasestorage.app", messagingSenderId: "870933397259", appId: "1:870933397259:web:7a0d6f50a6a11f92b66c0e" };
const app = initializeApp(firebaseConfig), auth = getAuth(app), db = getFirestore(app), storage = getStorage(app);
const ADMIN_EMAILS = ['abdulwarisabdullahi52@gmail.com', 'yxngalhaji02@gmail.com'];

const darkToggle = document.getElementById('darkToggle'), themeIcon = document.getElementById('themeIcon');
function applyDark(on) { document.documentElement.classList.toggle('dark', on); themeIcon.className = on ? 'fas fa-sun text-sm' : 'fas fa-moon text-sm'; localStorage.setItem('darkMode', on); }
applyDark(localStorage.getItem('darkMode') === 'true');
darkToggle.addEventListener('click', () => applyDark(!document.documentElement.classList.contains('dark')));
window.openSidebar = () => { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').style.display = 'block'; };
window.closeSidebar = () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').style.display = 'none'; };

let allProducts = [];
let currentCategoryFilter = 'all';
let currentStockFilter = 'all';

function updateStats() {
  const total = allProducts.length;
  const categories = new Set(allProducts.map(p => p.p.category).filter(Boolean));
  const lowStock = allProducts.filter(p => p.p.stock > 0 && p.p.stock <= 10).length;
  const totalValue = allProducts.reduce((sum, p) => sum + (p.p.price || 0) * (p.p.stock || 0), 0);

  document.getElementById('totalProducts').textContent = total;
  document.getElementById('totalCategories').textContent = categories.size;
  document.getElementById('lowStockCount').textContent = lowStock;
  document.getElementById('totalValue').textContent = '$' + totalValue.toFixed(2);
}

function stockBadge(stock) {
  if (stock > 10) return `<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">${stock} in stock</span>`;
  if (stock > 0) return `<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">${stock} left (low)</span>`;
  return `<span class="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Out of stock</span>`;
}

function filterProducts() {
  let filtered = [...allProducts];

  if (currentCategoryFilter !== 'all') {
    filtered = filtered.filter(({ p }) => p.category === currentCategoryFilter);
  }

  if (currentStockFilter !== 'all') {
    if (currentStockFilter === 'instock') {
      filtered = filtered.filter(({ p }) => p.stock > 10);
    } else if (currentStockFilter === 'lowstock') {
      filtered = filtered.filter(({ p }) => p.stock > 0 && p.stock <= 10);
    } else if (currentStockFilter === 'outofstock') {
      filtered = filtered.filter(({ p }) => p.stock === 0);
    }
  }

  return filtered;
}

function renderProducts(products) {
  const tbody = document.getElementById('productsTable');
  document.getElementById('productCount').textContent = products.length;
  if (!products.length) { tbody.innerHTML = `<tr><td colspan="5" class="text-center py-12 text-gray-400"><i class="fas fa-box-open text-3xl mb-2 block"></i>No products found</td></tr>`; return; }
  tbody.innerHTML = products.map(({ id, p }) => `
    <tr class="prod-row">
      <td class="px-4 sm:px-6 py-3">
        <div class="flex items-center gap-3">
          <img src="${p.image || 'https://via.placeholder.com/40'}" alt="${p.name}" class="w-10 h-10 rounded-xl object-cover border border-gray-100 dark:border-gray-700" onerror="this.src='https://via.placeholder.com/40'"/>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-gray-800 dark:text-white truncate max-w-[140px] sm:max-w-xs">${p.name}</p>
            <p class="text-[11px] text-gray-400 truncate max-w-[140px] sm:max-w-xs">${p.description?.substring(0, 60) || ''}${p.description?.length > 60 ? '...' : ''}</p>
          </div>
        </div>
       </td>
      <td class="px-4 sm:px-6 py-3"><span class="text-xs font-medium text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-lg">${p.category || 'Uncategorized'}</span></td>
      <td class="px-4 sm:px-6 py-3 text-sm font-bold text-indigo-600 dark:text-indigo-400">$${parseFloat(p.price || 0).toFixed(2)}</td>
      <td class="px-4 sm:px-6 py-3">${stockBadge(p.stock || 0)}</td>
      <td class="px-4 sm:px-6 py-3 text-right">
        <button onclick="window.editProduct('${id}')" class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors mr-1"><i class="fas fa-edit text-sm"></i></button>
        <button onclick="window.deleteProduct('${id}')" class="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"><i class="fas fa-trash text-sm"></i></button>
      </td>
    </tr>`).join('');
}

async function loadProducts() {
  document.getElementById('productsTable').innerHTML = `<tr><td colspan="5" class="py-8 text-center"><div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>`;
  try {
    const snap = await getDocs(collection(db, 'products'));
    allProducts = snap.docs.map(d => ({ id: d.id, p: d.data() }));
    updateStats();
    const filtered = filterProducts();
    renderProducts(filtered);
  } catch (e) { document.getElementById('productsTable').innerHTML = `<tr><td colspan="5" class="text-center py-8 text-red-400">${e.message}</td></tr>`; }
}

document.getElementById('searchInput')?.addEventListener('input', e => {
  const q = e.target.value.toLowerCase();
  let filtered = filterProducts();
  if (q) {
    filtered = filtered.filter(({ p }) => p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
  }
  renderProducts(filtered);
});

document.getElementById('categoryFilter')?.addEventListener('change', e => {
  currentCategoryFilter = e.target.value;
  const searchValue = document.getElementById('searchInput').value.toLowerCase();
  let filtered = filterProducts();
  if (searchValue) {
    filtered = filtered.filter(({ p }) => p.name?.toLowerCase().includes(searchValue) || p.category?.toLowerCase().includes(searchValue));
  }
  renderProducts(filtered);
});

document.getElementById('stockFilter')?.addEventListener('change', e => {
  currentStockFilter = e.target.value;
  const searchValue = document.getElementById('searchInput').value.toLowerCase();
  let filtered = filterProducts();
  if (searchValue) {
    filtered = filtered.filter(({ p }) => p.name?.toLowerCase().includes(searchValue) || p.category?.toLowerCase().includes(searchValue));
  }
  renderProducts(filtered);
});

window.addProduct = async function () {
  const { value: v } = await Swal.fire({
    title: 'Add New Product',
    html: `
      <input id="pName" class="swal2-input" placeholder="Product Name" required>
      <input id="pPrice" class="swal2-input" type="number" placeholder="Price" step="0.01" required>
      <input id="pOriginalPrice" class="swal2-input" type="number" placeholder="Original Price" step="0.01">
      <input id="pDiscount" class="swal2-input" type="number" placeholder="Discount Percentage (optional)">
      <input id="pStock" class="swal2-input" type="number" placeholder="Stock" required>
      <select id="pCat" class="swal2-select" style="width:100%;margin-bottom:1rem;padding:0.75rem">
        <option value="">Select Category</option>
        <option value="Electronics">Electronics</option>
        <option value="Fashion">Fashion</option>
        <option value="Home">Home</option>
        <option value="Accessories">Accessories</option>
        <option value="Audio">Audio</option>
        <option value="Beauty">Beauty</option>
        <option value="Sports">Sports</option>
      </select>
      <input id="pRating" class="swal2-input" type="number" placeholder="Rating (e.g., 4.8)" step="0.1">
      <input id="pReviews" class="swal2-input" type="number" placeholder="Number of Reviews">
      <input id="pBadge" class="swal2-input" placeholder="Badge (e.g., Best Seller, New, Premium)">
      <input id="pBrand" class="swal2-input" placeholder="Brand">
      <textarea id="pDesc" class="swal2-textarea" placeholder="Description"></textarea>
      <input id="pImageUrl" class="swal2-input" type="url" placeholder="Image URL" value="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format">
      <input id="pColors" class="swal2-input" placeholder="Colors (comma separated, e.g., Black, White, Blue)">
      <input id="pFeatures" class="swal2-input" placeholder="Features (comma separated)">
      <p class="text-xs text-gray-500 mt-1">Optional fields can be left blank</p>`,
    focusConfirm: false,
    confirmButtonColor: '#4f46e5',
    preConfirm: () => {
      const name = document.getElementById('pName').value;
      const price = parseFloat(document.getElementById('pPrice').value);
      const originalPrice = parseFloat(document.getElementById('pOriginalPrice').value) || null;
      const discountPercentage = parseInt(document.getElementById('pDiscount').value) || null;
      const stock = parseInt(document.getElementById('pStock').value);
      const category = document.getElementById('pCat').value;
      const rating = parseFloat(document.getElementById('pRating').value) || 4.5;
      const reviews = parseInt(document.getElementById('pReviews').value) || 0;
      const badge = document.getElementById('pBadge').value || null;
      const brand = document.getElementById('pBrand').value || 'PunnyCart';
      const description = document.getElementById('pDesc').value;
      const imageUrl = document.getElementById('pImageUrl').value;
      const colorsInput = document.getElementById('pColors').value;
      const colors = colorsInput ? colorsInput.split(',').map(c => c.trim()) : ['Black', 'White'];
      const featuresInput = document.getElementById('pFeatures').value;
      const features = featuresInput ? featuresInput.split(',').map(f => f.trim()) : ['Premium Quality', 'Fast Delivery'];

      if (!name) Swal.showValidationMessage('Product name required');
      if (!price) Swal.showValidationMessage('Price required');
      if (isNaN(stock)) Swal.showValidationMessage('Stock required');
      if (!category) Swal.showValidationMessage('Category required');
      if (!imageUrl) Swal.showValidationMessage('Image URL required');

      return {
        name, price, originalPrice, discountPercentage, stock, category,
        rating, reviews, badge, brand, description, imageUrl, colors, features
      };
    }
  });

  if (v) {
    Swal.fire({ title: 'Saving…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    await addDoc(collection(db, 'products'), {
      name: v.name,
      price: v.price,
      originalPrice: v.originalPrice,
      discountPercentage: v.discountPercentage,
      stock: v.stock,
      category: v.category,
      rating: v.rating,
      reviews: v.reviews,
      badge: v.badge,
      brand: v.brand,
      description: v.description,
      image: v.imageUrl,
      colors: v.colors,
      features: v.features,
      createdAt: new Date().toISOString()
    });

    Swal.fire({ icon: 'success', title: 'Product added!', timer: 1800, showConfirmButton: false });
    loadProducts();
  }
};

window.editProduct = async function (id) {
  const product = allProducts.find(p => p.id === id);
  if (!product) return;

  const { value: v } = await Swal.fire({
    title: 'Edit Product',
    html: `
      <input id="pName" class="swal2-input" placeholder="Product Name" value="${product.p.name}">
      <input id="pPrice" class="swal2-input" type="number" placeholder="Price" step="0.01" value="${product.p.price}">
      <input id="pOriginalPrice" class="swal2-input" type="number" placeholder="Original Price" step="0.01" value="${product.p.originalPrice || ''}">
      <input id="pDiscount" class="swal2-input" type="number" placeholder="Discount Percentage" value="${product.p.discountPercentage || ''}">
      <input id="pStock" class="swal2-input" type="number" placeholder="Stock" value="${product.p.stock}">
      <select id="pCat" class="swal2-select" style="width:100%;margin-bottom:1rem;padding:0.75rem">
        <option value="Electronics" ${product.p.category === 'Electronics' ? 'selected' : ''}>Electronics</option>
        <option value="Fashion" ${product.p.category === 'Fashion' ? 'selected' : ''}>Fashion</option>
        <option value="Home" ${product.p.category === 'Home' ? 'selected' : ''}>Home</option>
        <option value="Accessories" ${product.p.category === 'Accessories' ? 'selected' : ''}>Accessories</option>
        <option value="Audio" ${product.p.category === 'Audio' ? 'selected' : ''}>Audio</option>
        <option value="Beauty" ${product.p.category === 'Beauty' ? 'selected' : ''}>Beauty</option>
        <option value="Sports" ${product.p.category === 'Sports' ? 'selected' : ''}>Sports</option>
      </select>
      <input id="pRating" class="swal2-input" type="number" placeholder="Rating (e.g., 4.8)" step="0.1" value="${product.p.rating || ''}">
      <input id="pReviews" class="swal2-input" type="number" placeholder="Number of Reviews" value="${product.p.reviews || ''}">
      <input id="pBadge" class="swal2-input" placeholder="Badge (e.g., Best Seller, New, Premium)" value="${product.p.badge || ''}">
      <input id="pBrand" class="swal2-input" placeholder="Brand" value="${product.p.brand || ''}">
      <textarea id="pDesc" class="swal2-textarea" placeholder="Description">${product.p.description || ''}</textarea>
      <input id="pImageUrl" class="swal2-input" type="url" placeholder="Image URL" value="${product.p.image || ''}">
      <input id="pColors" class="swal2-input" placeholder="Colors (comma separated)" value="${product.p.colors ? product.p.colors.join(', ') : ''}">
      <input id="pFeatures" class="swal2-input" placeholder="Features (comma separated)" value="${product.p.features ? product.p.features.join(', ') : ''}">
      <p class="text-xs text-gray-500 mt-1">Optional fields can be left blank</p>`,
    focusConfirm: false,
    confirmButtonColor: '#4f46e5',
    preConfirm: () => {
      const name = document.getElementById('pName').value;
      const price = parseFloat(document.getElementById('pPrice').value);
      const originalPrice = parseFloat(document.getElementById('pOriginalPrice').value) || null;
      const discountPercentage = parseInt(document.getElementById('pDiscount').value) || null;
      const stock = parseInt(document.getElementById('pStock').value);
      const category = document.getElementById('pCat').value;
      const rating = parseFloat(document.getElementById('pRating').value) || null;
      const reviews = parseInt(document.getElementById('pReviews').value) || null;
      const badge = document.getElementById('pBadge').value || null;
      const brand = document.getElementById('pBrand').value || null;
      const description = document.getElementById('pDesc').value;
      const imageUrl = document.getElementById('pImageUrl').value;
      const colorsInput = document.getElementById('pColors').value;
      const colors = colorsInput ? colorsInput.split(',').map(c => c.trim()) : null;
      const featuresInput = document.getElementById('pFeatures').value;
      const features = featuresInput ? featuresInput.split(',').map(f => f.trim()) : null;

      if (!name) Swal.showValidationMessage('Product name required');
      if (!price) Swal.showValidationMessage('Price required');
      if (isNaN(stock)) Swal.showValidationMessage('Stock required');
      if (!category) Swal.showValidationMessage('Category required');
      if (!imageUrl) Swal.showValidationMessage('Image URL required');

      return {
        name, price, originalPrice, discountPercentage, stock, category,
        rating, reviews, badge, brand, description, imageUrl, colors, features
      };
    }
  });

  if (v) {
    Swal.fire({ title: 'Updating…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    await updateDoc(doc(db, 'products', id), {
      name: v.name,
      price: v.price,
      originalPrice: v.originalPrice,
      discountPercentage: v.discountPercentage,
      stock: v.stock,
      category: v.category,
      rating: v.rating,
      reviews: v.reviews,
      badge: v.badge,
      brand: v.brand,
      description: v.description,
      image: v.imageUrl,
      colors: v.colors,
      features: v.features,
      updatedAt: new Date().toISOString()
    });

    Swal.fire({ icon: 'success', title: 'Product updated!', timer: 1800, showConfirmButton: false });
    loadProducts();
  }
};

window.deleteProduct = async function (id) {
  const { isConfirmed } = await Swal.fire({
    title: 'Delete Product?',
    text: 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    confirmButtonText: 'Yes, delete'
  });
  if (isConfirmed) {
    await deleteDoc(doc(db, 'products', id));
    Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
    loadProducts();
  }
};

document.getElementById('addProductBtn')?.addEventListener('click', () => window.addProduct());

onAuthStateChanged(auth, async user => {
  if (!user || !ADMIN_EMAILS.includes(user.email)) { window.location.href = '../login.html'; return; }
  document.getElementById('adminName').textContent = user.displayName || user.email.split('@')[0];
  document.getElementById('adminEmail').textContent = user.email;
  await loadProducts();
});
document.getElementById('logoutBtn')?.addEventListener('click', async () => { await signOut(auth); window.location.href = '../login.html'; });
