import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, query, orderBy, getDocs, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Safely set text content
function safeSetTextContent(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  } else {
    console.warn(`Element with id "${id}" not found`);
  }
}

// Safely set inner HTML
function safeSetInnerHTML(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.innerHTML = value;
  } else {
    console.warn(`Element with id "${id}" not found`);
  }
}

// Today's date
const todayDateElement = document.getElementById('todayDate');
if (todayDateElement) {
  todayDateElement.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// Dark mode
const darkToggle = document.getElementById('darkToggle');
const themeIcon = document.getElementById('themeIcon');
function applyDark(on) {
  document.documentElement.classList.toggle('dark', on);
  if (themeIcon) {
    themeIcon.className = on ? 'fas fa-sun text-sm' : 'fas fa-moon text-sm';
  }
  localStorage.setItem('darkMode', on);
}
applyDark(localStorage.getItem('darkMode') === 'true');
if (darkToggle) {
  darkToggle.addEventListener('click', () => applyDark(!document.documentElement.classList.contains('dark')));
}

// Sidebar
window.openSidebar = () => {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.style.display = 'block';
};
window.closeSidebar = () => {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.style.display = 'none';
};

let salesChart, statusChart;

function buildSalesChart() {
  const ctx = document.getElementById('salesChart');
  if (!ctx) {
    console.warn('salesChart canvas not found');
    return;
  }
  if (salesChart) salesChart.destroy();
  const isDark = document.documentElement.classList.contains('dark');
  salesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      datasets: [
        {
          type: 'line',
          label: 'Earnings',
          data: [9200, 11500, 10800, 13400, 15200, 18400, 21000],
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79,70,229,.08)',
          fill: true,
          tension: .4,
          pointRadius: 3,
          pointBackgroundColor: '#4f46e5',
          order: 1
        },
        {
          type: 'bar',
          label: 'Sales',
          data: [8000, 10200, 9500, 12000, 13800, 17000, 19500],
          backgroundColor: 'rgba(99,102,241,.25)',
          borderRadius: 6,
          order: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            boxWidth: 10,
            font: { size: 11 },
            color: isDark ? '#9ca3af' : '#6b7280'
          }
        },
        tooltip: { mode: 'index', intersect: false }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: isDark ? '#9ca3af' : '#6b7280', font: { size: 11 } }
        },
        y: {
          grid: { color: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)' },
          ticks: {
            color: isDark ? '#9ca3af' : '#6b7280',
            font: { size: 11 },
            callback: v => '$' + v.toLocaleString()
          }
        }
      }
    }
  });
}

function buildStatusChart(counts) {
  const ctx = document.getElementById('statusChart');
  if (!ctx) {
    console.warn('statusChart canvas not found');
    return;
  }
  if (statusChart) statusChart.destroy();
  const labels = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
  const data = [counts.pending, counts.processing, counts.shipped, counts.delivered, counts.cancelled];
  const colors = ['#eab308', '#3b82f6', '#a855f7', '#22c55e', '#ef4444'];

  statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: document.documentElement.classList.contains('dark') ? '#111827' : '#fff',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ' ' + ctx.label + ': ' + ctx.raw
          }
        }
      }
    }
  });

  const legend = document.getElementById('statusLegend');
  if (legend) {
    legend.innerHTML = labels.map((l, i) => `
      <div class="flex items-center justify-between text-xs">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background: ${colors[i]}"></span>
          <span class="text-gray-600 dark:text-gray-400">${l}</span>
        </div>
        <span class="font-bold text-gray-800 dark:text-white">${data[i]}</span>
      </div>
    `).join('');
  }
}

function statusBadge(status) {
  const map = {
    delivered: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    processing: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    shipped: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  };
  const cls = map[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
  return `<span class="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${cls}">${status || 'Pending'}</span>`;
}

window.loadDashboardData = async function() {
  try {
    const ordersRef = collection(db, 'orders');
    const snapshot = await getDocs(ordersRef);

    let totalRevenue = 0, total = 0;
    let counts = { pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };

    snapshot.forEach(d => {
      const o = d.data();
      const s = o.status?.toLowerCase() || 'pending';
      totalRevenue += o.total || 0;
      total++;
      if (counts[s] !== undefined) counts[s]++;
    });

    // Update stats with safe checks
    safeSetTextContent('totalRevenue', '$' + totalRevenue.toFixed(2));
    safeSetTextContent('totalOrders', total);
    safeSetTextContent('pendingOrders', counts.pending);
    safeSetTextContent('cancelledOrders', counts.cancelled);

    const badge = document.getElementById('pendingBadge');
    if (badge && counts.pending > 0) {
      badge.textContent = counts.pending;
      badge.classList.remove('hidden');
    } else if (badge) {
      badge.classList.add('hidden');
    }

    buildSalesChart();
    buildStatusChart(counts);

    const recent = await getDocs(query(ordersRef, orderBy('orderDate', 'desc'), limit(6)));
    const tbody = document.getElementById('recentOrdersTable');
    if (tbody) {
      tbody.innerHTML = '';
      recent.forEach(d => {
        const o = d.data();
        const name = o.fullName || o.shippingAddress?.fullName || o.email?.split('@')[0] || 'N/A';
        const date = new Date(o.orderDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        tbody.innerHTML += `
          <tr class="trow">
            <td class="px-4 sm:px-6 py-3 text-xs font-mono text-gray-500 dark:text-gray-400">#${d.id.slice(-8).toUpperCase()}</td>
            <td class="px-4 sm:px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-200">${name}</td>
            <td class="px-4 sm:px-6 py-3 text-xs text-gray-500 dark:text-gray-400">${date}</td>
            <td class="px-4 sm:px-6 py-3">${statusBadge(o.status)}</td>
            <td class="px-4 sm:px-6 py-3 text-sm font-bold text-right text-indigo-600 dark:text-indigo-400">$${(o.total || 0).toFixed(2)}</td>
          </tr>
        `;
      });
      if (!recent.size) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-8 text-gray-400 text-sm">No orders yet</td></tr>`;
      }
    } else {
      console.warn('recentOrdersTable element not found');
    }
  } catch (e) {
    console.error('Error loading dashboard data:', e);
  }
};

onAuthStateChanged(auth, async user => {
  if (!user || !ADMIN_EMAILS.includes(user.email)) {
    window.location.href = '../login.html';
    return;
  }
  const name = user.displayName || user.email.split('@')[0];
  safeSetTextContent('adminName', name);
  safeSetTextContent('adminEmail', user.email);
  safeSetTextContent('welcomeName', name);
  await window.loadDashboardData();
});

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../login.html';
  });
}