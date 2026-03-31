import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, getDocs, doc, updateDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Dark mode
const darkToggle = document.getElementById('darkToggle');
const themeIcon = document.getElementById('themeIcon');
function applyDark(on) {
    document.documentElement.classList.toggle('dark', on);
    themeIcon.className = on ? 'fas fa-sun text-sm' : 'fas fa-moon text-sm';
    localStorage.setItem('darkMode', on);
}
applyDark(localStorage.getItem('darkMode') === 'true');
darkToggle.addEventListener('click', () => applyDark(!document.documentElement.classList.contains('dark')));

// Sidebar
window.openSidebar = () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').style.display = 'block';
};
window.closeSidebar = () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').style.display = 'none';
};

// Remove loading overlay immediately
const loadingOverlay = document.getElementById('loadingOverlay');
if (loadingOverlay) {
    loadingOverlay.remove();
}

// Helpers
const getName = o => o.fullName || o.shippingAddress?.fullName || o.name || o.customerName || (o.email ? o.email.split('@')[0] : 'N/A');
const getEmail = o => o.email || o.userEmail || o.customerEmail || o.shippingAddress?.email || 'N/A';
const getPhone = o => o.phone || o.shippingAddress?.phone || 'N/A';
const getAddr = o => {
    if (!o.shippingAddress) return 'N/A';
    const a = o.shippingAddress;
    return [a.line1 || a.address || '', a.line2, a.city, a.state, a.zip, a.country].filter(Boolean).join(', ');
};

function statusClasses(status) {
    const map = {
        delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        shipping: 'bg-purple-100 text-purple-700',
        cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    return map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
}

let allOrders = [], currentFilter = 'All';

function updateStats() {
    const s = k => allOrders.filter(o => o.status?.toLowerCase() === k).length;
    document.getElementById('totalOrders').textContent = allOrders.length;
    document.getElementById('pendingOrders').textContent = s('pending');
    document.getElementById('processingOrders').textContent = s('processing');
    document.getElementById('shippingOrders').textContent = allOrders.filter(o => ['shipped', 'shipping'].includes(o.status?.toLowerCase())).length;
    document.getElementById('deliveredOrders').textContent = s('delivered');
    document.getElementById('cancelledOrders').textContent = s('cancelled');
}

function renderOrders(orders) {
    const list = document.getElementById('ordersList');
    if (!orders.length) {
        list.innerHTML = `<div class="text-center py-16 text-gray-400"><i class="fas fa-inbox text-4xl mb-3 block"></i>No orders found</div>`;
        return;
    }
    list.innerHTML = orders.map(order => {
        const items = order.items || [];
        const total = order.total || items.reduce((s, i) => s + (i.price || 0) * (i.quantity || 1), 0);
        const date = new Date(order.orderDate || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const sc = statusClasses(order.status);
        return `
        <div class="order-card bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
                <div class="flex items-center gap-2 min-w-0 flex-wrap">
                    <span class="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">#${order.id.slice(-8).toUpperCase()}</span>
                    <span class="text-gray-300 dark:text-gray-600">·</span>
                    <span class="text-xs text-gray-500">${getName(order)}</span>
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400">${date}</span>
                    <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${sc}">${order.status || 'Pending'}</span>
                </div>
            </div>
            <div class="p-4 sm:p-5">
                <div class="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                    <span><i class="fas fa-envelope mr-1 text-gray-400"></i>${getEmail(order)}</span>
                    ${getPhone(order) !== 'N/A' ? `<span><i class="fas fa-phone mr-1 text-gray-400"></i>${getPhone(order)}</span>` : ''}
                    <span class="break-all"><i class="fas fa-map-marker-alt mr-1 text-gray-400"></i>${getAddr(order)}</span>
                </div>
                <div class="space-y-2 mb-4 max-h-36 overflow-y-auto pr-1">
                    ${items.map(item => {
                        const name = item.title || item.name || item.productName || 'Product';
                        const qty = item.quantity || 1;
                        const price = item.price || 0;
                        const img = item.image || item.images?.[0] || item.imageUrl || 'https://via.placeholder.com/36';
                        return `
                        <div class="flex items-center gap-3">
                            <img src="${img}" alt="${name}" class="w-9 h-9 rounded-lg object-cover border border-gray-100 dark:border-gray-700 flex-shrink-0" onerror="this.src='https://via.placeholder.com/36'">
                            <div class="flex-1 min-w-0">
                                <p class="text-xs font-medium text-gray-700 dark:text-gray-200 truncate">${name}</p>
                                <p class="text-[11px] text-gray-400">x${qty} · $${price.toFixed(2)} each</p>
                            </div>
                            <span class="text-xs font-bold text-gray-700 dark:text-gray-200 ml-2">$${(price * qty).toFixed(2)}</span>
                        </div>`;
                    }).join('')}
                </div>
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <span class="text-base font-bold text-indigo-600 dark:text-indigo-400">Total: $${total.toFixed(2)}</span>
                    <div class="flex flex-wrap items-center gap-2">
                        <select onchange="window.updateOrderStatus('${order.id}',this.value)" class="px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <option value="">Update Status</option>
                            ${['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(s => `<option value="${s}" ${order.status === s ? 'selected' : ''}>${s}</option>`).join('')}
                        </select>
                        <button onclick="window.viewOrderDetails('${order.id}')" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap">
                            <i class="fas fa-eye mr-1"></i>Details
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

function filterOrders(f) {
    currentFilter = f;
    let filtered = allOrders;
    if (f !== 'All') {
        filtered = f === 'Shipping'
            ? allOrders.filter(o => ['shipped', 'shipping'].includes(o.status?.toLowerCase()))
            : allOrders.filter(o => o.status?.toLowerCase() === f.toLowerCase());
    }
    renderOrders(filtered);
    ['filterAll', 'filterPending', 'filterProcessing', 'filterShipping', 'filterDelivered', 'filterCancelled'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.className = 'filter-btn px-4 py-2 rounded-lg text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300';
    });
    const map = { All: 'filterAll', Pending: 'filterPending', Processing: 'filterProcessing', Shipping: 'filterShipping', Delivered: 'filterDelivered', Cancelled: 'filterCancelled' };
    const btn = document.getElementById(map[f]);
    if (btn) btn.className = 'filter-btn px-4 py-2 rounded-lg text-xs font-semibold bg-indigo-600 text-white';
}

async function loadOrders() {
    const list = document.getElementById('ordersList');
    list.innerHTML = `<div class="flex justify-center py-16"><div class="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>`;
    try {
        const snap = await getDocs(query(collection(db, 'orders'), orderBy('orderDate', 'desc')));
        allOrders = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        updateStats();
        filterOrders(currentFilter);
    } catch (e) {
        list.innerHTML = `<div class="text-center py-12 text-red-400">${e.message}</div>`;
    }
}

window.updateOrderStatus = async (orderId, newStatus) => {
    if (!newStatus) return;
    const { isConfirmed } = await Swal.fire({ title: 'Update Status?', text: `Mark as ${newStatus}?`, icon: 'question', showCancelButton: true, confirmButtonColor: '#4f46e5' });
    if (!isConfirmed) return;
    Swal.fire({ title: 'Updating…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
        await updateDoc(doc(db, 'orders', orderId), { status: newStatus, updatedAt: new Date().toISOString() });
        await loadOrders();
        Swal.fire({ icon: 'success', title: 'Updated!', timer: 1800, showConfirmButton: false });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: e.message });
    }
};

window.viewOrderDetails = async (orderId) => {
    try {
        const snap = await getDoc(doc(db, 'orders', orderId));
        if (!snap.exists()) return Swal.fire({ icon: 'error', title: 'Not found' });
        const o = snap.data();
        const items = o.items || [];
        const sc = statusClasses(o.status);
        Swal.fire({
            title: `<span class="font-mono text-indigo-600">#${orderId.slice(-8).toUpperCase()}</span>`,
            html: `
                <div class="text-left space-y-4 max-h-[60vh] overflow-y-auto px-1">
                    <div class="grid grid-cols-2 gap-3 bg-indigo-50 dark:bg-gray-800 rounded-xl p-4">
                        <div><p class="text-[11px] text-gray-500">Date</p><p class="text-sm font-semibold">${new Date(o.orderDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p></div>
                        <div><p class="text-[11px] text-gray-500">Status</p><span class="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${sc}">${o.status || 'Pending'}</span></div>
                        <div><p class="text-[11px] text-gray-500">Total</p><p class="text-sm font-bold text-indigo-600">$${(o.total || 0).toFixed(2)}</p></div>
                        <div><p class="text-[11px] text-gray-500">Items</p><p class="text-sm font-semibold">${items.length}</p></div>
                    </div>
                    <div><p class="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1"><i class="fas fa-user mr-1 text-indigo-400"></i>Customer</p>
                        <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-xs space-y-1 text-gray-600 dark:text-gray-300">
                            <p><b>Name:</b> ${getName(o)}</p><p class="break-all"><b>Email:</b> ${getEmail(o)}</p><p><b>Phone:</b> ${getPhone(o)}</p>
                            <p class="break-words"><b>Address:</b> ${getAddr(o)}</p>
                        </div>
                    </div>
                    <div><p class="text-xs font-bold text-gray-700 dark:text-gray-300 mb-1"><i class="fas fa-box mr-1 text-indigo-400"></i>Items</p>
                        <div class="space-y-2">${items.map(item => {
                            const n = item.title || item.name || 'Product', qty = item.quantity || 1, price = item.price || 0;
                            const img = item.image || item.images?.[0] || 'https://via.placeholder.com/40';
                            return `<div class="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                                <img src="${img}" class="w-10 h-10 rounded-lg object-cover" onerror="this.src='https://via.placeholder.com/40'">
                                <div class="flex-1 min-w-0"><p class="text-xs font-semibold truncate">${n}</p><p class="text-[11px] text-gray-500">x${qty} · $${price.toFixed(2)}</p></div>
                                <span class="text-xs font-bold text-indigo-600">$${(price * qty).toFixed(2)}</span>
                            </div>`;
                        }).join('')}</div>
                    </div>
                </div>`,
            width: window.innerWidth < 640 ? '95%' : '580px',
            confirmButtonColor: '#4f46e5',
            confirmButtonText: 'Close',
            showCloseButton: true,
            background: document.documentElement.classList.contains('dark') ? '#111827' : '#fff'
        });
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Error', text: e.message });
    }
};

// Filter buttons
['All', 'Pending', 'Processing', 'Shipping', 'Delivered', 'Cancelled'].forEach(f => {
    const id = 'filter' + f;
    document.getElementById(id)?.addEventListener('click', () => filterOrders(f));
});

// Auth check - redirect if not admin, no loading overlay
onAuthStateChanged(auth, async user => {
    if (!user) {
        window.location.href = '../login.html';
        return;
    }
    
    // Check if user is admin
    if (!ADMIN_EMAILS.includes(user.email)) {
        window.location.href = '../index.html';
        return;
    }
    
    // Admin user - load the page
    document.getElementById('adminName').textContent = user.displayName || user.email.split('@')[0];
    document.getElementById('adminEmail').textContent = user.email;
    await loadOrders();
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../login.html';
});