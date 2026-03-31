
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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
const ADMIN_EMAILS = ['abdulwarisabdullahi52@gmail.com', 'yxngalhaji02@gmail.com'];

const darkToggle = document.getElementById('darkToggle');
const themeIcon = document.getElementById('themeIcon');
function applyDark(on) {
    document.documentElement.classList.toggle('dark', on);
    themeIcon.className = on ? 'fas fa-sun text-sm' : 'fas fa-moon text-sm';
    localStorage.setItem('darkMode', on);
}
applyDark(localStorage.getItem('darkMode') === 'true');
darkToggle.addEventListener('click', () => applyDark(!document.documentElement.classList.contains('dark')));
window.openSidebar = () => { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').style.display = 'block'; };
window.closeSidebar = () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').style.display = 'none'; };

let allCoupons = [];
let currentStatusFilter = 'all';
let currentTypeFilter = 'all';
let currentSearch = '';

function updateStats() {
    const total = allCoupons.length;
    const now = new Date();
    const active = allCoupons.filter(c => new Date(c.expiryDate) > now && c.status !== 'expired').length;
    const expired = allCoupons.filter(c => new Date(c.expiryDate) <= now || c.status === 'expired').length;
    const totalUsed = allCoupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

    document.getElementById('totalCoupons').textContent = total;
    document.getElementById('activeCoupons').textContent = active;
    document.getElementById('expiredCoupons').textContent = expired;
    document.getElementById('totalUsed').textContent = totalUsed.toLocaleString();
}

function filterCoupons() {
    let filtered = [...allCoupons];
    const now = new Date();

    if (currentStatusFilter !== 'all') {
        if (currentStatusFilter === 'active') {
            filtered = filtered.filter(c => new Date(c.expiryDate) > now && c.status !== 'expired');
        } else if (currentStatusFilter === 'expired') {
            filtered = filtered.filter(c => new Date(c.expiryDate) <= now || c.status === 'expired');
        }
    }

    if (currentTypeFilter !== 'all') {
        filtered = filtered.filter(c => c.discountType === currentTypeFilter);
    }

    if (currentSearch.trim() !== '') {
        const searchTerm = currentSearch.toLowerCase();
        filtered = filtered.filter(c => c.code?.toLowerCase().includes(searchTerm));
    }

    return filtered;
}

function getDiscountIcon(type) {
    return type === 'percentage' ? '<i class="fas fa-percent text-xs"></i>' : '<i class="fas fa-dollar-sign text-xs"></i>';
}

function renderCoupons(coupons) {
    const grid = document.getElementById('couponsGrid');
    document.getElementById('couponCount').textContent = coupons.length;

    if (!coupons.length) {
        grid.innerHTML = `
      <div class="col-span-full text-center py-16">
        <i class="fas fa-tag text-6xl text-gray-400 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No coupons found</h3>
        <p class="text-gray-500 dark:text-gray-400">Click "Create Coupon" to add your first discount code</p>
      </div>
    `;
        return;
    }

    grid.innerHTML = coupons.map(coupon => {
        const now = new Date();
        const expiryDate = new Date(coupon.expiryDate);
        const isActive = expiryDate > now && coupon.status !== 'expired';
        const statusColor = isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
        const statusText = isActive ? 'Active' : 'Expired';
        const discountValue = coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `$${coupon.discountValue}`;
        const usedCount = coupon.usedCount || 0;
        const usageLeft = coupon.usageLimit ? coupon.usageLimit - usedCount : 'Unlimited';

        return `
      <div class="coupon-card bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-all">
        <div class="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              ${getDiscountIcon(coupon.discountType)}
              <span class="text-white font-mono font-bold text-lg tracking-wider">${coupon.code}</span>
            </div>
            <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${statusColor}">${statusText}</span>
          </div>
        </div>
        <div class="p-4 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">${discountValue} OFF</span>
            ${coupon.minPurchase ? `<span class="text-xs text-gray-500">Min: $${coupon.minPurchase}</span>` : ''}
          </div>
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="flex items-center gap-1 text-gray-500"><i class="fas fa-calendar-alt w-3"></i> Expires: ${expiryDate.toLocaleDateString()}</div>
            <div class="flex items-center gap-1 text-gray-500"><i class="fas fa-chart-simple w-3"></i> Used: ${usedCount}</div>
            <div class="flex items-center gap-1 text-gray-500"><i class="fas fa-infinity w-3"></i> Remaining: ${usageLeft}</div>
            ${coupon.description ? `<div class="col-span-2 flex items-center gap-1 text-gray-400 text-xs"><i class="fas fa-align-left w-3"></i> ${coupon.description}</div>` : ''}
          </div>
          <div class="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <button onclick="window.editCoupon('${coupon.id}')" class="flex-1 px-3 py-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors text-sm">
              <i class="fas fa-edit mr-1"></i> Edit
            </button>
            <button onclick="window.deleteCoupon('${coupon.id}')" class="flex-1 px-3 py-1.5 rounded-lg text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-sm">
              <i class="fas fa-trash mr-1"></i> Delete
            </button>
          </div>
        </div>
      </div>
    `;
    }).join('');
}

async function loadCoupons() {
    document.getElementById('couponsGrid').innerHTML = `
    <div class="col-span-full text-center py-16">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
      <p class="mt-4 text-gray-600 dark:text-gray-400">Loading coupons...</p>
    </div>
  `;

    try {
        const couponsRef = collection(db, 'coupons');
        const querySnapshot = await getDocs(couponsRef);

        allCoupons = [];
        querySnapshot.forEach(doc => {
            allCoupons.push({ id: doc.id, ...doc.data() });
        });

        // Sort by expiry date (nearest first)
        allCoupons.sort((a, b) => new Date(a.expiryDate) - new Date(b.expiryDate));

        updateStats();
        const filtered = filterCoupons();
        renderCoupons(filtered);
    } catch (error) {
        console.error('Error loading coupons:', error);
        document.getElementById('couponsGrid').innerHTML = `
      <div class="col-span-full text-center py-16">
        <i class="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Error loading coupons</h3>
        <p class="text-gray-500 dark:text-gray-400">${error.message}</p>
      </div>
    `;
    }
}

window.addCoupon = async function () {
    const { value: v } = await Swal.fire({
        title: 'Create New Coupon',
        html: `
      <input id="cCode" class="swal2-input" placeholder="Coupon Code (e.g., SAVE20)" required>
      <select id="cType" class="swal2-select" style="width:100%;margin-bottom:1rem;padding:0.75rem">
        <option value="percentage">Percentage (%)</option>
        <option value="fixed">Fixed Amount ($)</option>
      </select>
      <input id="cValue" class="swal2-input" type="number" placeholder="Discount Value" step="0.01" required>
      <input id="cMin" class="swal2-input" type="number" placeholder="Minimum Purchase (optional)" step="0.01">
      <input id="cExpiry" class="swal2-input" type="date" placeholder="Expiry Date" required>
      <input id="cLimit" class="swal2-input" type="number" placeholder="Usage Limit (optional, leave blank for unlimited)">
      <textarea id="cDesc" class="swal2-textarea" placeholder="Description (optional)"></textarea>
      <p class="text-xs text-gray-500 mt-2">Tip: Use uppercase letters for coupon codes (e.g., SUMMER25)</p>`,
        focusConfirm: false,
        confirmButtonColor: '#4f46e5',
        preConfirm: () => {
            const code = document.getElementById('cCode').value.toUpperCase().trim();
            const discountType = document.getElementById('cType').value;
            const discountValue = parseFloat(document.getElementById('cValue').value);
            const minPurchase = document.getElementById('cMin').value ? parseFloat(document.getElementById('cMin').value) : null;
            const expiryDate = document.getElementById('cExpiry').value;
            const usageLimit = document.getElementById('cLimit').value ? parseInt(document.getElementById('cLimit').value) : null;
            const description = document.getElementById('cDesc').value;

            if (!code) Swal.showValidationMessage('Coupon code required');
            if (!discountValue) Swal.showValidationMessage('Discount value required');
            if (!expiryDate) Swal.showValidationMessage('Expiry date required');
            if (discountValue <= 0) Swal.showValidationMessage('Discount value must be greater than 0');
            if (discountType === 'percentage' && discountValue > 100) Swal.showValidationMessage('Percentage cannot exceed 100%');

            return { code, discountType, discountValue, minPurchase, expiryDate, usageLimit, description };
        }
    });

    if (v) {
        Swal.fire({ title: 'Creating coupon...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        await addDoc(collection(db, 'coupons'), {
            code: v.code,
            discountType: v.discountType,
            discountValue: v.discountValue,
            minPurchase: v.minPurchase,
            expiryDate: v.expiryDate,
            usageLimit: v.usageLimit,
            description: v.description,
            usedCount: 0,
            status: 'active',
            createdAt: new Date().toISOString()
        });

        Swal.fire({ icon: 'success', title: 'Coupon created!', timer: 1800, showConfirmButton: false });
        loadCoupons();
    }
};

window.editCoupon = async function (id) {
    const coupon = allCoupons.find(c => c.id === id);
    if (!coupon) return;

    const { value: v } = await Swal.fire({
        title: 'Edit Coupon',
        html: `
      <input id="cCode" class="swal2-input" placeholder="Coupon Code" value="${coupon.code}" required>
      <select id="cType" class="swal2-select" style="width:100%;margin-bottom:1rem;padding:0.75rem">
        <option value="percentage" ${coupon.discountType === 'percentage' ? 'selected' : ''}>Percentage (%)</option>
        <option value="fixed" ${coupon.discountType === 'fixed' ? 'selected' : ''}>Fixed Amount ($)</option>
      </select>
      <input id="cValue" class="swal2-input" type="number" placeholder="Discount Value" step="0.01" value="${coupon.discountValue}" required>
      <input id="cMin" class="swal2-input" type="number" placeholder="Minimum Purchase" step="0.01" value="${coupon.minPurchase || ''}">
      <input id="cExpiry" class="swal2-input" type="date" placeholder="Expiry Date" value="${coupon.expiryDate}" required>
      <input id="cLimit" class="swal2-input" type="number" placeholder="Usage Limit" value="${coupon.usageLimit || ''}">
      <textarea id="cDesc" class="swal2-textarea" placeholder="Description">${coupon.description || ''}</textarea>
      <select id="cStatus" class="swal2-select" style="width:100%;margin-top:1rem;padding:0.75rem">
        <option value="active" ${coupon.status === 'active' ? 'selected' : ''}>Active</option>
        <option value="expired" ${coupon.status === 'expired' ? 'selected' : ''}>Expired</option>
      </select>`,
        focusConfirm: false,
        confirmButtonColor: '#4f46e5',
        preConfirm: () => {
            const code = document.getElementById('cCode').value.toUpperCase().trim();
            const discountType = document.getElementById('cType').value;
            const discountValue = parseFloat(document.getElementById('cValue').value);
            const minPurchase = document.getElementById('cMin').value ? parseFloat(document.getElementById('cMin').value) : null;
            const expiryDate = document.getElementById('cExpiry').value;
            const usageLimit = document.getElementById('cLimit').value ? parseInt(document.getElementById('cLimit').value) : null;
            const description = document.getElementById('cDesc').value;
            const status = document.getElementById('cStatus').value;

            if (!code) Swal.showValidationMessage('Coupon code required');
            if (!discountValue) Swal.showValidationMessage('Discount value required');
            if (!expiryDate) Swal.showValidationMessage('Expiry date required');
            if (discountValue <= 0) Swal.showValidationMessage('Discount value must be greater than 0');

            return { code, discountType, discountValue, minPurchase, expiryDate, usageLimit, description, status };
        }
    });

    if (v) {
        Swal.fire({ title: 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        await updateDoc(doc(db, 'coupons', id), {
            code: v.code,
            discountType: v.discountType,
            discountValue: v.discountValue,
            minPurchase: v.minPurchase,
            expiryDate: v.expiryDate,
            usageLimit: v.usageLimit,
            description: v.description,
            status: v.status,
            updatedAt: new Date().toISOString()
        });

        Swal.fire({ icon: 'success', title: 'Coupon updated!', timer: 1800, showConfirmButton: false });
        loadCoupons();
    }
};

window.deleteCoupon = async function (id) {
    const { isConfirmed } = await Swal.fire({
        title: 'Delete Coupon?',
        text: 'This action cannot be undone. Customers with this coupon will no longer be able to use it.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Yes, delete'
    });

    if (isConfirmed) {
        await deleteDoc(doc(db, 'coupons', id));
        Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
        loadCoupons();
    }
};

// Filter event listeners
document.getElementById('searchInput')?.addEventListener('input', e => {
    currentSearch = e.target.value;
    renderCoupons(filterCoupons());
});

document.getElementById('statusFilter')?.addEventListener('change', e => {
    currentStatusFilter = e.target.value;
    renderCoupons(filterCoupons());
});

document.getElementById('typeFilter')?.addEventListener('change', e => {
    currentTypeFilter = e.target.value;
    renderCoupons(filterCoupons());
});

document.getElementById('addCouponBtn')?.addEventListener('click', () => window.addCoupon());

onAuthStateChanged(auth, async user => {
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
        window.location.href = '../login.html';
        return;
    }
    document.getElementById('adminName').textContent = user.displayName || user.email.split('@')[0];
    document.getElementById('adminEmail').textContent = user.email;
    await loadCoupons();
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../login.html';
});
