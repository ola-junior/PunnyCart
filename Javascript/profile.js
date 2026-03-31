import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { products, openModal, closeModal, addToCart, updateCartCount, cart } from './main.js';
import { getAuth, onAuthStateChanged, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');

if (mobileMenuToggle && mobileMenu) {
  mobileMenuToggle.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
  });
}

window.addEventListener('resize', () => {
  if (window.innerWidth >= 768 && mobileMenu) {
    mobileMenu.classList.add('hidden');
  }
});

function updateHeaderProfile(photoURL, displayName) {
  const headerProfileIcon = document.getElementById('mobileProfileIcon');
  if (headerProfileIcon) {
    headerProfileIcon.innerHTML = `
      <img src="${photoURL}" alt="${displayName}" class="w-8 h-8 rounded-full border-2 border-indigo-600 object-cover">
    `;
    headerProfileIcon.classList.remove('hidden');
  }
}

async function loadUserProfile(user) {
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();

    document.getElementById('profileName').textContent = userData?.fullName || user.displayName || 'User';
    document.getElementById('profileEmail').textContent = user.email;

    const photoURL = userData?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=4f46e5&color=fff&bold=true&size=128`;
    document.getElementById('profileAvatar').src = photoURL;
    
    updateHeaderProfile(photoURL, userData?.fullName || user.displayName || 'User');
    
    document.getElementById('fullName').value = userData?.fullName || user.displayName || '';
    document.getElementById('username').value = userData?.username || '';
    document.getElementById('email').value = user.email;
    document.getElementById('phone').value = userData?.phone || '';
    document.getElementById('address').value = userData?.address || '';

    if (user.metadata?.creationTime) {
      const creationDate = new Date(user.metadata.creationTime);
      document.getElementById('memberSince').textContent = creationDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } else {
      document.getElementById('memberSince').textContent = 'N/A';
    }

    if (userData?.updatedAt) {
      const updatedDate = new Date(userData.updatedAt);
      document.getElementById('lastUpdated').textContent = updatedDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      document.getElementById('lastUpdated').textContent = 'Not updated yet';
    }

    const verifiedBadge = document.getElementById('emailVerifiedBadge');
    if (verifiedBadge) {
      if (user.emailVerified) {
        verifiedBadge.innerHTML = '<span class="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full"><i class="fas fa-check-circle mr-1"></i>Email Verified</span>';
      } else {
        verifiedBadge.innerHTML = '<span class="inline-flex items-center px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full"><i class="fas fa-exclamation-circle mr-1"></i>Email Not Verified <button onclick="resendVerificationEmail()" class="ml-2 text-indigo-600 hover:text-indigo-700">Resend</button></span>';
      }
    }

  } catch (error) {
    console.error('Error loading profile:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to load profile'
    });
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'signup.html';
    return;
  }
  loadUserProfile(user);
});

document.getElementById('profileForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return;

  const fullName = document.getElementById('fullName').value;
  const username = document.getElementById('username').value;
  const phone = document.getElementById('phone').value;
  const address = document.getElementById('address').value;

  try {
    Swal.fire({
      title: 'Saving...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    await updateProfile(user, {
      displayName: fullName
    });

    await updateDoc(doc(db, 'users', user.uid), {
      fullName,
      username,
      phone,
      address,
      updatedAt: new Date().toISOString()
    });

    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: 'Profile updated successfully',
      timer: 1500,
      showConfirmButton: false
    });

    loadUserProfile(user);

  } catch (error) {
    console.error('Error updating profile:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to update profile'
    });
  }
});

document.getElementById('profileImageInput')?.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    Swal.fire({
      icon: 'error',
      title: 'Invalid File',
      text: 'Please select an image file'
    });
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    Swal.fire({
      icon: 'error',
      title: 'File Too Large',
      text: 'Image must be less than 2MB'
    });
    return;
  }

  const user = auth.currentUser;
  if (!user) return;

  try {
    Swal.fire({
      title: 'Processing...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const reader = new FileReader();
    reader.onload = async function(event) {
      try {
        const base64Image = event.target.result;

        await updateDoc(doc(db, 'users', user.uid), {
          photoURL: base64Image,
          updatedAt: new Date().toISOString()
        });

        document.getElementById('profileAvatar').src = base64Image;
        updateHeaderProfile(base64Image, user.displayName || 'User');

        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Profile picture updated successfully',
          timer: 1500,
          showConfirmButton: false
        });

      } catch (error) {
        console.error('Error updating profile:', error);
        Swal.fire({
          icon: 'error',
          title: 'Update Failed',
          text: 'Failed to update profile picture'
        });
      }
    };
    
    reader.readAsDataURL(file);

  } catch (error) {
    console.error('Error processing image:', error);
    Swal.fire({
      icon: 'error',
      title: 'Upload Failed',
      text: 'Failed to process profile picture. Please try again.'
    });
  }
});

window.resendVerificationEmail = async function () {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await user.sendEmailVerification();
    Swal.fire({
      icon: 'success',
      title: 'Email Sent',
      text: 'Verification email has been resent. Please check your inbox.',
      timer: 2000,
      showConfirmButton: false
    });
  } catch (error) {
    console.error('Error resending verification:', error);
    Swal.fire({
      icon: 'error',
      title: 'Failed',
      text: 'Could not resend verification email. Please try again.'
    });
  }
};

window.decrementQuantity = function () {
  const quantityEl = document.getElementById('quantity');
  if (!quantityEl) return;
  let quantity = parseInt(quantityEl.textContent);
  if (quantity > 1) {
    quantityEl.textContent = quantity - 1;
  }
};

window.incrementQuantity = function () {
  const quantityEl = document.getElementById('quantity');
  if (!quantityEl) return;
  let quantity = parseInt(quantityEl.textContent);
  if (quantity < 10) {
    quantityEl.textContent = quantity + 1;
  }
};

window.addToCartFromModal = function () {
  if (!window.currentProduct) return;
  const quantity = parseInt(document.getElementById('quantity').textContent);
  addToCart(window.currentProduct, quantity);
  closeModal();
};

document.addEventListener('DOMContentLoaded', () => {
  if (typeof displayFeaturedProducts === 'function') {
    displayFeaturedProducts();
  }
  updateCartCount();
  window.openModal = openModal;
  window.closeModal = closeModal;
});