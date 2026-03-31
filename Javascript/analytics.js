import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

window.openSidebar = () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').style.display = 'block';
};
window.closeSidebar = () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').style.display = 'none';
};

let salesChart, topProductsChart, categoryChart, statusChart;
let currentRange = 'week';

function getDateRange(range) {
    const now = new Date();
    if (range === 'week') { const s = new Date(now); s.setDate(now.getDate() - 7); return { start: s, end: now }; }
    if (range === 'month') { return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now }; }
    if (range === 'year') { return { start: new Date(now.getFullYear(), 0, 1), end: now }; }
    return { start: new Date(now.setDate(now.getDate() - 7)), end: new Date() };
}

function setActiveRangeBtn(range) {
    ['rangeWeek', 'rangeMonth', 'rangeYear'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.classList.remove('active', 'bg-indigo-600', 'text-white');
        el.classList.add('bg-gray-100', 'dark:bg-gray-800', 'text-gray-600', 'dark:text-gray-300');
    });
    const map = { week: 'rangeWeek', month: 'rangeMonth', year: 'rangeYear' };
    const btn = document.getElementById(map[range]);
    if (btn) {
        btn.classList.add('active', 'bg-indigo-600', 'text-white');
        btn.classList.remove('bg-gray-100', 'text-gray-600');
    }
    const labels = { week: 'Last 7 days', month: 'This month', year: 'This year' };
    document.getElementById('dateRangeLabel').textContent = labels[range];
}

function buildLegend(containerId, labels, colors, values) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = labels.map((l, i) => `
    <div class="flex items-center justify-between text-xs">
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background:${colors[i]}"></span>
        <span class="text-gray-600 dark:text-gray-400 truncate max-w-[120px]">${l}</span>
      </div>
      <span class="font-bold text-gray-800 dark:text-white ml-2">${values[i]}</span>
    </div>`).join('');
}

function isDark() { return document.documentElement.classList.contains('dark'); }
const gridColor = () => isDark() ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)';
const tickColor = () => isDark() ? '#9ca3af' : '#6b7280';

function safeDestroy(chart) { try { if (chart) chart.destroy(); } catch (e) { } }

function toDate(val) {
    if (!val) return null;
    if (typeof val === 'object' && val.seconds !== undefined) return new Date(val.seconds * 1000);
    if (val instanceof Date) return val;
    const d = new Date(val);
    return isNaN(d) ? null : d;
}

async function loadAnalytics() {
    setActiveRangeBtn(currentRange);

    ['revenueMetric', 'ordersMetric', 'customersMetric', 'avgOrderMetric'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<span class="inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin align-middle"></span>';
    });

    try {
        const range = getDateRange(currentRange);
        const [ordersSnap, usersSnap, productsSnap] = await Promise.all([
            getDocs(collection(db, 'orders')),
            getDocs(collection(db, 'users')),
            getDocs(collection(db, 'products'))
        ]);

        let filteredOrders = [];
        let totalRevenue = 0;
        let productSales = {};
        let customerData = {};
        let salesByDay = {};
        let statusCounts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };

        ordersSnap.forEach(d => {
            const o = d.data();
            const orderDate = toDate(o.orderDate || o.createdAt || o.date);
            if (orderDate && (orderDate < range.start || orderDate > range.end)) return;

            filteredOrders.push(o);
            totalRevenue += (o.total || 0);

            const s = (o.status || 'pending').toLowerCase();
            if (statusCounts[s] !== undefined) statusCounts[s]++;
            else statusCounts.pending++;

            (o.items || []).forEach(item => {
                const name = (item.title || item.name || item.productName || 'Unknown').substring(0, 22);
                productSales[name] = (productSales[name] || 0) + (item.quantity || 1);
            });

            const email = o.email || o.userEmail || o.customerEmail || o.shippingAddress?.email || 'unknown';
            if (!customerData[email]) customerData[email] = { spent: 0, orders: 0 };
            customerData[email].spent += (o.total || 0);
            customerData[email].orders += 1;

            const dayKey = (orderDate || new Date()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            salesByDay[dayKey] = (salesByDay[dayKey] || 0) + (o.total || 0);
        });

        const totalOrders = filteredOrders.length;
        document.getElementById('revenueMetric').textContent = '$' + totalRevenue.toFixed(2);
        document.getElementById('ordersMetric').textContent = totalOrders;
        document.getElementById('avgOrderMetric').textContent = totalOrders > 0 ? '$' + (totalRevenue / totalOrders).toFixed(2) : '$0';

        let newCustomers = 0;
        usersSnap.forEach(d => {
            const created = toDate(d.data().createdAt);
            if (created && created >= range.start && created <= range.end) newCustomers++;
        });
        document.getElementById('customersMetric').textContent = newCustomers;

        requestAnimationFrame(() => {
            const border = isDark() ? '#111827' : '#ffffff';

            safeDestroy(salesChart);
            const dayLabels = Object.keys(salesByDay);
            const dayValues = dayLabels.map(k => salesByDay[k]);
            const salesCtx = document.getElementById('salesTrendChart');
            if (salesCtx) {
                salesChart = new Chart(salesCtx, {
                    type: 'line',
                    data: { labels: dayLabels.length ? dayLabels : ['No data'], datasets: [{ label: 'Revenue ($)', data: dayValues.length ? dayValues : [0], borderColor: '#4f46e5', backgroundColor: 'rgba(79,70,229,.12)', fill: true, tension: .4, pointRadius: 4, pointBackgroundColor: '#4f46e5', pointHoverRadius: 6 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: tickColor(), font: { size: 11 }, boxWidth: 10 } }, tooltip: { mode: 'index', intersect: false } }, scales: { x: { grid: { display: false }, ticks: { color: tickColor(), font: { size: 11 } } }, y: { grid: { color: gridColor() }, ticks: { color: tickColor(), font: { size: 11 }, callback: v => '$' + v } } } }
                });
            }

            safeDestroy(topProductsChart);
            const topProds = Object.entries(productSales).sort((a, b) => b[1] - a[1]).slice(0, 6);
            const topCtx = document.getElementById('topProductsChart');
            if (topCtx) {
                topProductsChart = new Chart(topCtx, {
                    type: 'bar',
                    data: { labels: topProds.length ? topProds.map(p => p[0]) : ['No orders'], datasets: [{ label: 'Units Sold', data: topProds.length ? topProds.map(p => p[1]) : [0], backgroundColor: ['#4f46e5', '#7c3aed', '#ec4899', '#14b8a6', '#f59e0b', '#22c55e'], borderRadius: 6 }] },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: tickColor(), font: { size: 10 } } }, y: { grid: { color: gridColor() }, beginAtZero: true, ticks: { color: tickColor(), font: { size: 11 } } } } }
                });
            }

            safeDestroy(categoryChart);
            const catCounts = {};
            productsSnap.forEach(d => { const cat = d.data().category || 'Uncategorized'; catCounts[cat] = (catCounts[cat] || 0) + 1; });
            const catLabels = Object.keys(catCounts).length ? Object.keys(catCounts) : ['No products'];
            const catValues = catLabels.map(k => catCounts[k] || 1);
            const catColors = ['#4f46e5', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#22c55e', '#ef4444'];
            const catCtx = document.getElementById('categoryChart');
            if (catCtx) {
                categoryChart = new Chart(catCtx, { type: 'doughnut', data: { labels: catLabels, datasets: [{ data: catValues, backgroundColor: catColors, borderWidth: 2, borderColor: border, hoverOffset: 6 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } } });
            }
            buildLegend('categoryLegend', catLabels, catColors, catValues);

            safeDestroy(statusChart);
            const stLabels = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
            const stValues = [statusCounts.pending, statusCounts.processing, statusCounts.shipped, statusCounts.delivered, statusCounts.cancelled];
            const stColors = ['#eab308', '#3b82f6', '#a855f7', '#22c55e', '#ef4444'];
            const stCtx = document.getElementById('statusDistributionChart');
            if (stCtx) {
                statusChart = new Chart(stCtx, { type: 'doughnut', data: { labels: stLabels, datasets: [{ data: stValues, backgroundColor: stColors, borderWidth: 2, borderColor: border, hoverOffset: 6 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { display: false } } } });
            }
            buildLegend('statusLegend', stLabels, stColors, stValues);
        });

        const sorted = Object.entries(customerData).filter(([email]) => email !== 'unknown').sort((a, b) => b[1].spent - a[1].spent).slice(0, 8);
        const tbody = document.getElementById('topCustomersTable');
        const custCount = document.getElementById('topCustCount');
        if (custCount) custCount.textContent = sorted.length + ' customers';

        if (!sorted.length) {
            tbody.innerHTML = `<tr><td colspan="3" class="text-center py-10 text-gray-400"><i class="fas fa-users text-3xl mb-2 block opacity-30"></i>No customer data for this period</td></tr>`;
        } else {
            const avColors = ['bg-indigo-500', 'bg-purple-500', 'bg-pink-500', 'bg-blue-500', 'bg-teal-500', 'bg-amber-500'];
            tbody.innerHTML = sorted.map(([email, data], i) => {
                const initials = email.slice(0, 2).toUpperCase();
                return `<tr class="trow"><td class="px-4 sm:px-6 py-3"><div class="flex items-center gap-3"><div class="w-8 h-8 rounded-full ${avColors[i % avColors.length]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0">${initials}</div><span class="text-sm text-gray-700 dark:text-gray-200 truncate max-w-[160px] sm:max-w-xs">${email}</span></div></td><td class="px-4 sm:px-6 py-3 text-center"><span class="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">${data.orders}</span></td><td class="px-4 sm:px-6 py-3 text-right font-bold text-indigo-600 dark:text-indigo-400">$${data.spent.toFixed(2)}</td></tr>`;
            }).join('');
        }
    } catch (err) {
        console.error('[Analytics] Error:', err);
        ['revenueMetric', 'ordersMetric', 'customersMetric', 'avgOrderMetric'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<span class="text-red-400 text-sm">Error</span>';
        });
        const tbody = document.getElementById('topCustomersTable');
        if (tbody) tbody.innerHTML = `<tr><td colspan="3" class="text-center py-8 text-red-400 text-sm px-4"><i class="fas fa-exclamation-triangle mr-2"></i>${err.message}</td></tr>`;
    }
}

document.getElementById('rangeWeek')?.addEventListener('click', () => { currentRange = 'week'; loadAnalytics(); });
document.getElementById('rangeMonth')?.addEventListener('click', () => { currentRange = 'month'; loadAnalytics(); });
document.getElementById('rangeYear')?.addEventListener('click', () => { currentRange = 'year'; loadAnalytics(); });
document.getElementById('refreshBtn')?.addEventListener('click', () => loadAnalytics());

onAuthStateChanged(auth, async user => {
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
        window.location.href = '../login.html';
        return;
    }
    document.getElementById('adminName').textContent = user.displayName || user.email.split('@')[0];
    document.getElementById('adminEmail').textContent = user.email;
    await loadAnalytics();
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../login.html';
});
