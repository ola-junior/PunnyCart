import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs, updateDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const urlParams = new URLSearchParams(window.location.search);
const emailParam = urlParams.get('email');

if (emailParam) {
    document.getElementById('emailInput').value = decodeURIComponent(emailParam);
}

window.updatePreferences = async () => {
    const email = document.getElementById('emailInput').value.trim();
    const preference = document.querySelector('input[name="preference"]:checked');

    if (!email) {
        Swal.fire('Error', 'Please enter your email address', 'error');
        return;
    }

    if (!preference) {
        Swal.fire('Error', 'Please select a preference', 'error');
        return;
    }

    Swal.fire({ title: 'Updating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
        const q = query(collection(db, 'newsletter'), where('email', '==', email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            Swal.fire('Not Found', 'No subscription found for this email', 'info');
            return;
        }

        const docRef = doc(db, 'newsletter', snapshot.docs[0].id);
        const status = preference.value === 'unsubscribe' ? 'unsubscribed' : 'active';
        const frequency = preference.value === 'unsubscribe' ? null : preference.value;

        await updateDoc(docRef, { status, frequency, updatedAt: new Date() });

        Swal.close();
        document.getElementById('unsubscribeForm').classList.add('hidden');
        document.getElementById('successMessage').classList.remove('hidden');

    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'Failed to update preferences', 'error');
    }
};
