
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, doc, getDocs, setDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let currentIcon = '⚡', currentBg = 'from-indigo-600 via-purple-600 to-pink-600';
let currentAnnouncementId = null;

// Toggle between URL and Coupon sections
document.getElementById('linkType').addEventListener('change', (e) => {
    const urlSection = document.getElementById('urlSection');
    const couponSection = document.getElementById('couponSection');
    if (e.target.value === 'coupon') {
        urlSection.classList.add('hidden');
        couponSection.classList.remove('hidden');
    } else {
        urlSection.classList.remove('hidden');
        couponSection.classList.add('hidden');
    }
    updatePreview();
});

async function loadSettings() {
    try {
        // Get the active announcement (only one active announcement at a time)
        const announcementsRef = collection(db, 'announcements');
        const q = query(announcementsRef);
        const querySnapshot = await getDocs(q);

        // Get the first announcement (we'll only keep one active announcement)
        if (!querySnapshot.empty) {
            const docSnap = querySnapshot.docs[0];
            currentAnnouncementId = docSnap.id;
            const d = docSnap.data();
            document.getElementById('announcementEnabled').checked = d.enabled || false;
            document.getElementById('announcementMessage').value = d.message || 'FLASH SALE! Up to 50% OFF';
            document.getElementById('buttonText').value = d.buttonText || 'Shop Now';
            document.getElementById('buttonLink').value = d.buttonLink || '/Pages/shop.html?category=sale';
            document.getElementById('couponCode').value = d.couponCode || '';
            document.getElementById('couponDiscount').value = d.couponDiscount || 20;
            document.getElementById('countdownHours').value = d.countdownHours || '24';
            document.getElementById('linkType').value = d.linkType || 'url';
            currentIcon = d.icon || '⚡';
            currentBg = d.bgColor || 'from-indigo-600 via-purple-600 to-pink-600';

            // Show/hide sections based on saved link type
            const urlSection = document.getElementById('urlSection');
            const couponSection = document.getElementById('couponSection');
            if (d.linkType === 'coupon') {
                urlSection.classList.add('hidden');
                couponSection.classList.remove('hidden');
            } else {
                urlSection.classList.remove('hidden');
                couponSection.classList.add('hidden');
            }

            updatePreview();
        } else {
            // Default values for new announcement
            currentAnnouncementId = null;
            document.getElementById('announcementEnabled').checked = true;
            updatePreview();
        }
    } catch (e) {
        console.error('Error loading settings:', e);
    }
}

function updatePreview() {
    const enabled = document.getElementById('announcementEnabled').checked;
    document.getElementById('previewIcon').textContent = currentIcon;
    document.getElementById('previewMessage').textContent = document.getElementById('announcementMessage').value;
    const linkType = document.getElementById('linkType').value;
    const buttonText = document.getElementById('buttonText').value;
    if (linkType === 'coupon') {
        const couponCode = document.getElementById('couponCode').value;
        document.getElementById('previewButton').textContent = couponCode ? `Get ${couponCode} →` : (buttonText + ' →');
    } else {
        document.getElementById('previewButton').textContent = buttonText + ' →';
    }
    document.getElementById('previewBar').className = `bg-gradient-to-r ${currentBg} text-white rounded-xl overflow-hidden shadow-lg ${!enabled ? 'opacity-50' : ''}`;
    const hours = parseInt(document.getElementById('countdownHours').value);
    document.getElementById('previewTimer').textContent = `${hours.toString().padStart(2, '0')}:00:00`;
}

async function saveSettings() {
    const saveBtn = document.getElementById('saveSettings');
    const originalHTML = saveBtn.innerHTML;

    // Show spinner
    saveBtn.innerHTML = `
                <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving...</span>
            `;
    saveBtn.disabled = true;

    const linkType = document.getElementById('linkType').value;
    let buttonLink = document.getElementById('buttonLink').value;
    let couponCode = null;
    let couponDiscount = null;

    if (linkType === 'coupon') {
        couponCode = document.getElementById('couponCode').value;
        couponDiscount = parseInt(document.getElementById('couponDiscount').value) || 20;
        buttonLink = '';
    }

    const data = {
        enabled: document.getElementById('announcementEnabled').checked,
        icon: currentIcon,
        message: document.getElementById('announcementMessage').value,
        buttonText: document.getElementById('buttonText').value,
        buttonLink: buttonLink,
        linkType: linkType,
        couponCode: couponCode,
        couponDiscount: couponDiscount,
        countdownHours: parseInt(document.getElementById('countdownHours').value),
        bgColor: currentBg,
        updatedAt: new Date()
    };

    try {
        const announcementsRef = collection(db, 'announcements');

        // If we have an existing announcement, update it
        if (currentAnnouncementId) {
            const announcementDoc = doc(db, 'announcements', currentAnnouncementId);
            await setDoc(announcementDoc, data);
        } else {
            // Create new announcement document
            const newDocRef = doc(announcementsRef);
            currentAnnouncementId = newDocRef.id;
            await setDoc(newDocRef, data);
        }

        Swal.fire({
            title: 'Success!',
            text: 'Announcement bar settings saved!',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false
        });
    } catch (e) {
        console.error('Error saving:', e);
        Swal.fire({
            title: 'Error!',
            text: 'Failed to save settings: ' + e.message,
            icon: 'error',
            confirmButtonColor: '#4f46e5'
        });
    } finally {
        // Restore button
        saveBtn.innerHTML = originalHTML;
        saveBtn.disabled = false;
    }
}

// Icon selection event listeners
document.querySelectorAll('.icon-option').forEach(btn => {
    btn.addEventListener('click', () => {
        currentIcon = btn.dataset.icon;
        document.querySelectorAll('.icon-option').forEach(i => i.classList.remove('ring-2', 'ring-indigo-500'));
        btn.classList.add('ring-2', 'ring-indigo-500');
        updatePreview();
    });
});

// Background color selection event listeners
document.querySelectorAll('[data-bg]').forEach(btn => {
    btn.addEventListener('click', () => {
        currentBg = btn.dataset.bg;
        document.querySelectorAll('[data-bg]').forEach(i => i.classList.remove('ring-2', 'ring-indigo-500'));
        btn.classList.add('ring-2', 'ring-indigo-500');
        updatePreview();
    });
});

// Form event listeners
document.getElementById('announcementEnabled').addEventListener('change', updatePreview);
document.getElementById('announcementMessage').addEventListener('input', updatePreview);
document.getElementById('buttonText').addEventListener('input', updatePreview);
document.getElementById('buttonLink').addEventListener('input', updatePreview);
document.getElementById('couponCode').addEventListener('input', updatePreview);
document.getElementById('couponDiscount').addEventListener('input', updatePreview);
document.getElementById('countdownHours').addEventListener('change', updatePreview);
document.getElementById('saveSettings').addEventListener('click', saveSettings);

// Sidebar functions
window.openSidebar = () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').style.display = 'block';
};
window.closeSidebar = () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').style.display = 'none';
};

// Dark mode
const darkToggle = document.getElementById('darkToggle'), themeIcon = document.getElementById('themeIcon');
function applyDark(on) {
    document.documentElement.classList.toggle('dark', on);
    themeIcon.className = on ? 'fas fa-sun text-sm' : 'fas fa-moon text-sm';
    localStorage.setItem('darkMode', on);
}
applyDark(localStorage.getItem('darkMode') === 'true');
darkToggle.addEventListener('click', () => applyDark(!document.documentElement.classList.contains('dark')));

// Auth check
onAuthStateChanged(auth, async (user) => {
    if (user && ADMIN_EMAILS.includes(user.email)) {
        document.getElementById('adminName').textContent = user.displayName || user.email.split('@')[0];
        document.getElementById('adminEmail').textContent = user.email;
        loadSettings();
    } else if (user) {
        Swal.fire('Access Denied', 'You are not authorized to view this page', 'error').then(() => window.location.href = './Dashboard.html');
    } else {
        window.location.href = './index.html';
    }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = './index.html';
});
