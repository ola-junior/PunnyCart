import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, getDoc, doc, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
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
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

const contactForm = document.getElementById('contactForm');
const newsletterForm = document.getElementById('newsletterForm');
const submitBtn = document.getElementById('submitBtn');
const darkToggle = document.getElementById('darkToggle');
const themeIcon = document.getElementById('themeIcon');
const backToTop = document.getElementById('backToTop');
const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const mobileMenu = document.getElementById('mobileMenu');

// Mobile menu
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

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// Map initialization
function initMap() {
  if (typeof L === 'undefined') {
    console.log('Leaflet not loaded yet, waiting...');
    setTimeout(initMap, 500);
    return;
  }

  const mapElement = document.getElementById('map');
  if (!mapElement) return;

  try {
    const map = L.map('map').setView([7.4035, 3.9320], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    const marker = L.marker([7.4035, 3.9320]).addTo(map);
    marker.bindPopup(`
      <b>PunnyCart Nigeria</b><br>
      Iwo Road, Ibadan<br>
      Oyo State, Nigeria
    `).openPopup();

    console.log('Map initialized successfully');
  } catch (error) {
    console.error('Map initialization error:', error);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (typeof L !== 'undefined') {
    initMap();
  } else {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(link);

    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => initMap();
    document.head.appendChild(script);
  }
});

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

// Contact form submission - Save to Firestore
if (contactForm) {
  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    const subject = document.getElementById('subject').value;
    const message = document.getElementById('message').value;
    const orderNumber = document.getElementById('orderNumber').value;
    const attachment = document.getElementById('attachment').files[0];

    if (!firstName || !lastName || !email || !subject || !message) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Please fill in all required fields'
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Please enter a valid email address'
      });
      return;
    }

    if (phone) {
      const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/;
      if (!phoneRegex.test(phone)) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Phone',
          text: 'Please enter a valid phone number'
        });
        return;
      }
    }

    if (attachment && attachment.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: 'error',
        title: 'File Too Large',
        text: 'Attachment must be less than 5MB'
      });
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending...';

    try {
      let attachmentUrl = '';
      if (attachment) {
        const fileName = `${Date.now()}_${attachment.name}`;
        const storageRef = ref(storage, `contact-attachments/${fileName}`);
        const snapshot = await uploadBytes(storageRef, attachment);
        attachmentUrl = await getDownloadURL(snapshot.ref);
      }

      // Save message to Firestore
      const contactRef = collection(db, 'messages');
      await addDoc(contactRef, {
        firstName: firstName,
        lastName: lastName,
        fullName: `${firstName} ${lastName}`,
        email: email,
        phone: phone || null,
        subject: subject,
        message: message,
        orderNumber: orderNumber || null,
        attachmentUrl: attachmentUrl || null,
        status: 'unread',
        userId: auth.currentUser?.uid || null,
        userEmail: auth.currentUser?.email || null,
        createdAt: serverTimestamp(),
        readAt: null,
        replied: false
      });

      Swal.fire({
        icon: 'success',
        title: 'Message Sent!',
        html: `
          <p class="mb-4">Thank you for contacting us, ${firstName}!</p>
          <p class="text-sm text-gray-600">Your message has been received. Our support team will respond within 24-48 hours.</p>
          <p class="text-xs text-gray-500 mt-4">A confirmation has been sent to ${email}</p>
        `,
        confirmButtonColor: '#4f46e5',
        confirmButtonText: 'OK'
      });

      contactForm.reset();

    } catch (error) {
      console.error('Error submitting contact form:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to send message. Please try again later.'
      });

    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Send Message';
    }
  });
}

// Newsletter form - Save to Firestore
if (newsletterForm) {
  newsletterForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById('newsletterEmail');
    const email = emailInput.value;
    const btn = newsletterForm.querySelector('button[type="submit"]');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Please enter a valid email address'
      });
      return;
    }

    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
      // Check if email already subscribed
      const newsletterRef = collection(db, 'newsletter');
      const q = query(newsletterRef, where('email', '==', email));
      const existing = await getDocs(q);

      if (!existing.empty) {
        Swal.fire({
          icon: 'info',
          title: 'Already Subscribed',
          text: 'This email is already subscribed to our newsletter!',
          timer: 2000,
          showConfirmButton: false
        });
        emailInput.value = '';
        return;
      }

      // Save newsletter subscription to Firestore
      let name = email.split('@')[0]; // fallback

      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          name = userDoc.data().fullName || name;
        }
      }

      await addDoc(newsletterRef, {
        email: email,
        name: name, // ✅ real name now
        subscribedAt: serverTimestamp(),
        userId: auth.currentUser?.uid || null,
        status: 'active',
        source: 'contact_page'
      });

      Swal.fire({
        icon: 'success',
        title: 'Subscribed!',
        text: 'Thank you for subscribing to our newsletter! You will receive exclusive offers and updates.',
        timer: 2000,
        showConfirmButton: false
      });

      emailInput.value = '';

    } catch (error) {
      console.error('Error subscribing to newsletter:', error);

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to subscribe. Please try again.'
      });

    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  });
}

// Auto-fill user data on auth state change
onAuthStateChanged(auth, (user) => {
  if (user) {
    const getUserData = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();

          const firstNameInput = document.getElementById('firstName');
          const lastNameInput = document.getElementById('lastName');
          const emailInput = document.getElementById('email');
          const phoneInput = document.getElementById('phone');

          if (firstNameInput && userData.fullName) {
            const nameParts = userData.fullName.split(' ');
            firstNameInput.value = nameParts[0] || '';
            if (nameParts.length > 1) {
              lastNameInput.value = nameParts.slice(1).join(' ');
            }
          }

          if (emailInput) {
            emailInput.value = user.email;
          }

          if (phoneInput && userData.phone) {
            phoneInput.value = userData.phone;
          }
        }
      } catch (error) {
        console.error('Error auto-filling form:', error);
      }
    };

    getUserData();
  }
});

// Character counter for message field
const messageField = document.getElementById('message');
if (messageField) {
  const charCount = document.createElement('div');
  charCount.className = 'text-xs text-gray-500 dark:text-gray-400 mt-1 text-right';
  charCount.id = 'charCount';
  messageField.parentNode.appendChild(charCount);

  const updateCharCount = () => {
    const count = messageField.value.length;
    charCount.textContent = `${count} characters`;
    if (count > 1000) {
      charCount.classList.add('text-red-500');
      charCount.classList.remove('text-gray-500', 'dark:text-gray-400');
    } else {
      charCount.classList.remove('text-red-500');
      charCount.classList.add('text-gray-500', 'dark:text-gray-400');
    }
  };

  messageField.addEventListener('input', updateCharCount);
  updateCharCount();
}

// File input change handler
const fileInput = document.getElementById('attachment');
if (fileInput) {
  fileInput.addEventListener('change', (e) => {
    const fileName = e.target.files[0]?.name;
    if (fileName) {
      console.log('Selected file:', fileName);
    }
  });
}

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

// Initialize cart count on page load
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  window.openModal = openModal;
  window.closeModal = closeModal;
});