import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { addToCart } from './main.js';

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


const wishlistItems = document.getElementById('wishlistItems');
const emptyWishlist = document.getElementById('emptyWishlist');
const wishlistCount = document.getElementById('wishlistCount');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const profileAvatar = document.getElementById('profileAvatar');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');

let currentUser = null;
let wishlist = [];

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
    
    profileName.textContent = userData?.fullName || user.displayName || 'User';
    profileEmail.textContent = user.email;
    profileAvatar.src = userData?.photoURL || user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName || 'User'}&background=0D47A1&color=fff&bold=true`;
    
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

async function loadWishlist(userId) {
  try {
    const wishlistRef = doc(db, 'wishlists', userId);
    const wishlistDoc = await getDoc(wishlistRef);
    
    if (wishlistDoc.exists()) {
      wishlist = wishlistDoc.data().items || [];
    } else {
      await setDoc(wishlistRef, { items: [] });
      wishlist = [];
    }
    
    displayWishlist();
  } catch (error) {
    console.error('Error loading wishlist:', error);
    wishlist = [];
    displayWishlist();
  }
}

function displayWishlist() {
  if (!wishlistItems) return;

  if (wishlist.length === 0) {
    wishlistItems.classList.add('hidden');
    if (emptyWishlist) emptyWishlist.classList.remove('hidden');
    if (wishlistCount) wishlistCount.textContent = '0 items';
    return;
  }

  wishlistItems.classList.remove('hidden');
  if (emptyWishlist) emptyWishlist.classList.add('hidden');
  if (wishlistCount) wishlistCount.textContent = `${wishlist.length} item${wishlist.length > 1 ? 's' : ''}`;

  wishlistItems.innerHTML = wishlist.map(item => `
    <div class="wishlist-item border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-lg transition-all relative group">
      <button onclick="removeFromWishlist(${item.id})" class="remove-btn absolute top-2 right-2 w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center text-red-500 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all opacity-0 group-hover:opacity-100">
        <i class="fas fa-times"></i>
      </button>
      <img src="${item.image}" alt="${item.title}" class="w-full h-40 object-cover rounded-lg mb-4">
      <h3 class="font-semibold mb-2">${item.title}</h3>
      <div class="flex items-center justify-between">
        <span class="text-lg font-bold text-deep-blue">$${item.price.toFixed(2)}</span>
        <button onclick="addToCartFromWishlist(${item.id})" class="bg-bright-orange hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm transition-colors">
          <i class="fas fa-shopping-cart mr-2"></i>Add to Cart
        </button>
      </div>
    </div>
  `).join('');
}

window.addToWishlist = async function(product) {
  if (!currentUser) {
    window.location.href = 'signup.html';
    return;
  }

  try {
    const wishlistRef = doc(db, 'wishlists', currentUser.uid);
    await updateDoc(wishlistRef, {
      items: arrayUnion({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image,
        brand: product.brand
      })
    });
    
    wishlist.push(product);
    displayWishlist();
    
    Swal.fire({
      icon: 'success',
      title: 'Added to Wishlist',
      text: `${product.title} has been added to your wishlist`,
      timer: 2000,
      showConfirmButton: false
    });
  } catch (error) {
    console.error('Error adding to wishlist:', error);
  }
};

window.removeFromWishlist = async function(productId) {
  if (!currentUser) return;

  try {
    const item = wishlist.find(i => i.id === productId);
    if (!item) return;

    const wishlistRef = doc(db, 'wishlists', currentUser.uid);
    await updateDoc(wishlistRef, {
      items: arrayRemove(item)
    });
    
    wishlist = wishlist.filter(i => i.id !== productId);
    displayWishlist();
    
    Swal.fire({
      icon: 'success',
      title: 'Removed',
      text: 'Item removed from wishlist',
      timer: 1500,
      showConfirmButton: false
    });
  } catch (error) {
    console.error('Error removing from wishlist:', error);
  }
};

window.addToCartFromWishlist = async function(productId) {
  const item = wishlist.find(i => i.id === productId);
  if (item) {
    await addToCart(item, 1);
  }
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'signup.html';
    return;
  }
  
  currentUser = user;
  await loadUserProfile(user);
  await loadWishlist(user.uid);
});

window.removeFromWishlist = removeFromWishlist;
window.addToCartFromWishlist = addToCartFromWishlist;