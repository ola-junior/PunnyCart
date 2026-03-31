import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let allBanners = [];
let editingBannerId = null;

async function loadBanners() {
    try {
        const q = query(collection(db, 'banners'), orderBy('order', 'asc'));
        const snapshot = await getDocs(q);
        allBanners = [];
        snapshot.forEach(docSnap => { allBanners.push({ id: docSnap.id, ...docSnap.data() }); });
        renderBanners();
        updateStats();
    } catch (error) {
        console.error('Error loading banners:', error);
    }
}

function updateStats() {
    document.getElementById('totalBanners').textContent = allBanners.length;
    const active = allBanners.filter(b => b.active === true).length;
    document.getElementById('activeBanners').textContent = active;
    const today = new Date().toISOString().split('T')[0];
    const scheduled = allBanners.filter(b => b.startDate > today).length;
    document.getElementById('scheduledBanners').textContent = scheduled;
}

function renderBanners() {
    const grid = document.getElementById('bannersGrid');
    if (allBanners.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-16"><i class="fas fa-images text-6xl text-gray-400 mb-4"></i><h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No banners yet</h3><p class="text-gray-500 dark:text-gray-400">Click "Add Banner" to create your first banner</p></div>`;
        return;
    }
    grid.innerHTML = allBanners.map(banner => `
        <div class="banner-card bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-all">
          <div class="relative h-48 bg-gray-100 dark:bg-gray-700">
            <img src="${banner.image || 'https://via.placeholder.com/400x200?text=No+Image'}" alt="${banner.title}" class="w-full h-full object-cover">
            <div class="absolute top-2 right-2 flex gap-1">
              <button onclick="toggleBannerStatus('${banner.id}', ${!banner.active})" class="p-1.5 rounded-lg ${banner.active ? 'bg-green-500' : 'bg-gray-500'} text-white text-xs transition-colors"><i class="fas ${banner.active ? 'fa-check-circle' : 'fa-ban'}"></i></button>
              <button onclick="editBanner('${banner.id}')" class="p-1.5 rounded-lg bg-indigo-500 text-white text-xs transition-colors hover:bg-indigo-600"><i class="fas fa-edit"></i></button>
              <button onclick="deleteBanner('${banner.id}')" class="p-1.5 rounded-lg bg-red-500 text-white text-xs transition-colors hover:bg-red-600"><i class="fas fa-trash"></i></button>
            </div>
            ${banner.active && banner.startDate && banner.startDate > new Date().toISOString().split('T')[0] ? '<div class="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">Scheduled</div>' : ''}
          </div>
          <div class="p-4">
            <h3 class="font-bold text-lg text-gray-900 dark:text-white mb-1">${escapeHtml(banner.title)}</h3>
            ${banner.subtitle ? `<p class="text-sm text-gray-500 dark:text-gray-400 mb-2">${escapeHtml(banner.subtitle)}</p>` : ''}
            <div class="flex justify-between items-center mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <span class="text-xs text-gray-400">${banner.startDate || 'No start'} → ${banner.endDate || 'No end'}</span>
              <a href="${banner.link || '#'}" target="_blank" class="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline">${banner.buttonText || 'Learn More'} →</a>
            </div>
          </div>
        </div>
      `).join('');
}

function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }

window.openAddBannerModal = () => { editingBannerId = null; document.getElementById('modalTitle').textContent = 'Add New Banner'; document.getElementById('bannerTitle').value = ''; document.getElementById('bannerSubtitle').value = ''; document.getElementById('bannerImage').value = ''; document.getElementById('bannerButton').value = 'Shop Now'; document.getElementById('bannerLink').value = ''; document.getElementById('bannerStartDate').value = ''; document.getElementById('bannerEndDate').value = ''; document.getElementById('bannerActive').checked = true; document.getElementById('bannerModal').classList.remove('hidden'); document.getElementById('bannerModal').classList.add('flex'); };
window.editBanner = (id) => { const banner = allBanners.find(b => b.id === id); if (!banner) return; editingBannerId = id; document.getElementById('modalTitle').textContent = 'Edit Banner'; document.getElementById('bannerTitle').value = banner.title || ''; document.getElementById('bannerSubtitle').value = banner.subtitle || ''; document.getElementById('bannerImage').value = banner.image || ''; document.getElementById('bannerButton').value = banner.buttonText || 'Shop Now'; document.getElementById('bannerLink').value = banner.link || ''; document.getElementById('bannerStartDate').value = banner.startDate || ''; document.getElementById('bannerEndDate').value = banner.endDate || ''; document.getElementById('bannerActive').checked = banner.active !== false; document.getElementById('bannerModal').classList.remove('hidden'); document.getElementById('bannerModal').classList.add('flex'); };
window.closeBannerModal = () => { document.getElementById('bannerModal').classList.add('hidden'); document.getElementById('bannerModal').classList.remove('flex'); };
window.saveBanner = async () => { const data = { title: document.getElementById('bannerTitle').value, subtitle: document.getElementById('bannerSubtitle').value, image: document.getElementById('bannerImage').value, buttonText: document.getElementById('bannerButton').value, link: document.getElementById('bannerLink').value, startDate: document.getElementById('bannerStartDate').value, endDate: document.getElementById('bannerEndDate').value, active: document.getElementById('bannerActive').checked, updatedAt: new Date() }; if (!data.title || !data.image) { Swal.fire('Error', 'Title and image are required', 'error'); return; } try { if (editingBannerId) { await updateDoc(doc(db, 'banners', editingBannerId), data); Swal.fire('Success', 'Banner updated', 'success'); } else { data.order = allBanners.length; data.createdAt = new Date(); await addDoc(collection(db, 'banners'), data); Swal.fire('Success', 'Banner added', 'success'); } closeBannerModal(); loadBanners(); } catch (error) { console.error('Error saving banner:', error); Swal.fire('Error', 'Failed to save banner', 'error'); } };
window.toggleBannerStatus = async (id, newStatus) => { try { await updateDoc(doc(db, 'banners', id), { active: newStatus }); loadBanners(); } catch (error) { console.error('Error toggling status:', error); } };
window.deleteBanner = async (id) => { const result = await Swal.fire({ title: 'Delete Banner?', text: 'This action cannot be undone', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Delete' }); if (result.isConfirmed) { await deleteDoc(doc(db, 'banners', id)); await loadBanners(); Swal.fire('Deleted', 'Banner removed', 'success'); } };

window.openSidebar = () => { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').style.display = 'block'; };
window.closeSidebar = () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').style.display = 'none'; };

const darkToggle = document.getElementById('darkToggle');
const themeIcon = document.getElementById('themeIcon');
function applyDark(on) { document.documentElement.classList.toggle('dark', on); themeIcon.className = on ? 'fas fa-sun text-sm' : 'fas fa-moon text-sm'; localStorage.setItem('darkMode', on); }
applyDark(localStorage.getItem('darkMode') === 'true');
darkToggle.addEventListener('click', () => applyDark(!document.documentElement.classList.contains('dark')));

onAuthStateChanged(auth, async (user) => {
    if (user && ADMIN_EMAILS.includes(user.email)) {
        document.getElementById('adminName').textContent = user.displayName || user.email.split('@')[0];
        document.getElementById('adminEmail').textContent = user.email;
        loadBanners();
    } else if (user) { Swal.fire('Access Denied', 'You are not authorized', 'error').then(() => window.location.href = './Dashboard.html'); }
    else { window.location.href = './index.html'; }
});
document.getElementById('logoutBtn').addEventListener('click', async () => { await signOut(auth); window.location.href = './index.html'; });
