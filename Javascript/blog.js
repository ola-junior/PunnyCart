import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, deleteDoc, doc, updateDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

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
const storage = getStorage(app);
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

let allPosts = [];
let currentStatusFilter = 'all';
let currentCategoryFilter = 'all';
let currentSearch = '';

function updateStats() {
    const total = allPosts.length;
    const published = allPosts.filter(p => p.status === 'published').length;
    const drafts = allPosts.filter(p => p.status === 'draft').length;
    const totalViews = allPosts.reduce((sum, p) => sum + (p.views || 0), 0);

    document.getElementById('totalPosts').textContent = total;
    document.getElementById('publishedPosts').textContent = published;
    document.getElementById('draftPosts').textContent = drafts;
    document.getElementById('totalViews').textContent = totalViews.toLocaleString();
}

function filterPosts() {
    let filtered = [...allPosts];

    if (currentStatusFilter !== 'all') {
        filtered = filtered.filter(p => p.status === currentStatusFilter);
    }

    if (currentCategoryFilter !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategoryFilter);
    }

    if (currentSearch.trim() !== '') {
        const searchTerm = currentSearch.toLowerCase();
        filtered = filtered.filter(p =>
            p.title?.toLowerCase().includes(searchTerm) ||
            p.category?.toLowerCase().includes(searchTerm) ||
            p.excerpt?.toLowerCase().includes(searchTerm)
        );
    }

    return filtered;
}

function getCategoryColor(category) {
    const colors = {
        'News': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'Products': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        'Guides': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'Tips': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        'Events': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
    };
    return colors[category] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderPosts(posts) {
    const grid = document.getElementById('blogGrid');
    document.getElementById('postCount').textContent = posts.length;

    if (!posts.length) {
        grid.innerHTML = `
      <div class="col-span-full text-center py-16">
        <i class="fas fa-newspaper text-6xl text-gray-400 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No blog posts found</h3>
        <p class="text-gray-500 dark:text-gray-400">Click "Write New Post" to create your first blog post</p>
      </div>
    `;
        return;
    }

    grid.innerHTML = posts.map(post => {
        const categoryColor = getCategoryColor(post.category);
        const statusColor = post.status === 'published'
            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
            : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';

        return `
      <div class="blog-card bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-all">
        <div class="relative h-48 overflow-hidden">
          <img src="${post.featuredImage || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&auto=format'}" 
               alt="${post.title}" 
               class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
               onerror="this.src='https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&auto=format'">
          <div class="absolute top-3 right-3 flex gap-2">
            <span class="px-2 py-1 rounded-lg text-xs font-semibold ${statusColor}">${post.status === 'published' ? 'Published' : 'Draft'}</span>
          </div>
        </div>
        <div class="p-5">
          <div class="flex items-center gap-2 mb-3">
            <span class="px-2 py-0.5 rounded-full text-xs font-medium ${categoryColor}">${post.category || 'General'}</span>
            <span class="text-xs text-gray-400"><i class="far fa-calendar-alt mr-1"></i>${formatDate(post.createdAt)}</span>
            <span class="text-xs text-gray-400"><i class="far fa-eye mr-1"></i>${post.views || 0}</span>
          </div>
          <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">${post.title}</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">${post.excerpt || post.content?.substring(0, 120) + '...'}</p>
          <div class="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <div class="flex items-center gap-2">
              <div class="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                <i class="fas fa-user text-indigo-500 text-xs"></i>
              </div>
              <span class="text-xs text-gray-500">${post.author || 'Admin'}</span>
            </div>
            <div class="flex gap-2">
              <button onclick="window.editPost('${post.id}')" class="w-8 h-8 rounded-lg text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors">
                <i class="fas fa-edit text-sm"></i>
              </button>
              <button onclick="window.deletePost('${post.id}')" class="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                <i class="fas fa-trash text-sm"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    }).join('');
}

async function loadPosts() {
    document.getElementById('blogGrid').innerHTML = `
    <div class="col-span-full text-center py-16">
      <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
      <p class="mt-4 text-gray-600 dark:text-gray-400">Loading posts...</p>
    </div>
  `;

    try {
        const postsRef = collection(db, 'blog');
        const q = query(postsRef, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);

        allPosts = [];
        querySnapshot.forEach(doc => {
            allPosts.push({ id: doc.id, ...doc.data() });
        });

        updateStats();
        const filtered = filterPosts();
        renderPosts(filtered);
    } catch (error) {
        console.error('Error loading posts:', error);
        document.getElementById('blogGrid').innerHTML = `
      <div class="col-span-full text-center py-16">
        <i class="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Error loading posts</h3>
        <p class="text-gray-500 dark:text-gray-400">${error.message}</p>
      </div>
    `;
    }
}

window.addPost = async function () {
    const { value: v } = await Swal.fire({
        title: 'Create New Blog Post',
        html: `
      <input id="pTitle" class="swal2-input" placeholder="Post Title" required>
      <select id="pCategory" class="swal2-select" style="width:100%;margin-bottom:1rem;padding:0.75rem">
        <option value="News">News</option>
        <option value="Products">Products</option>
        <option value="Guides">Guides</option>
        <option value="Tips">Tips & Tricks</option>
        <option value="Events">Events</option>
      </select>
      <textarea id="pExcerpt" class="swal2-textarea" placeholder="Short excerpt (summary)"></textarea>
      <textarea id="pContent" class="swal2-textarea" placeholder="Full content" rows="6"></textarea>
      <input id="pImageUrl" class="swal2-input" type="url" placeholder="Featured Image URL" value="https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&auto=format">
      <select id="pStatus" class="swal2-select" style="width:100%;margin-top:1rem;padding:0.75rem">
        <option value="draft">Draft</option>
        <option value="published">Publish Now</option>
      </select>
      <p class="text-xs text-gray-500 mt-2">You can always edit and publish later</p>`,
        focusConfirm: false,
        confirmButtonColor: '#4f46e5',
        preConfirm: () => {
            const title = document.getElementById('pTitle').value;
            const category = document.getElementById('pCategory').value;
            const excerpt = document.getElementById('pExcerpt').value;
            const content = document.getElementById('pContent').value;
            const featuredImage = document.getElementById('pImageUrl').value;
            const status = document.getElementById('pStatus').value;

            if (!title) Swal.showValidationMessage('Post title required');
            if (!content) Swal.showValidationMessage('Content required');

            return { title, category, excerpt, content, featuredImage, status };
        }
    });

    if (v) {
        Swal.fire({ title: 'Saving…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        await addDoc(collection(db, 'blog'), {
            title: v.title,
            category: v.category,
            excerpt: v.excerpt || v.content.substring(0, 150),
            content: v.content,
            featuredImage: v.featuredImage,
            status: v.status,
            views: 0,
            author: document.getElementById('adminName')?.textContent || 'Admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

        Swal.fire({ icon: 'success', title: 'Post created!', timer: 1800, showConfirmButton: false });
        loadPosts();
    }
};

window.editPost = async function (id) {
    const post = allPosts.find(p => p.id === id);
    if (!post) return;

    const { value: v } = await Swal.fire({
        title: 'Edit Blog Post',
        html: `
      <input id="pTitle" class="swal2-input" placeholder="Post Title" value="${post.title.replace(/"/g, '&quot;')}">
      <select id="pCategory" class="swal2-select" style="width:100%;margin-bottom:1rem;padding:0.75rem">
        <option value="News" ${post.category === 'News' ? 'selected' : ''}>News</option>
        <option value="Products" ${post.category === 'Products' ? 'selected' : ''}>Products</option>
        <option value="Guides" ${post.category === 'Guides' ? 'selected' : ''}>Guides</option>
        <option value="Tips" ${post.category === 'Tips' ? 'selected' : ''}>Tips & Tricks</option>
        <option value="Events" ${post.category === 'Events' ? 'selected' : ''}>Events</option>
      </select>
      <textarea id="pExcerpt" class="swal2-textarea" placeholder="Short excerpt">${post.excerpt || ''}</textarea>
      <textarea id="pContent" class="swal2-textarea" placeholder="Full content" rows="6">${post.content || ''}</textarea>
      <input id="pImageUrl" class="swal2-input" type="url" placeholder="Featured Image URL" value="${post.featuredImage || ''}">
      <select id="pStatus" class="swal2-select" style="width:100%;margin-top:1rem;padding:0.75rem">
        <option value="draft" ${post.status === 'draft' ? 'selected' : ''}>Draft</option>
        <option value="published" ${post.status === 'published' ? 'selected' : ''}>Publish</option>
      </select>`,
        focusConfirm: false,
        confirmButtonColor: '#4f46e5',
        preConfirm: () => {
            const title = document.getElementById('pTitle').value;
            const category = document.getElementById('pCategory').value;
            const excerpt = document.getElementById('pExcerpt').value;
            const content = document.getElementById('pContent').value;
            const featuredImage = document.getElementById('pImageUrl').value;
            const status = document.getElementById('pStatus').value;

            if (!title) Swal.showValidationMessage('Post title required');
            if (!content) Swal.showValidationMessage('Content required');

            return { title, category, excerpt, content, featuredImage, status };
        }
    });

    if (v) {
        Swal.fire({ title: 'Updating…', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

        await updateDoc(doc(db, 'blog', id), {
            title: v.title,
            category: v.category,
            excerpt: v.excerpt || v.content.substring(0, 150),
            content: v.content,
            featuredImage: v.featuredImage,
            status: v.status,
            updatedAt: new Date().toISOString()
        });

        Swal.fire({ icon: 'success', title: 'Post updated!', timer: 1800, showConfirmButton: false });
        loadPosts();
    }
};

window.deletePost = async function (id) {
    const { isConfirmed } = await Swal.fire({
        title: 'Delete Post?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Yes, delete'
    });

    if (isConfirmed) {
        await deleteDoc(doc(db, 'blog', id));
        Swal.fire({ icon: 'success', title: 'Deleted!', timer: 1500, showConfirmButton: false });
        loadPosts();
    }
};

// Filter event listeners
document.getElementById('searchInput')?.addEventListener('input', e => {
    currentSearch = e.target.value;
    const filtered = filterPosts();
    renderPosts(filtered);
});

document.getElementById('statusFilter')?.addEventListener('change', e => {
    currentStatusFilter = e.target.value;
    const filtered = filterPosts();
    renderPosts(filtered);
});

document.getElementById('categoryFilter')?.addEventListener('change', e => {
    currentCategoryFilter = e.target.value;
    const filtered = filterPosts();
    renderPosts(filtered);
});

document.getElementById('addPostBtn')?.addEventListener('click', () => window.addPost());

onAuthStateChanged(auth, async user => {
    if (!user || !ADMIN_EMAILS.includes(user.email)) {
        window.location.href = '../login.html';
        return;
    }
    document.getElementById('adminName').textContent = user.displayName || user.email.split('@')[0];
    document.getElementById('adminEmail').textContent = user.email;
    await loadPosts();
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = '../login.html';
});
