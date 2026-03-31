import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  updateProfile,
  confirmPasswordReset,
  verifyPasswordResetCode,
  applyActionCode
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

function getBasePath() {
  return window.location.pathname.includes('/Pages/') ? '' : './Pages/';
}

async function getUserRole(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const role = userDoc.data().role;
      console.log('User role from Firestore:', role);
      return role || 'user';
    }
    return 'user';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'user';
  }
}

async function isAdmin(user) {
  if (!user) return false;
  
  if (ADMIN_EMAILS.includes(user.email)) {
    console.log('User is admin via email list');
    return true;
  }
  
  const role = await getUserRole(user.uid);
  console.log('User role check:', role === 'admin');
  return role === 'admin';
}

const darkToggle = document.getElementById('darkToggle');
const themeIcon = document.getElementById('themeIcon');

function setDarkMode(isDark) {
  if (isDark) {
    document.documentElement.classList.add('dark');
    localStorage.setItem('theme', 'dark');
    if (themeIcon) themeIcon.className = 'fas fa-sun text-sm';
  } else {
    document.documentElement.classList.remove('dark');
    localStorage.setItem('theme', 'light');
    if (themeIcon) themeIcon.className = 'fas fa-moon text-sm';
  }
}

if (darkToggle && themeIcon) {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
    setDarkMode(true);
  } else {
    setDarkMode(false);
  }

  darkToggle.addEventListener('click', () => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(!isDark);
  });
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('theme')) {
    setDarkMode(e.matches);
  }
});

async function updateEmailVerificationStatus(user) {
  if (!user) return false;

  try {
    await user.reload();
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      await updateDoc(userRef, { emailVerified: user.emailVerified });
    }
    return user.emailVerified;
  } catch (error) {
    console.error('Error updating email verification status:', error);
    return false;
  }
}

function updateCartCount() {
  const cartBadges = document.querySelectorAll('.cart-badge');
  cartBadges.forEach(badge => {
  });
}

window.updateCartCount = updateCartCount;

document.addEventListener('DOMContentLoaded', () => {
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fullName = document.getElementById('fullName').value;
      const email = document.getElementById('email').value;
      const username = document.getElementById('username').value;
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      const terms = document.getElementById('terms').checked;

      if (!terms) {
        Swal.fire({
          icon: 'error',
          title: 'Terms Required',
          text: 'Please agree to the Terms of Service and Privacy Policy'
        });
        return;
      }

      if (password !== confirmPassword) {
        Swal.fire({
          icon: 'error',
          title: 'Password Mismatch',
          text: 'Passwords do not match'
        });
        return;
      }

      if (password.length < 8 || !/\d/.test(password)) {
        Swal.fire({
          icon: 'error',
          title: 'Weak Password',
          text: 'Password must be at least 8 characters with at least one number'
        });
        return;
      }

      Swal.fire({
        title: 'Creating Account...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, { displayName: fullName });

        const isAdminEmail = ADMIN_EMAILS.includes(email);
        const role = isAdminEmail ? 'admin' : 'user';
        
        console.log('Email:', email);
        console.log('Is admin email?', isAdminEmail);
        console.log('Role to save:', role);

        const userData = {
          fullName: fullName,
          email: email,
          username: username,
          role: role,
          createdAt: new Date().toISOString(),
          photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=4f46e5&color=fff&bold=true`,
          emailVerified: false
        };
        
        console.log('Saving user data:', userData);
        await setDoc(doc(db, 'users', user.uid), userData);

        const actionCodeSettings = {
          url: `${window.location.origin}/Pages/verify-email.html`,
          handleCodeInApp: true
        };
        
        await sendEmailVerification(user, actionCodeSettings);
        console.log('Verification email sent');

        await Swal.fire({
          icon: 'success',
          title: 'Account Created!',
          html: `Your account has been created. Please verify your email address. A verification link has been sent to <b>${email}</b>`,
          confirmButtonColor: '#4f46e5'
        });

        await signOut(auth);
        window.location.href = 'login.html';

      } catch (error) {
        console.error('Signup error:', error);

        let errorMessage = 'An error occurred during signup';
        if (error.code === 'auth/email-already-in-use') {
          errorMessage = 'This email is already registered';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'Invalid email address';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'Password is too weak';
        }

        Swal.fire({
          icon: 'error',
          title: 'Signup Failed',
          text: errorMessage
        });
      }
    });
  }

  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;

      Swal.fire({
        title: 'Signing In...',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        const isVerified = await updateEmailVerificationStatus(user);

        if (!isVerified) {
          await Swal.fire({
            icon: 'warning',
            title: 'Email Not Verified',
            html: 'Please verify your email before logging in.',
            confirmButtonColor: '#4f46e5',
            showCancelButton: true,
            confirmButtonText: 'Resend Email',
            cancelButtonText: 'OK'
          }).then(async (result) => {
            if (result.isConfirmed) {
              const actionCodeSettings = {
                url: `${window.location.origin}/Pages/verify-email.html`,
                handleCodeInApp: true
              };
              await sendEmailVerification(user, actionCodeSettings);
              Swal.fire({
                icon: 'success',
                title: 'Email Sent!',
                text: 'A new verification link has been sent to your email.',
                timer: 2000,
                showConfirmButton: false
              });
            }
          });

          await signOut(auth);
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        let userRole = userData?.role || 'user';
        
        if (ADMIN_EMAILS.includes(email) && userRole !== 'admin') {
          userRole = 'admin';
          await updateDoc(doc(db, 'users', user.uid), { role: 'admin' });
        }
        
        console.log('User role on login:', userRole);

        await Swal.fire({
          icon: 'success',
          title: 'Welcome Back!',
          text: `Hello ${userData?.fullName || user.displayName || 'User'}!`,
          timer: 1500,
          showConfirmButton: false
        });

        window.location.href = '../index.html';

      } catch (error) {
        console.error('Login error:', error);

        let errorMessage = 'Invalid email or password';
        if (error.code === 'auth/user-not-found') errorMessage = 'No account found with this email';
        else if (error.code === 'auth/wrong-password') errorMessage = 'Incorrect password';
        else if (error.code === 'auth/too-many-requests') errorMessage = 'Too many failed attempts. Please try again later';
        else if (error.code === 'auth/invalid-credential') errorMessage = 'Invalid email or password';
        else if (error.code === 'auth/network') errorMessage = 'Check Your Network Connection And Try Again';
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: errorMessage
        });
      }
    });
  }
});

window.resendVerificationEmail = async function () {
  const user = auth.currentUser;
  if (!user) {
    Swal.fire({
      icon: 'error',
      title: 'No User',
      text: 'Please log in first to resend verification email.'
    });
    return;
  }

  try {
    const actionCodeSettings = {
      url: `${window.location.origin}/Pages/verify-email.html`,
      handleCodeInApp: true
    };
    await sendEmailVerification(user, actionCodeSettings);
    Swal.fire({
      icon: 'success',
      title: 'Email Sent!',
      text: 'A new verification link has been sent to your email.',
      timer: 2000,
      showConfirmButton: false
    });
  } catch (error) {
    console.error('Resend error:', error);
    Swal.fire({
      icon: 'error',
      title: 'Failed',
      text: 'Could not resend verification email. Please try again.'
    });
  }
};

window.forgotPassword = async function () {
  const { value: email } = await Swal.fire({
    title: 'Reset Password',
    input: 'email',
    inputLabel: 'Enter your email address',
    inputPlaceholder: 'your@email.com',
    showCancelButton: true,
    confirmButtonColor: '#4f46e5',
    confirmButtonText: 'Send Reset Link',
    cancelButtonText: 'Cancel',
    inputValidator: (value) => {
      if (!value) return 'Please enter your email';
      if (!/\S+@\S+\.\S+/.test(value)) return 'Please enter a valid email';
    }
  });

  if (email) {
    Swal.fire({
      title: 'Sending...',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });
    
    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/Pages/reset-password.html`,
        handleCodeInApp: true
      };
      
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      
      Swal.fire({
        icon: 'success',
        title: 'Reset Email Sent',
        html: 'A password reset link has been sent to <b>' + email + '</b>',
        confirmButtonColor: '#4f46e5'
      });
    } catch (error) {
      console.error('Password reset error:', error);
      let errorMessage = 'Failed to send reset email';
      if (error.code === 'auth/user-not-found') errorMessage = 'No account found with this email';
      Swal.fire({ icon: 'error', title: 'Error', text: errorMessage });
    }
  }
};

window.googleSignIn = window.googleSignUp = async function () {
  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const isAdminEmail = ADMIN_EMAILS.includes(user.email);
      const role = isAdminEmail ? 'admin' : 'user';
      
      await setDoc(userRef, {
        fullName: user.displayName,
        email: user.email,
        username: user.email.split('@')[0],
        role: role,
        createdAt: new Date().toISOString(),
        photoURL: user.photoURL,
        emailVerified: user.emailVerified
      });
    } else if (ADMIN_EMAILS.includes(user.email) && userDoc.data().role !== 'admin') {
      await updateDoc(userRef, { role: 'admin' });
    }

    Swal.fire({
      icon: 'success',
      title: 'Welcome!',
      text: `Hello ${user.displayName}!`,
      timer: 1500,
      showConfirmButton: false
    });

    setTimeout(() => window.location.href = '../index.html', 1500);

  } catch (error) {
    console.error('Google sign in error:', error);
    Swal.fire({
      icon: 'error',
      title: 'Sign In Failed',
      text: error.code === 'auth/unauthorized-domain'
        ? 'This domain is not authorized. Please add it to Firebase Console.'
        : 'Could not sign in with Google'
    });
  }
};

window.facebookSignIn = window.facebookSignUp = async function () {
  const provider = new FacebookAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      const isAdminEmail = ADMIN_EMAILS.includes(user.email);
      const role = isAdminEmail ? 'admin' : 'user';
      
      await setDoc(userRef, {
        fullName: user.displayName,
        email: user.email,
        username: user.email?.split('@')[0] || user.displayName?.replace(/\s+/g, '').toLowerCase(),
        role: role,
        createdAt: new Date().toISOString(),
        photoURL: user.photoURL,
        emailVerified: user.emailVerified
      });
    } else if (ADMIN_EMAILS.includes(user.email) && userDoc.data().role !== 'admin') {
      await updateDoc(userRef, { role: 'admin' });
    }

    Swal.fire({
      icon: 'success',
      title: 'Welcome!',
      text: `Hello ${user.displayName}!`,
      timer: 1500,
      showConfirmButton: false
    });

    setTimeout(() => window.location.href = '../index.html', 1500);

  } catch (error) {
    console.error('Facebook sign in error:', error);
    Swal.fire({
      icon: 'error',
      title: 'Sign In Failed',
      text: error.code === 'auth/unauthorized-domain'
        ? 'This domain is not authorized. Please add it to Firebase Console.'
        : 'Could not sign in with Facebook'
    });
  }
};

window.logout = async function() {
  console.log('🔍 Logout function STARTED');
  console.log('🔍 Current auth object:', auth);
  console.log('🔍 Current user:', auth.currentUser);
  
  try {
    const result = await Swal.fire({
      title: 'Sign Out',
      text: 'Are you sure you want to sign out?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#4f46e5',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, sign out',
      cancelButtonText: 'Cancel'
    });
    
    console.log('🔍 Swal result:', result);

    if (result.isConfirmed) {
      Swal.fire({
        title: 'Signing Out...',
        text: 'Please wait while we sign you out',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      console.log('🔍 Attempting to sign out...');
      
      await signOut(auth);
      console.log('✅ Sign out successful!');
      
      localStorage.removeItem('user');
      sessionStorage.clear();

      Swal.close();
      await Swal.fire({
        icon: 'success',
        title: 'Signed Out!',
        text: 'You have been successfully signed out',
        timer: 1500,
        showConfirmButton: false
      });

      window.location.href = '../index.html';
    }
  } catch (error) {
    console.error(' Logout error:', error);
    console.error(' Error code:', error.code);
    console.error(' Error message:', error.message);
    
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to sign out: ' + error.message
    });
  }
  console.log('🔍 Logout function ENDED');
};

export function initAuthObserver() {
  onAuthStateChanged(auth, async (user) => {
    const navContainer = document.querySelector('.hidden.md\\:flex.items-center.space-x-8');
    const mobileNav = document.getElementById('mobileNav');
    const authSection = document.getElementById('authSection');
    const mobileAuthSection = document.getElementById('mobileAuthSection');
    const mobileProfileIcon = document.getElementById('mobileProfileIcon');
    const basePath = getBasePath();

    if (user) {
      await updateEmailVerificationStatus(user);

      let userDoc = await getDoc(doc(db, 'users', user.uid));
      let userData = userDoc.data();
      
      if (ADMIN_EMAILS.includes(user.email) && (!userData || userData.role !== 'admin')) {
        await setDoc(doc(db, 'users', user.uid), {
          fullName: user.displayName || user.email.split('@')[0],
          email: user.email,
          username: user.email.split('@')[0],
          role: 'admin',
          createdAt: new Date().toISOString(),
          photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=4f46e5&color=fff&bold=true`,
          emailVerified: user.emailVerified
        }, { merge: true });
        userDoc = await getDoc(doc(db, 'users', user.uid));
        userData = userDoc.data();
      }
      
      const displayName = userData?.fullName || user.displayName || 'User';
      const firstName = displayName.split(' ')[0];
      const userRole = userData?.role || 'user';
      const isAdminUser = userRole === 'admin' || ADMIN_EMAILS.includes(user.email);
      
      console.log('Auth observer - User role:', userRole);
      console.log('Auth observer - Is admin:', isAdminUser);

      if (mobileProfileIcon) {
        mobileProfileIcon.innerHTML = `
          <a href="${basePath}profile.html" class="block">
            <img src="${userData?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff&bold=true&size=32`}" 
                 alt="Profile" 
                 class="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-indigo-600 object-cover hover:scale-105 transition-transform">
          </a>
        `;
        mobileProfileIcon.classList.remove('hidden');
      }

      if (authSection) {
        authSection.innerHTML = '';

        const desktopProfileHTML = `
          <div class="relative inline-block" id="profileDropdown">
            <button onclick="toggleProfileMenu()" class="flex items-center space-x-2 focus:outline-none bg-white dark:bg-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <img src="${userData?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff&bold=true`}" 
                   alt="Profile" 
                   class="w-8 h-8 rounded-full border-2 border-indigo-600 object-cover">
              <span class="text-gray-700 dark:text-gray-200 font-medium">${escapeHtml(firstName)}</span>
              ${userRole === 'admin' ? '<span class="ml-1 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full">Admin</span>' : ''}
              <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            <div id="profileMenu" class="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-2xl py-2 hidden border border-gray-200 dark:border-gray-700 z-50">
              <a href="${basePath}profile.html" class="flex items-center px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors">
                <i class="fas fa-user mr-3 text-indigo-600 w-5"></i>My Profile
              </a>
              <a href="${basePath}user-message.html" class="flex items-center px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors">
                <i class="fas fa-envelope mr-3 text-indigo-600 w-5"></i>My Messages
              </a>
              <a href="${basePath}orders.html" class="flex items-center px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors">
                <i class="fas fa-shopping-bag mr-3 text-indigo-600 w-5"></i>My Orders
              </a>
              <a href="${basePath}wishlist.html" class="flex items-center px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors">
                <i class="fas fa-heart mr-3 text-indigo-600 w-5"></i>Wishlist
              </a>
              <a href="${basePath}settings.html" class="flex items-center px-4 py-2.5 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-colors">
                <i class="fas fa-cog mr-3 text-indigo-600 w-5"></i>Settings
              </a>
              ${isAdminUser ? `
                <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                <a href="${basePath}admin-orders.html" class="flex items-center px-4 py-2.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors">
                  <i class="fas fa-crown mr-3 w-5"></i>Admin Panel
                </a>
              ` : ''}
              ${!user.emailVerified ? `
                <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                <button onclick="resendVerificationEmail()" class="flex items-center w-full px-4 py-2.5 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors">
                  <i class="fas fa-envelope mr-3 w-5"></i>Resend Verification
                </button>
              ` : ''}
              <div class="border-t border-gray-200 dark:border-gray-700 my-2"></div>
              <button onclick="window.logout()" class="flex items-center w-full px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                <i class="fas fa-sign-out-alt mr-3 w-5"></i>Sign Out
              </button>
            </div>
          </div>
        `;

        authSection.innerHTML = desktopProfileHTML;
      }

      if (mobileAuthSection) {
        mobileAuthSection.innerHTML = '';

        const mobileProfileHTML = `
          <div class="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4" id="mobileProfileSection">
            <div class="flex items-center space-x-3 px-4 mb-4">
              <img src="${userData?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff&bold=true`}" 
                   alt="Profile" class="w-12 h-12 rounded-full border-2 border-indigo-600 object-cover">
              <div class="flex-1">
                <p class="font-semibold text-gray-900 dark:text-white">${escapeHtml(displayName)}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${user.email}</p>
                <div class="flex items-center gap-2 mt-1">
                  ${userRole === 'admin' ? '<span class="inline-flex items-center px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full"><i class="fas fa-crown mr-1"></i>Admin</span>' : '<span class="inline-flex items-center px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">User</span>'}
                  ${!user.emailVerified ? `
                    <span class="inline-flex items-center px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                      <i class="fas fa-exclamation-circle mr-1"></i>Unverified
                    </span>
                  ` : `
                    <span class="inline-flex items-center px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                      <i class="fas fa-check-circle mr-1"></i>Verified
                    </span>
                  `}
                </div>
              </div>
            </div>
            
            <div class="space-y-1">
              <a href="${basePath}profile.html" class="flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <i class="fas fa-user mr-3 text-indigo-600 w-5"></i>My Profile
              </a>
              <a href="${basePath}user-message.html" class="flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <i class="fas fa-envelope mr-3 text-indigo-600 w-5"></i>My Messages
              </a>
              <a href="${basePath}orders.html" class="flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <i class="fas fa-shopping-bag mr-3 text-indigo-600 w-5"></i>My Orders
              </a>
              <a href="${basePath}wishlist.html" class="flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <i class="fas fa-heart mr-3 text-indigo-600 w-5"></i>Wishlist
              </a>
              <a href="${basePath}settings.html" class="flex items-center px-4 py-3 text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-colors">
                <i class="fas fa-cog mr-3 text-indigo-600 w-5"></i>Settings
              </a>
              ${isAdminUser ? `
                <a href="${basePath}admin-orders.html" class="flex items-center px-4 py-3 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors">
                  <i class="fas fa-crown mr-3 w-5"></i>Admin Panel
                </a>
              ` : ''}
              ${!user.emailVerified ? `
                <button onclick="resendVerificationEmail()" class="flex items-center w-full px-4 py-3 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors">
                  <i class="fas fa-envelope mr-3 w-5"></i>Resend Verification
                </button>
              ` : ''}
              <button onclick="window.logout()" class="flex items-center w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors mt-2">
                <i class="fas fa-sign-out-alt mr-3 w-5"></i>Sign Out
              </button>
            </div>
          </div>
        `;

        mobileAuthSection.innerHTML = mobileProfileHTML;
      }

    } else {

      if (mobileProfileIcon) {
        mobileProfileIcon.classList.add('hidden');
        mobileProfileIcon.innerHTML = '';
      }

      if (authSection) {
        authSection.innerHTML = `
        <div style="display: flex;  align-items: center; gap: 20px; "> 
          <a href="${basePath}signup.html"
            class="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl font-semibold whitespace-nowrap">
            Sign Up
          </a>
          <a href="${basePath}login.html"
            class="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl font-semibold whitespace-nowrap">
            Sign In
          </a>
        </div>
        `;
      }

      if (mobileAuthSection) {
        mobileAuthSection.innerHTML = `
         <div style="display: flex; flex-direction: column;  gap: 20px; "> 
           <a href="${basePath}signup.html"
            class="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl font-semibold whitespace-nowrap">
            Sign Up
          </a>
          <a href="${basePath}login.html"
            class="bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-all duration-300 transform hover:scale-105 hover:shadow-xl font-semibold whitespace-nowrap">
            Sign In
          </a>
        </div>
        `;
      }
    }
  });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

window.toggleProfileMenu = function () {
  const menu = document.getElementById('profileMenu');
  if (menu) {
    menu.classList.toggle('hidden');
  }
};

document.addEventListener('click', (e) => {
  const profileDropdown = document.getElementById('profileDropdown');
  const profileMenu = document.getElementById('profileMenu');
  if (profileDropdown && profileMenu && !profileDropdown.contains(e.target)) {
    profileMenu.classList.add('hidden');
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initAuthObserver();
});

window.logout = window.logout;
window.resendVerificationEmail = window.resendVerificationEmail;
window.toggleProfileMenu = window.toggleProfileMenu;
window.forgotPassword = window.forgotPassword;