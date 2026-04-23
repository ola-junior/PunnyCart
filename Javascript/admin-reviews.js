
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let allReviews = [];
let currentStatusFilter = 'all';
let currentRatingFilter = 'all';
let currentSearch = '';

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderStars(rating) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= rating) {
            stars += '<i class="fas fa-star text-yellow-400"></i>';
        } else if (i - 0.5 <= rating) {
            stars += '<i class="fas fa-star-half-alt text-yellow-400"></i>';
        } else {
            stars += '<i class="far fa-star text-gray-300"></i>';
        }
    }
    return stars;
}

function getStatusBadge(status) {
    const statusMap = {
        pending: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        approved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    };
    const color = statusMap[status] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    return `<span class="px-2 py-0.5 rounded-full text-xs font-semibold ${color}">${status.charAt(0).toUpperCase() + status.slice(1)}</span>`;
}

function updateStats() {
    const total = allReviews.length;
    const pending = allReviews.filter(r => r.status === 'pending').length;
    const approved = allReviews.filter(r => r.status === 'approved').length;
    const avgRating = total > 0 ? (allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total).toFixed(1) : 0;

    document.getElementById('totalReviews').textContent = total;
    document.getElementById('pendingReviews').textContent = pending;
    document.getElementById('approvedReviews').textContent = approved;
    document.getElementById('avgRating').textContent = avgRating;
}

function filterReviews() {
    let filtered = [...allReviews];

    if (currentStatusFilter !== 'all') {
        filtered = filtered.filter(r => r.status === currentStatusFilter);
    }

    if (currentRatingFilter !== 'all') {
        const minRating = parseInt(currentRatingFilter);
        filtered = filtered.filter(r => (r.rating || 0) >= minRating);
    }

    if (currentSearch.trim() !== '') {
        const searchTerm = currentSearch.toLowerCase();
        filtered = filtered.filter(r =>
            r.productName?.toLowerCase().includes(searchTerm) ||
            r.customerName?.toLowerCase().includes(searchTerm) ||
            r.customerEmail?.toLowerCase().includes(searchTerm) ||
            r.comment?.toLowerCase().includes(searchTerm)
        );
    }

    return filtered;
}

function renderReviews(reviews) {
    const container = document.getElementById('reviewsList');
    document.getElementById('reviewCount').textContent = reviews.length;

    if (!reviews.length) {
        container.innerHTML = `
      <div class="text-center py-16">
        <i class="fas fa-star text-6xl text-gray-400 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No reviews found</h3>
        <p class="text-gray-500 dark:text-gray-400">Reviews will appear here once customers submit them</p>
      </div>
    `;
        return;
    }

    container.innerHTML = reviews.map(review => `
    <div class="review-card bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div class="p-4 sm:p-5">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
              <i class="fas fa-user text-indigo-500 text-sm"></i>
            </div>
            <div>
              <p class="font-semibold text-gray-900 dark:text-white">${review.customerName || 'Anonymous'}</p>
              <p class="text-xs text-gray-500">${review.customerEmail || 'No email'}</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <div class="star-rating">${renderStars(review.rating || 0)}</div>
            <span class="text-sm font-bold text-gray-700 dark:text-gray-300">${(review.rating || 0).toFixed(1)}</span>
            ${getStatusBadge(review.status || 'pending')}
          </div>
        </div>
        
        <div class="mb-3">
          <div class="flex items-center gap-2 mb-2">
            <i class="fas fa-box text-indigo-500 text-xs"></i>
            <span class="text-sm font-medium text-gray-700 dark:text-gray-300">Product:</span>
            <span class="text-sm text-gray-600 dark:text-gray-400">${review.productName || 'Unknown Product'}</span>
          </div>
          <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
            "${review.comment || 'No comment provided'}"
          </p>
        </div>
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div class="flex items-center gap-4 text-xs text-gray-500">
            <span><i class="far fa-calendar-alt mr-1"></i> ${formatDate(review.createdAt)}</span>
            ${review.productId ? `<span><i class="fas fa-tag mr-1"></i> ID: ${review.productId}</span>` : ''}
          </div>
          <div class="flex gap-2">
            ${review.status === 'pending' ? `
              <button onclick="window.approveReview('${review.id}')" class="px-3 py-1.5 rounded-lg text-green-600 border border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors text-sm">
                <i class="fas fa-check mr-1"></i> Approve
              </button>
              <button onclick="window.rejectReview('${review.id}')" class="px-3 py-1.5 rounded-lg text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-sm">
                <i class="fas fa-times mr-1"></i> Reject
              </button>
            ` : ''}
            <button onclick="window.viewReviewDetails('${review.id}')" class="px-3 py-1.5 rounded-lg text-indigo-600 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors text-sm">
              <i class="fas fa-eye mr-1"></i> View
            </button>
            <button onclick="window.deleteReview('${review.id}')" class="px-3 py-1.5 rounded-lg text-red-600 border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors text-sm">
              <i class="fas fa-trash mr-1"></i> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

async function loadReviews() {
    document.getElementById('reviewsList').innerHTML = `
    <div class="text-center py-16">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
      <p class="mt-4 text-gray-600 dark:text-gray-400">Loading reviews...</p>
    </div>
  `;

    try {
        const reviewsRef = collection(db, 'reviews');
        const q = query(reviewsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        allReviews = [];
        querySnapshot.forEach(doc => {
            allReviews.push({ id: doc.id, ...doc.data() });
        });

        updateStats();
        const filtered = filterReviews();
        renderReviews(filtered);
    } catch (error) {
        console.error('Error loading reviews:', error);
        document.getElementById('reviewsList').innerHTML = `
      <div class="text-center py-16">
        <i class="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Error loading reviews</h3>
        <p class="text-gray-500 dark:text-gray-400">${error.message}</p>
      </div>
    `;
    }
}

window.approveReview = async function (id) {
    const { isConfirmed } = await Swal.fire({
        title: 'Approve Review?',
        text: 'This review will be visible to customers on the product page.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#22c55e',
        confirmButtonText: 'Yes, approve'
    });

    if (isConfirmed) {
        Swal.fire({ title: 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        await updateDoc(doc(db, 'reviews', id), {
            status: 'approved',
            updatedAt: new Date().toISOString()
        });
        Swal.fire({ icon: 'success', title: 'Approved!', timer: 1500, showConfirmButton: false });
        loadReviews();
    }
};

window.rejectReview = async function (id) {
    const { isConfirmed } = await Swal.fire({
        title: 'Reject Review?',
        text: 'This review will be hidden from customers.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Yes, reject'
    });

    if (isConfirmed) {
        Swal.fire({ title: 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        await updateDoc(doc(db, 'reviews', id), {
            status: 'rejected',
            updatedAt: new Date().toISOString()
        });
        Swal.fire({ icon: 'success', title: 'Rejected!', timer: 1500, showConfirmButton: false });
        loadReviews();
    }
};

window.viewReviewDetails = async function (id) {
    const review = allReviews.find(r => r.id === id);
    if (!review) return;

    Swal.fire({
        title: 'Review Details',
        html: `
      <div class="text-left space-y-3">
        <div class="grid grid-cols-2 gap-2 text-sm">
          <div class="text-gray-500">Product:</div>
          <div class="font-medium">${review.productName || 'N/A'}</div>
          <div class="text-gray-500">Customer:</div>
          <div class="font-medium">${review.customerName || 'Anonymous'}</div>
          <div class="text-gray-500">Email:</div>
          <div class="font-medium break-all">${review.customerEmail || 'N/A'}</div>
          <div class="text-gray-500">Rating:</div>
          <div class="font-medium">${renderStars(review.rating || 0)} ${(review.rating || 0).toFixed(1)}</div>
          <div class="text-gray-500">Date:</div>
          <div class="font-medium">${formatDate(review.createdAt)}</div>
          <div class="text-gray-500">Status:</div>
          <div>${getStatusBadge(review.status || 'pending')}</div>
        </div>
        <div class="border-t pt-3">
          <div class="text-gray-500 text-sm mb-1">Review Comment:</div>
          <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg text-sm">"${review.comment || 'No comment provided'}"</div>
        </div>
        ${review.reply ? `
          <div class="border-t pt-3">
            <div class="text-gray-500 text-sm mb-1">Admin Reply:</div>
            <div class="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-lg text-sm">${review.reply}</div>
          </div>
        ` : ''}
      </div>
    `,
        width: '500px',
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Close',
        showCloseButton: true
    });
};

window.deleteReview = async function (id) {
    const { isConfirmed } = await Swal.fire({
        title: 'Delete Review?',
        text: 'This action cannot be undone. The review will be permanently removed.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Yes, delete'
    });

    if (isConfirmed) {
        await deleteDoc(doc(db, 'reviews', id));
        Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
        loadReviews();
    }
};

// Filter event listeners
document.getElementById('searchInput')?.addEventListener('input', e => {
    currentSearch = e.target.value;
    renderReviews(filterReviews());
});

document.getElementById('statusFilter')?.addEventListener('change', e => {
    currentStatusFilter = e.target.value;
    renderReviews(filterReviews());
});

document.getElementById('ratingFilter')?.addEventListener('change', e => {
    currentRatingFilter = e.target.value;
    renderReviews(filterReviews());
});

onAuthStateChanged(auth, async user => {
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
        window.location.href = '../Pages/login.html';
        return;
    }
    document.getElementById('adminName').textContent = user.displayName || user.email.split('@')[0];
    document.getElementById('adminEmail').textContent = user.email;
    await loadReviews();
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../Pages/login.html';
});
