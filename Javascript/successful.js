import { updateCartCount } from './main.js';
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const orderNumber = document.getElementById('orderNumber');
const orderDate = document.getElementById('orderDate');
const orderTotal = document.getElementById('orderTotal');
const viewOrderDetails = document.getElementById('viewOrderDetails');
const backToTop = document.getElementById('backToTop');
const darkToggle = document.getElementById('darkToggle');
const themeIcon = document.getElementById('themeIcon');
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

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

function displayOrderSummary() {
  const lastOrderId = sessionStorage.getItem('lastOrderId');
  let orderTotalValue = sessionStorage.getItem('orderTotal');
  if (!orderTotalValue || orderTotalValue === '0') {
    const orderData = sessionStorage.getItem('orderData');
    if (orderData) {
      try {
        const parsedOrder = JSON.parse(orderData);
        orderTotalValue = parsedOrder.total || parsedOrder.orderTotal || '0';
      } catch (e) {
        console.error('Error parsing order data:', e);
      }
    }
  }
  
  if (!orderTotalValue || orderTotalValue === '0') {
    const paymentIntent = sessionStorage.getItem('paymentIntent');
    if (paymentIntent) {
      try {
        const parsedPayment = JSON.parse(paymentIntent);
        const amount = parsedPayment.amount || '0';
        orderTotalValue = amount > 100 ? (amount / 100).toString() : amount;
      } catch (e) {
        console.error('Error parsing payment data:', e);
      }
    }
  }

  if (lastOrderId && orderNumber) {
    const shortId = lastOrderId.slice(-8).toUpperCase();
    orderNumber.textContent = `#PRIME-${shortId}`;

    if (viewOrderDetails) {
      viewOrderDetails.href = `orders.html?order=${lastOrderId}`;
    }
  } else if (orderNumber) {
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    orderNumber.textContent = `#PRIME-${randomNum}`;
  }

  if (orderTotal) {
    if (orderTotalValue && orderTotalValue !== '0') {
      const totalNumber = parseFloat(orderTotalValue);
      if (!isNaN(totalNumber) && totalNumber > 0) {
        orderTotal.textContent = `$${totalNumber.toFixed(2)}`;
      } else {
        const savedTotal = localStorage.getItem('lastOrderTotal');
        if (savedTotal) {
          orderTotal.textContent = `$${parseFloat(savedTotal).toFixed(2)}`;
        } else {
          orderTotal.textContent = '$0.00';
        }
      }
    } else {
      const savedTotal = localStorage.getItem('lastOrderTotal');
      if (savedTotal) {
        orderTotal.textContent = `$${parseFloat(savedTotal).toFixed(2)}`;
      } else {
        orderTotal.textContent = '$0.00';
      }
    }
  }

  if (orderDate) {
    const today = new Date();
    orderDate.textContent = today.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}

async function clearCart() {
  try {
    const user = auth.currentUser;
    if (user) {
      const cartRef = doc(db, 'carts', user.uid);
      await setDoc(cartRef, {
        items: [],
        updatedAt: new Date().toISOString()
      }, { merge: true });
      console.log('Cart cleared successfully');
    }
  } catch (error) {
    console.error('Error clearing cart:', error);
  }

  const lastOrderId = sessionStorage.getItem('lastOrderId');
  const orderTotal = sessionStorage.getItem('orderTotal');
  const orderData = sessionStorage.getItem('orderData');
  
  if (orderTotal) {
    localStorage.setItem('lastOrderTotal', orderTotal);
  } else if (orderData) {
    try {
      const parsedOrder = JSON.parse(orderData);
      if (parsedOrder.total) {
        localStorage.setItem('lastOrderTotal', parsedOrder.total.toString());
      }
    } catch (e) {
      console.error('Error backing up order total:', e);
    }
  }
  
  sessionStorage.clear();
  
  if (lastOrderId) sessionStorage.setItem('lastOrderId', lastOrderId);
  if (orderTotal) {
    sessionStorage.setItem('orderTotal', orderTotal);
  } else if (orderData) {
    sessionStorage.setItem('orderData', orderData);
    try {
      const parsedOrder = JSON.parse(orderData);
      if (parsedOrder.total) {
        sessionStorage.setItem('orderTotal', parsedOrder.total.toString());
      }
    } catch (e) {
      console.error('Error extracting order total:', e);
    }
  }

  updateCartCount();
}

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = 'signup.html';
    return;
  }

  displayOrderSummary();
  clearCart();
});

document.addEventListener('DOMContentLoaded', () => {
  console.log('Success page initialized');
  
  setTimeout(() => {
    displayOrderSummary();
  }, 100);
});