import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { updateCartCount } from '../Javascript/main.js';

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

const blogGrid = document.getElementById('blogGrid');
const searchInput = document.getElementById('searchInput');
const darkToggle = document.getElementById('darkToggle');
const themeIcon = document.getElementById('themeIcon');
const backToTop = document.getElementById('backToTop');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');

let allPosts = [];
let currentCategory = 'All';
let currentSearch = '';

// Mobile menu
if (mobileMenuToggle && mobileMenu) {
    mobileMenuToggle.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
}
window.addEventListener('resize', () => {
    if (window.innerWidth >= 768 && mobileMenu) mobileMenu.classList.add('hidden');
});

// Back to top
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
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
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
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Helper function to get image URL from post (checks multiple field names)
function getPostImage(post) {
    // Try different possible field names for the image
    if (post.featuredImage && post.featuredImage !== '') return post.featuredImage;
    if (post.image && post.image !== '') return post.image;
    if (post.imageUrl && post.imageUrl !== '') return post.imageUrl;
    if (post.thumbnail && post.thumbnail !== '') return post.thumbnail;
    if (post.featured_image && post.featured_image !== '') return post.featured_image;

    // Default image based on category
    const defaultImages = {
        'News': 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&auto=format',
        'Products': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&auto=format',
        'Guides': 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=600&auto=format',
        'Tips': 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=600&auto=format',
        'Events': 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=600&auto=format'
    };
    return defaultImages[post.category] || 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&auto=format';
}

async function incrementViewCount(postId, currentViews) {
    try {
        const postRef = doc(db, 'blog', postId);
        await updateDoc(postRef, { views: (currentViews || 0) + 1 });
    } catch (error) {
        console.error('Error updating view count:', error);
    }
}

function displayPosts(posts) {
    if (!blogGrid) return;

    if (posts.length === 0) {
        blogGrid.innerHTML = `
          <div class="col-span-full text-center py-16">
            <i class="fas fa-newspaper text-6xl text-gray-400 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No posts found</h3>
            <p class="text-gray-500 dark:text-gray-400">Check back later for new articles!</p>
          </div>
        `;
        return;
    }

    blogGrid.innerHTML = posts.map(post => {
        const categoryColor = getCategoryColor(post.category);
        const imageUrl = getPostImage(post);

        return `
          <div class="blog-card bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all cursor-pointer group" data-post-id="${post.id}">
            <div class="relative h-56 overflow-hidden">
              <img src="${imageUrl}" 
                   alt="${post.title}"
                   class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                   onerror="this.src='https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=600&auto=format'">
              <div class="absolute top-4 left-4">
                <span class="px-3 py-1 rounded-full text-xs font-semibold ${categoryColor}">${post.category}</span>
              </div>
              <div class="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                <i class="far fa-eye mr-1"></i> ${post.views || 0}
              </div>
            </div>
            <div class="p-6">
              <div class="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-3">
                <span><i class="far fa-calendar-alt mr-1"></i> ${formatDate(post.createdAt)}</span>
                <span><i class="far fa-user mr-1"></i> ${post.author || 'Admin'}</span>
              </div>
              <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                ${post.title}
              </h3>
              <p class="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                ${post.excerpt || (post.content ? post.content.substring(0, 120) + '...' : 'No description available')}
              </p>
              <div class="flex items-center justify-between">
                <button onclick="window.openPostModal('${post.id}')" 
                        class="text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1">
                  Read More <i class="fas fa-arrow-right text-xs"></i>
                </button>
              </div>
            </div>
          </div>
        `;
    }).join('');

    // Add click event for the whole card
    document.querySelectorAll('.blog-card').forEach(card => {
        const postId = card.dataset.postId;
        const post = posts.find(p => p.id === postId);
        if (post) {
            card.addEventListener('click', (e) => {
                if (!e.target.closest('button')) {
                    window.openPostModal(postId);
                }
            });
        }
    });
}

window.openPostModal = async function (postId) {
    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    await incrementViewCount(postId, post.views);
    post.views = (post.views || 0) + 1;

    const categoryColor = getCategoryColor(post.category);
    const imageUrl = getPostImage(post);

    Swal.fire({
        title: post.title,
        html: `
          <div class="text-left max-h-[70vh] overflow-y-auto px-2">
            <div class="mb-4">
              <span class="inline-block px-3 py-1 rounded-full text-xs font-semibold ${categoryColor} mb-3">${post.category}</span>
              <div class="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span><i class="far fa-calendar-alt mr-1"></i> ${formatDate(post.createdAt)}</span>
                <span><i class="far fa-user mr-1"></i> ${post.author || 'Admin'}</span>
                <span><i class="far fa-eye mr-1"></i> ${post.views || 0} views</span>
              </div>
              <img src="${imageUrl}" 
                   alt="${post.title}" 
                   class="w-full rounded-xl mb-4 object-cover max-h-64"
                   onerror="this.src='https://images.unsplash.com/photo-1499750310107-5fef28a66643?w=800&auto=format'">
              <div class="prose prose-sm max-w-none text-gray-600 dark:text-gray-300">
                ${post.content ? post.content.replace(/\n/g, '<br>') : ''}
              </div>
            </div>
          </div>
        `,
        width: '700px',
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'Close',
        showCloseButton: true,
        background: document.documentElement.classList.contains('dark') ? '#1f2937' : '#ffffff'
    });
};

async function loadPosts() {
    blogGrid.innerHTML = `
        <div class="col-span-full text-center py-16">
          <div class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-indigo-600 border-r-transparent"></div>
          <p class="mt-4 text-gray-600 dark:text-gray-400">Loading articles...</p>
        </div>
      `;

    try {
        const postsRef = collection(db, 'blog');
        const querySnapshot = await getDocs(postsRef);

        allPosts = [];
        querySnapshot.forEach(doc => {
            const data = doc.data();
            // Only show published posts
            if (data.status === 'published') {
                allPosts.push({ id: doc.id, ...data });
            }
        });

        // Sort by createdAt (newest first)
        allPosts.sort((a, b) => {
            const dateA = new Date(a.createdAt);
            const dateB = new Date(b.createdAt);
            return dateB - dateA;
        });

        filterAndDisplay();
    } catch (error) {
        console.error('Error loading posts:', error);
        blogGrid.innerHTML = `
          <div class="col-span-full text-center py-16">
            <i class="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
            <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Error loading articles</h3>
            <p class="text-gray-500 dark:text-gray-400">Please try again later</p>
          </div>
        `;
    }
}

function filterAndDisplay() {
    let filtered = [...allPosts];

    if (currentCategory !== 'All') {
        filtered = filtered.filter(post => post.category === currentCategory);
    }

    if (currentSearch.trim() !== '') {
        const searchTerm = currentSearch.toLowerCase();
        filtered = filtered.filter(post =>
            post.title?.toLowerCase().includes(searchTerm) ||
            post.category?.toLowerCase().includes(searchTerm) ||
            post.content?.toLowerCase().includes(searchTerm) ||
            post.excerpt?.toLowerCase().includes(searchTerm)
        );
    }

    displayPosts(filtered);
}

// Filter buttons
const filterAll = document.getElementById('filterAll');
const filterNews = document.getElementById('filterNews');
const filterProducts = document.getElementById('filterProducts');
const filterGuides = document.getElementById('filterGuides');
const filterTips = document.getElementById('filterTips');
const filterEvents = document.getElementById('filterEvents');

if (filterAll) filterAll.addEventListener('click', () => {
    currentCategory = 'All';
    filterAndDisplay();
    document.querySelectorAll('.category-badge').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    });
    filterAll.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    filterAll.classList.add('bg-indigo-600', 'text-white');
});

if (filterNews) filterNews.addEventListener('click', () => {
    currentCategory = 'News';
    filterAndDisplay();
    document.querySelectorAll('.category-badge').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    });
    filterNews.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    filterNews.classList.add('bg-indigo-600', 'text-white');
});

if (filterProducts) filterProducts.addEventListener('click', () => {
    currentCategory = 'Products';
    filterAndDisplay();
    document.querySelectorAll('.category-badge').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    });
    filterProducts.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    filterProducts.classList.add('bg-indigo-600', 'text-white');
});

if (filterGuides) filterGuides.addEventListener('click', () => {
    currentCategory = 'Guides';
    filterAndDisplay();
    document.querySelectorAll('.category-badge').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    });
    filterGuides.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    filterGuides.classList.add('bg-indigo-600', 'text-white');
});

if (filterTips) filterTips.addEventListener('click', () => {
    currentCategory = 'Tips';
    filterAndDisplay();
    document.querySelectorAll('.category-badge').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    });
    filterTips.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    filterTips.classList.add('bg-indigo-600', 'text-white');
});

if (filterEvents) filterEvents.addEventListener('click', () => {
    currentCategory = 'Events';
    filterAndDisplay();
    document.querySelectorAll('.category-badge').forEach(btn => {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    });
    filterEvents.classList.remove('bg-gray-200', 'dark:bg-gray-700', 'text-gray-700', 'dark:text-gray-300');
    filterEvents.classList.add('bg-indigo-600', 'text-white');
});

// Search input
if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        filterAndDisplay();
    });
}

// Newsletter form
const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('newsletterEmail').value;

        if (!email) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Please enter your email' });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Swal.fire({ icon: 'error', title: 'Invalid Email', text: 'Please enter a valid email address' });
            return;
        }

        try {
            await addDoc(collection(db, 'newsletter'), {
                email: email,
                subscribedAt: serverTimestamp(),
                source: 'blog_page'
            });
            Swal.fire({ icon: 'success', title: 'Subscribed!', text: 'Thank you for subscribing to our newsletter!', timer: 2000, showConfirmButton: false });
            document.getElementById('newsletterEmail').value = '';
        } catch (error) {
            console.error('Newsletter error:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to subscribe. Please try again.' });
        }
    });
}

// Initialize
loadPosts();
updateCartCount();
