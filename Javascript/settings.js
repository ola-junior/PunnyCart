import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { openModal, closeModal, addToCart, updateCartCount, cart } from './main.js';

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


async function loadUserProfile(user) {
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const userData = userDoc.data();

    document.getElementById('profileName').textContent = userData?.fullName || user.displayName || 'User';
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('profileAvatar').src = userData?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=4f46e5&color=fff&bold=true`;

  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'signup.html';
    return;
  }
  loadUserProfile(user);
});

document.getElementById('changePasswordForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const user = auth.currentUser;
  if (!user) return;

  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;

  if (newPassword !== confirmNewPassword) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'New passwords do not match'
    });
    return;
  }

  if (newPassword.length < 8 || !/\d/.test(newPassword)) {
    Swal.fire({
      icon: 'error',
      title: 'Weak Password',
      text: 'Password must be at least 8 characters with at least one number'
    });
    return;
  }

  try {
    Swal.fire({
      title: 'Updating Password...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    await updatePassword(user, newPassword);

    Swal.fire({
      icon: 'success',
      title: 'Success',
      text: 'Password updated successfully',
      timer: 1500,
      showConfirmButton: false
    });

    document.getElementById('changePasswordForm').reset();

  } catch (error) {
    console.error('Password update error:', error);

    let errorMessage = 'Failed to update password';
    if (error.code === 'auth/wrong-password') {
      errorMessage = 'Current password is incorrect';
    }

    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: errorMessage
    });
  }
});

window.deleteAccount = async function () {
  const result = await Swal.fire({
    title: 'Delete Account',
    text: 'Are you sure you want to delete your account? This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#4f46e5',
    confirmButtonText: 'Yes, delete my account',
    cancelButtonText: 'Cancel'
  });

  if (result.isConfirmed) {
    const user = auth.currentUser;
    if (!user) return;

    try {
      Swal.fire({
        title: 'Deleting Account...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      await deleteDoc(doc(db, 'users', user.uid));

      await deleteUser(user);

      Swal.fire({
        icon: 'success',
        title: 'Account Deleted',
        text: 'Your account has been permanently deleted',
        timer: 1500,
        showConfirmButton: false
      });

      setTimeout(() => {
        window.location.href = '../index.html';
      }, 1500);

    } catch (error) {
      console.error('Delete account error:', error);

      if (error.code === 'auth/requires-recent-login') {
        Swal.fire({
          icon: 'info',
          title: 'Re-authentication Required',
          text: 'Please sign out and sign in again before deleting your account',
          confirmButtonColor: '#4f46e5'
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete account'
        });
      }
    }
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
  displayFeaturedProducts();
  updateCartCount();
  window.openModal = openModal;
  window.closeModal = closeModal;
});