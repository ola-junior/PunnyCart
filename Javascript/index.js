import { products, openModal, closeModal, addToCart, updateCartCount, cart, toggleWishlist, isInWishlist, getUserWishlist, loadUserWishlist } from './main.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, where, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

const featuredProducts = document.getElementById('featuredProducts');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');
const backToTop = document.getElementById('backToTop');
const heroSection = document.getElementById('heroSection');
const announcementPlaceholder = document.getElementById('announcementPlaceholder');

let currentBannerIndex = 0;
let bannerInterval = null;
let banners = [];
let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
        await loadUserWishlist(user.uid);
        displayFeaturedProducts();
    } else {
        displayFeaturedProducts();
    }
});

if (mobileMenuToggle && mobileMenu) {
    mobileMenuToggle.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
}

if (backToTop) {
    window.addEventListener('scroll', () => {
        backToTop.style.opacity = window.scrollY > 300 ? '1' : '0';
        backToTop.style.visibility = window.scrollY > 300 ? 'visible' : 'hidden';
    });
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

window.addEventListener('resize', () => {
    if (window.innerWidth >= 768 && mobileMenu) mobileMenu.classList.add('hidden');
});

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

function showProductsLoading() {
    if (!featuredProducts) return;
    featuredProducts.innerHTML = `
        <div class="col-span-full flex justify-center items-center py-20">
            <div class="text-center">
                <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p class="mt-4 text-gray-500 dark:text-gray-400">Loading products...</p>
            </div>
        </div>
    `;
}

// ==================== COUPON FUNCTIONS ====================

function showProfessionalCouponModal(couponCode, discount, message = '') {
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'fixed inset-0 bg-black/70 backdrop-blur-sm z-[300] flex items-center justify-center p-4 opacity-0 transition-all duration-300';
    modalOverlay.id = 'couponModal';

    modalOverlay.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-md w-full overflow-hidden shadow-2xl transform scale-95 transition-all duration-300">
            <div class="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-center relative overflow-hidden">
                <div class="absolute inset-0 bg-white/10 transform -skew-x-12"></div>
                <div class="relative">
                    <div class="text-6xl mb-3 animate-bounce">🎉</div>
                    <h3 class="text-2xl font-bold text-white">Special Offer!</h3>
                    <p class="text-indigo-200 text-sm mt-1">Limited time only</p>
                </div>
            </div>
            <div class="p-6 text-center">
                <p class="text-gray-600 dark:text-gray-400 text-sm mb-4">Use this coupon code at checkout:</p>
                <div class="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-xl p-4 mb-5 border-2 border-dashed border-indigo-300 dark:border-indigo-700">
                    <div class="flex items-center justify-between gap-3">
                        <code class="text-2xl font-mono font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">${couponCode}</code>
                        <button id="copyCouponBtn" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all transform hover:scale-105 flex items-center gap-2">
                            <i class="fas fa-copy"></i>
                            <span>Copy</span>
                        </button>
                    </div>
                </div>
                <div class="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-4 py-2 rounded-full mb-4">
                    <i class="fas fa-tag text-green-600 dark:text-green-400"></i>
                    <span class="text-lg font-bold text-green-600 dark:text-green-400">${discount}% OFF</span>
                    <span class="text-xs text-gray-500">on entire order</span>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">${message || 'Don\'t miss out on this amazing deal!'}</p>
                <div class="flex gap-3">
                    <button id="shopNowBtn" class="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-all transform hover:scale-105">Shop Now</button>
                    <button id="closeModalBtn" class="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white font-semibold py-2.5 rounded-lg transition-all">Maybe Later</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modalOverlay);

    setTimeout(() => {
        modalOverlay.style.opacity = '1';
        const modalContent = modalOverlay.querySelector('.bg-white');
        if (modalContent) modalContent.style.transform = 'scale(1)';
    }, 10);

    const copyBtn = modalOverlay.querySelector('#copyCouponBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', async () => {
            await navigator.clipboard.writeText(couponCode);
            copyBtn.innerHTML = '<i class="fas fa-check"></i><span>Copied!</span>';
            copyBtn.classList.remove('bg-indigo-600');
            copyBtn.classList.add('bg-green-600');
            setTimeout(() => {
                copyBtn.innerHTML = '<i class="fas fa-copy"></i><span>Copy</span>';
                copyBtn.classList.remove('bg-green-600');
                copyBtn.classList.add('bg-indigo-600');
            }, 2000);
            showToastNotification('Coupon copied to clipboard!', 'success');
        });
    }

    const shopBtn = modalOverlay.querySelector('#shopNowBtn');
    if (shopBtn) {
        shopBtn.addEventListener('click', () => {
            modalOverlay.remove();
            window.location.href = './Pages/shop.html';
        });
    }

    const closeBtn = modalOverlay.querySelector('#closeModalBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modalOverlay.style.opacity = '0';
            setTimeout(() => modalOverlay.remove(), 300);
        });
    }

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.style.opacity = '0';
            setTimeout(() => modalOverlay.remove(), 300);
        }
    });
}

function showToastNotification(message, type = 'success') {
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-gradient-to-r from-green-500 to-emerald-600',
        error: 'bg-gradient-to-r from-red-500 to-rose-600',
        info: 'bg-gradient-to-r from-blue-500 to-cyan-600',
        warning: 'bg-gradient-to-r from-yellow-500 to-orange-600'
    };

    toast.className = `fixed top-20 right-4 z-[250] ${colors[type]} text-white px-5 py-3 rounded-xl shadow-2xl transform translate-x-full transition-all duration-500 flex items-center gap-3 max-w-sm`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} text-xl"></i><span class="text-sm font-medium">${message}</span>`;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('translate-x-full');
        toast.classList.add('translate-x-0');
    }, 10);

    setTimeout(() => {
        toast.classList.add('translate-x-full');
        setTimeout(() => toast.remove(), 500);
    }, 4000);
}

function showFloatingCouponNotification(couponCode, discount) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-6 right-6 z-[200] bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl shadow-2xl overflow-hidden transform translate-x-full transition-all duration-500 cursor-pointer group';
    notification.style.maxWidth = '320px';

    notification.innerHTML = `
        <div class="relative p-4">
            <div class="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10"></div>
            <div class="flex items-start gap-3 relative">
                <div class="flex-shrink-0"><div class="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse"><i class="fas fa-gift text-2xl"></i></div></div>
                <div class="flex-1"><p class="font-bold text-sm">🎉 Special Offer!</p><p class="text-xs mt-1 opacity-90">Get <span class="font-bold text-yellow-300">${discount}% OFF</span></p><div class="mt-2 bg-white/20 rounded-lg p-1.5 text-center"><code class="text-sm font-mono font-bold tracking-wider">${couponCode}</code></div></div>
                <button class="close-notification text-white/70 hover:text-white text-xs absolute top-1 right-1"><i class="fas fa-times"></i></button>
            </div>
        </div>
        <div class="absolute bottom-0 left-0 right-0 h-1 bg-yellow-400 animate-shrink-width"></div>
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.remove('translate-x-full');
        notification.classList.add('translate-x-0');
    }, 100);

    notification.addEventListener('click', (e) => {
        if (!e.target.classList.contains('close-notification')) {
            showProfessionalCouponModal(couponCode, discount);
            notification.remove();
        }
    });

    const closeBtn = notification.querySelector('.close-notification');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 500);
        });
    }

    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.add('translate-x-full');
            setTimeout(() => notification.remove(), 500);
        }
    }, 8000);
}

// ==================== ANNOUNCEMENT BAR ====================

async function loadAnnouncementBar() {
    try {
        const announcementsRef = collection(db, 'announcements');
        const querySnapshot = await getDocs(announcementsRef);

        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            const announcementData = docSnap.data();
            if (announcementData.enabled) {
                createAnnouncementBar(announcementData);
            }
        }
    } catch (error) {
        console.error('Error loading announcement:', error);
    }
}

function createAnnouncementBar(data) {
    if (!announcementPlaceholder) return;
    if (document.getElementById('announcementBarContainer')) return;

    const isCoupon = data.linkType === 'coupon' && data.couponCode;

    let endTime;
    const savedEndTime = localStorage.getItem('announcementEndTime');
    const currentTime = new Date().getTime();

    if (savedEndTime && parseInt(savedEndTime) > currentTime) {
        endTime = parseInt(savedEndTime);
    } else if (savedEndTime && parseInt(savedEndTime) <= currentTime) {
        localStorage.removeItem('announcementEndTime');
        localStorage.removeItem('announcementClosed');
        return;
    } else {
        endTime = currentTime + (data.countdownHours || 24) * 60 * 60 * 1000;
        localStorage.setItem('announcementEndTime', endTime);
    }

    const announcementHTML = `
        <div id="announcementBarContainer" class="sticky top-0 z-[100] overflow-hidden">
            <div class="bg-gradient-to-r ${data.bgColor || 'from-indigo-600 via-purple-600 to-pink-600'} text-white">
                <div class="container mx-auto px-4 py-2.5 sm:py-3">
                    <div class="flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
                        <div class="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
                            <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center animate-pulse"><span class="text-base">${escapeHtml(data.icon || '⚡')}</span></div>
                            <span class="font-semibold text-sm sm:text-base">${escapeHtml(data.message)}</span>
                            ${isCoupon ? `<div class="relative group">
                                <span class="bg-gradient-to-r from-yellow-400 to-orange-500 text-gray-900 px-3 py-1 rounded-full text-xs font-mono font-bold shadow-lg flex items-center gap-1 cursor-pointer hover:scale-105 transition-transform">
                                    <i class="fas fa-ticket-alt text-xs"></i> ${escapeHtml(data.couponCode)} <i class="fas fa-copy text-xs opacity-70"></i>
                                </span>
                                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Click to copy</div>
                            </div>` : ''}
                        </div>
                        <div class="flex items-center gap-2 sm:gap-3">
                            <div class="flex items-center gap-1 sm:gap-2 bg-black/20 backdrop-blur-sm rounded-full px-3 sm:px-4 py-1 sm:py-1.5">
                                <i class="fas fa-clock text-xs sm:text-sm"></i>
                                <span class="text-xs sm:text-sm font-mono font-bold">ENDS IN:</span>
                                <div class="flex gap-1 sm:gap-2">
                                    <span class="bg-white/20 rounded px-1.5 sm:px-2 py-0.5 text-xs sm:text-sm font-mono font-bold" id="announcementHours">00</span>
                                    <span>:</span>
                                    <span class="bg-white/20 rounded px-1.5 sm:px-2 py-0.5 text-xs sm:text-sm font-mono font-bold" id="announcementMinutes">00</span>
                                    <span>:</span>
                                    <span class="bg-white/20 rounded px-1.5 sm:px-2 py-0.5 text-xs sm:text-sm font-mono font-bold" id="announcementSeconds">00</span>
                                </div>
                            </div>
                            <button id="announcementActionBtn" class="bg-white text-indigo-600 hover:bg-indigo-50 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-300 transform hover:scale-105 shadow-md whitespace-nowrap flex items-center gap-1">${isCoupon ? '<i class="fas fa-gift text-xs"></i> Get Offer' : (escapeHtml(data.buttonText || 'Shop Now') + ' →')}</button>
                            <button id="closeAnnouncementBtn" class="text-white/70 hover:text-white transition-colors ml-1 sm:ml-2 w-6 h-6 rounded-full hover:bg-white/10 flex items-center justify-center"><i class="fas fa-times text-xs sm:text-sm"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    announcementPlaceholder.innerHTML = announcementHTML;
    startAnnouncementCountdown(endTime);

    if (isCoupon && data.couponCode) {
        const couponBadge = document.querySelector('#announcementBarContainer .bg-gradient-to-r.from-yellow-400, #announcementBarContainer [class*="from-yellow-400"]');
        if (couponBadge) {
            couponBadge.addEventListener('click', async (e) => {
                e.stopPropagation();
                await navigator.clipboard.writeText(data.couponCode);
                showToastNotification(`Coupon ${data.couponCode} copied!`, 'success');
                const originalText = couponBadge.innerHTML;
                couponBadge.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => { couponBadge.innerHTML = originalText; }, 1500);
            });
        }
    }

    const actionBtn = document.getElementById('announcementActionBtn');
    if (actionBtn) {
        actionBtn.addEventListener('click', async () => {
            if (isCoupon && data.couponCode) {
                showProfessionalCouponModal(data.couponCode, data.couponDiscount || 20);
                showFloatingCouponNotification(data.couponCode, data.couponDiscount || 20);
            } else if (data.buttonLink) {
                window.location.href = data.buttonLink;
            }
        });
    }

    const closeBtn = document.getElementById('closeAnnouncementBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const container = document.getElementById('announcementBarContainer');
            if (container) {
                container.style.display = 'none';
            }
            localStorage.setItem('announcementClosed', 'true');
        });
    }

    if (localStorage.getItem('announcementClosed') === 'true') {
        const container = document.getElementById('announcementBarContainer');
        if (container) container.style.display = 'none';
    }
}

function startAnnouncementCountdown(endTime) {
    const announcementBar = document.getElementById('announcementBarContainer');

    function updateCountdown() {
        const now = new Date().getTime();
        const diff = endTime - now;

        const hoursEl = document.getElementById('announcementHours');
        const minutesEl = document.getElementById('announcementMinutes');
        const secondsEl = document.getElementById('announcementSeconds');

        if (!hoursEl) return;

        if (diff <= 0) {
            hoursEl.textContent = '00';
            minutesEl.textContent = '00';
            secondsEl.textContent = '00';
            localStorage.removeItem('announcementEndTime');
            localStorage.removeItem('announcementClosed');

            if (announcementBar) {
                announcementBar.style.display = 'none';
            }
            return;
        }

        const hrs = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        hoursEl.textContent = hrs.toString().padStart(2, '0');
        minutesEl.textContent = mins.toString().padStart(2, '0');
        secondsEl.textContent = secs.toString().padStart(2, '0');
    }

    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// ==================== BANNER FUNCTIONALITY ====================

async function fetchBanners() {
    if (!heroSection) return;
    try {
        const q = query(collection(db, 'banners'), where('active', '==', true));
        const snapshot = await getDocs(q);
        banners = [];
        const today = new Date().toISOString().split('T')[0];
        snapshot.forEach(docSnap => {
            const banner = docSnap.data();
            const hasStart = banner.startDate && banner.startDate !== "";
            const hasEnd = banner.endDate && banner.endDate !== "";
            let isValid = true;
            if (hasStart && banner.startDate > today) isValid = false;
            if (hasEnd && banner.endDate < today) isValid = false;
            if (isValid && banner.image && banner.title) banners.push({ id: docSnap.id, ...banner, order: banner.order || 999 });
        });
        banners.sort((a, b) => a.order - b.order);
        if (banners.length > 0) createBannerSlider();
    } catch (error) { console.error('Error fetching banners:', error); }
}

function createBannerSlider() {
    if (!heroSection || banners.length === 0) return;
    heroSection.innerHTML = `
        <div class="banner-slider-container relative overflow-hidden w-full h-full min-h-[400px] md:min-h-[500px] lg:min-h-[600px]">
            <div id="bannerSlider" class="flex transition-transform duration-500 ease-in-out h-full">
                ${banners.map(banner => `<div class="w-full flex-shrink-0 relative h-full"><div class="relative group w-full h-full cursor-pointer" onclick="window.location.href='${banner.link || './Pages/shop.html'}'"><img src="${banner.image}" alt="${escapeHtml(banner.title)}" class="w-full h-full object-cover"><div class="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent"></div><div class="absolute inset-0 flex items-center justify-start p-8 md:p-12 lg:p-16"><div class="text-white max-w-xl"><h2 class="text-2xl md:text-3xl lg:text-5xl font-bold mb-4 animate-fade-in">${escapeHtml(banner.title)}</h2>${banner.subtitle ? `<p class="text-base md:text-lg lg:text-xl mb-6 animate-fade-in-delay">${escapeHtml(banner.subtitle)}</p>` : ''}${banner.buttonText ? `<button class="px-5 py-2 md:px-6 md:py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition-all transform hover:scale-105 animate-fade-in-delay-2">${escapeHtml(banner.buttonText)} →</button>` : ''}</div></div></div></div>`).join('')}
            </div>
            ${banners.length > 1 ? `<button id="prevBanner" class="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all z-10"><i class="fas fa-chevron-left"></i></button><button id="nextBanner" class="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center transition-all z-10"><i class="fas fa-chevron-right"></i></button><div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">${banners.map((_, i) => `<button class="banner-dot w-2 h-2 rounded-full transition-all ${i === 0 ? 'bg-white w-6' : 'bg-white/50'}" data-index="${i}"></button>`).join('')}</div>` : ''}
        </div>
    `;
    heroSection.classList.remove('py-12', 'sm:py-16', 'md:py-24');
    heroSection.classList.add('p-0');
    if (banners.length > 1) {
        startBannerSlider();
        document.getElementById('prevBanner')?.addEventListener('click', () => { stopBannerSlider(); currentBannerIndex = (currentBannerIndex - 1 + banners.length) % banners.length; updateBannerSlider(); startBannerSlider(); });
        document.getElementById('nextBanner')?.addEventListener('click', () => { stopBannerSlider(); currentBannerIndex = (currentBannerIndex + 1) % banners.length; updateBannerSlider(); startBannerSlider(); });
        document.querySelectorAll('.banner-dot').forEach(dot => dot.addEventListener('click', (e) => { stopBannerSlider(); currentBannerIndex = parseInt(e.target.dataset.index); updateBannerSlider(); startBannerSlider(); }));
    }
}

function updateBannerSlider() {
    const slider = document.getElementById('bannerSlider');
    if (slider) slider.style.transform = `translateX(-${currentBannerIndex * 100}%)`;
    document.querySelectorAll('.banner-dot').forEach((dot, i) => {
        dot.classList.toggle('bg-white', i === currentBannerIndex);
        dot.classList.toggle('w-6', i === currentBannerIndex);
        dot.classList.toggle('bg-white/50', i !== currentBannerIndex);
        dot.classList.toggle('w-2', i !== currentBannerIndex);
    });
}

function startBannerSlider() { if (banners.length > 1) { stopBannerSlider(); bannerInterval = setInterval(() => { currentBannerIndex = (currentBannerIndex + 1) % banners.length; updateBannerSlider(); }, 5000); } }
function stopBannerSlider() { if (bannerInterval) { clearInterval(bannerInterval); bannerInterval = null; } }

// ==================== WISHLIST FUNCTIONS ====================

async function handleWishlistClick(e, product) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const heartIcon = btn.querySelector('.heart-icon');
    const wasInWishlist = isInWishlist(product.id);

    await toggleWishlist(product);

    if (heartIcon) {
        if (!wasInWishlist) {
            heartIcon.innerHTML = '❤️';
            heartIcon.classList.remove('text-gray-400', 'dark:text-gray-500');
            heartIcon.classList.add('text-red-500');
        } else {
            heartIcon.innerHTML = '🤍';
            heartIcon.classList.remove('text-red-500');
            heartIcon.classList.add('text-gray-400', 'dark:text-gray-500');
        }
    }
}

// ==================== ADD TO CART FUNCTIONS ====================

async function handleAddToCartClick(e, product) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
    btn.disabled = true;
    await addToCart(product, 1);
    btn.innerHTML = '✓ Added';
    btn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
    btn.classList.add('bg-green-600', 'hover:bg-green-700');
    setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('bg-green-600', 'hover:bg-green-700');
        btn.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
        btn.disabled = false;
    }, 2000);
}

// ==================== DISPLAY PRODUCTS ====================

function displayFeaturedProducts() {
    if (!featuredProducts) return;

    showProductsLoading();

    setTimeout(() => {
        if (!products || products.length === 0) {
            console.error('Products array is empty or not loaded');
            featuredProducts.innerHTML = `
                <div class="col-span-full text-center py-16">
                    <i class="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
                    <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Failed to load products</h3>
                    <p class="text-gray-500 dark:text-gray-400">Please refresh the page</p>
                </div>
            `;
            return;
        }

        const featured = products.slice(0, 8);
        featuredProducts.innerHTML = featured.map(product => {
            const badgeColor = product.badge === 'Best Seller' ? 'bg-yellow-400 text-gray-900' : product.badge === 'New' ? 'bg-green-500 text-white' : product.badge === 'Popular' ? 'bg-purple-500 text-white' : product.badge === 'Trending' ? 'bg-blue-500 text-white' : product.badge === 'Premium' ? 'bg-indigo-500 text-white' : product.badge === 'Editors\' Choice' ? 'bg-pink-500 text-white' : 'bg-gray-500 text-white';

            const inWishlist = isInWishlist(product.id);
            const shortDesc = product.description.length > 80 ? product.description.substring(0, 80) + '...' : product.description;

            return `<div class="group bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 relative">
                <button class="wishlist-btn absolute top-3 right-3 z-20 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:scale-110 transition-transform duration-300" data-product-id="${product.id}">
                    <span class="heart-icon text-xl ${inWishlist ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}">${inWishlist ? '❤️' : '🤍'}</span>
                </button>
                <div onclick='openModal(${JSON.stringify(product).replace(/'/g, "\\'")})' class="cursor-pointer relative overflow-hidden h-48 sm:h-56 md:h-64">
                    <img src="${product.image}" alt="${product.title}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" loading="lazy">
                    ${product.discountPercentage ? `<div class="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded z-10">-${product.discountPercentage}%</div>` : ''}
                    <div class="absolute bottom-4 left-4 ${badgeColor} text-xs font-bold px-2 py-1 rounded z-10">${product.badge}</div>
                    <div class="absolute bottom-4 right-4 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded flex items-center gap-1"><span>★</span><span>${product.rating}</span></div>
                </div>
                <div onclick='openModal(${JSON.stringify(product).replace(/'/g, "\\'")})' class="p-4 cursor-pointer">
                    <p class="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mb-1">${product.category}</p>
                    <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">${product.title}</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">${shortDesc}</p>
                    <div class="flex items-center gap-2 mb-3">
                        <div class="flex text-yellow-400 text-sm">${'★'.repeat(Math.floor(product.rating))}${product.rating % 1 >= 0.5 ? '½' : ''}${'☆'.repeat(5 - Math.ceil(product.rating))}</div>
                        <span class="text-xs text-gray-500">(${product.reviews.toLocaleString()})</span>
                    </div>
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">$${product.price.toFixed(2)}</span>
                        ${product.discountPercentage ? `<span class="text-sm text-gray-500 line-through">$${product.originalPrice.toFixed(2)}</span><span class="text-xs text-green-600 font-semibold">-${product.discountPercentage}%</span>` : ''}
                    </div>
                </div>
                <div class="px-4 pb-4">
                    <button class="add-to-cart-btn w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2 text-sm sm:text-base" data-product-id="${product.id}">
                        <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Add to Cart
                    </button>
                </div>
            </div>`;
        }).join('');

        document.querySelectorAll('.wishlist-btn').forEach(btn => {
            const productId = parseInt(btn.dataset.productId);
            const product = products.find(p => p.id === productId);
            if (product) {
                btn.addEventListener('click', (e) => handleWishlistClick(e, product));
            }
        });
        document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
            const productId = parseInt(btn.dataset.productId);
            const product = products.find(p => p.id === productId);
            if (product) {
                btn.addEventListener('click', (e) => handleAddToCartClick(e, product));
            }
        });
    }, 100);
}

// ==================== MODAL FUNCTIONS ====================

window.decrementQuantity = () => { const q = document.getElementById('quantity'); if (q && parseInt(q.textContent) > 1) q.textContent = parseInt(q.textContent) - 1; };
window.incrementQuantity = () => { const q = document.getElementById('quantity'); if (q && parseInt(q.textContent) < 10) q.textContent = parseInt(q.textContent) + 1; };
window.addToCartFromModal = () => { if (window.currentProduct) addToCart(window.currentProduct, parseInt(document.getElementById('quantity').textContent)); closeModal(); };

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', async () => {
    await loadAnnouncementBar();
    updateCartCount();
    await fetchBanners();
    window.openModal = openModal;
    window.closeModal = closeModal;
});

// Export for use in other files if needed
export { fetchBanners, banners, updateBannerSlider, stopBannerSlider, startBannerSlider, loadAnnouncementBar };