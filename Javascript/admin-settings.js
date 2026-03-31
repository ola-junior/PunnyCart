import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updatePassword, updateEmail, updateProfile } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDlkoedJh9k940IofE8VKJ9-fT8Gz7WvoI",
    authDomain: "e-commerce-29a73.firebaseapp.com",
    projectId: "e-commerce-29a73",
    storageBucket: "e-commerce-29a73.firebasestorage.app",
    messagingSenderId: "870933397259",
    appId: "1:870933397259:web:7a0d6f50a6a11f92b66c0e"
};
const app = initializeApp(firebaseConfig),
    auth = getAuth(app),
    db = getFirestore(app);
const ADMIN_EMAILS = ['abdulwarisabdullahi52@gmail.com', 'yxngalhaji02@gmail.com'];

const darkToggle = document.getElementById('darkToggle'),
 themeIcon = document.getElementById('themeIcon');
function applyDark(on) { document.documentElement.classList.toggle('dark', on); themeIcon.className = on ? 'fas fa-sun text-sm' : 'fas fa-moon text-sm'; localStorage.setItem('darkMode', on); }
applyDark(localStorage.getItem('darkMode') === 'true');
darkToggle.addEventListener('click', () => applyDark(!document.documentElement.classList.contains('dark')));
window.openSidebar = () => { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').style.display = 'block'; };
window.closeSidebar = () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').style.display = 'none'; };

async function loadSettings() {
    const settingsDoc = await getDoc(doc(db, 'storeSettings', 'config'));
    if (settingsDoc.exists()) {
        const s = settingsDoc.data();
        if (document.getElementById('storeName')) document.getElementById('storeName').value = s.storeName || 'PunnyCart';
        if (document.getElementById('storeEmail')) document.getElementById('storeEmail').value = s.storeEmail || '';
        if (document.getElementById('storePhone')) document.getElementById('storePhone').value = s.storePhone || '';
        if (document.getElementById('storeAddress')) document.getElementById('storeAddress').value = s.storeAddress || '';
        if (document.getElementById('freeShippingEnabled')) document.getElementById('freeShippingEnabled').checked = s.freeShippingEnabled || false;
        if (document.getElementById('freeShippingMin')) document.getElementById('freeShippingMin').value = s.freeShippingMin || 50;
        if (document.getElementById('standardShippingRate')) document.getElementById('standardShippingRate').value = s.standardShippingRate || 5.99;
        if (document.getElementById('expressShippingRate')) document.getElementById('expressShippingRate').value = s.expressShippingRate || 14.99;
        if (document.getElementById('taxEnabled')) document.getElementById('taxEnabled').checked = s.taxEnabled || true;
        if (document.getElementById('taxRate')) document.getElementById('taxRate').value = s.taxRate || 10;
        if (document.getElementById('emailOrderConfirm')) document.getElementById('emailOrderConfirm').checked = s.emailOrderConfirm !== false;
        if (document.getElementById('newOrderAlerts')) document.getElementById('newOrderAlerts').checked = s.newOrderAlerts !== false;
        if (document.getElementById('lowStockAlerts')) document.getElementById('lowStockAlerts').checked = s.lowStockAlerts !== false;
    }
}

document.getElementById('saveGeneralBtn')?.addEventListener('click', async () => {
    await setDoc(doc(db, 'storeSettings', 'config'), {
        storeName: document.getElementById('storeName').value,
        storeEmail: document.getElementById('storeEmail').value,
        storePhone: document.getElementById('storePhone').value,
        storeAddress: document.getElementById('storeAddress').value
    }, { merge: true });
    Swal.fire({ icon: 'success', title: 'Saved!', timer: 1500, showConfirmButton: false });
});

document.getElementById('saveShippingBtn')?.addEventListener('click', async () => {
    await setDoc(doc(db, 'storeSettings', 'config'), {
        freeShippingEnabled: document.getElementById('freeShippingEnabled').checked,
        freeShippingMin: parseFloat(document.getElementById('freeShippingMin').value),
        standardShippingRate: parseFloat(document.getElementById('standardShippingRate').value),
        expressShippingRate: parseFloat(document.getElementById('expressShippingRate').value)
    }, { merge: true });
    Swal.fire({ icon: 'success', title: 'Saved!', timer: 1500, showConfirmButton: false });
});

document.getElementById('saveTaxBtn')?.addEventListener('click', async () => {
    await setDoc(doc(db, 'storeSettings', 'config'), {
        taxEnabled: document.getElementById('taxEnabled').checked,
        taxRate: parseFloat(document.getElementById('taxRate').value)
    }, { merge: true });
    Swal.fire({ icon: 'success', title: 'Saved!', timer: 1500, showConfirmButton: false });
});

document.getElementById('saveNotificationsBtn')?.addEventListener('click', async () => {
    await setDoc(doc(db, 'storeSettings', 'config'), {
        emailOrderConfirm: document.getElementById('emailOrderConfirm').checked,
        newOrderAlerts: document.getElementById('newOrderAlerts').checked,
        lowStockAlerts: document.getElementById('lowStockAlerts').checked
    }, { merge: true });
    Swal.fire({ icon: 'success', title: 'Saved!', timer: 1500, showConfirmButton: false });
});

document.getElementById('changePasswordBtn')?.addEventListener('click', async () => {
    const { value: password } = await Swal.fire({ title: 'Change Password', input: 'password', inputPlaceholder: 'New password', showCancelButton: true, inputValidator: v => !v ? 'Password required' : v.length < 6 ? 'Minimum 6 characters' : null });
    if (password) {
        await updatePassword(auth.currentUser, password);
        Swal.fire({ icon: 'success', title: 'Password updated!' });
    }
});

document.getElementById('saveAccountBtn')?.addEventListener('click', async () => {
    const user = auth.currentUser;
    const newName = document.getElementById('adminNameInput').value;
    const newEmail = document.getElementById('adminEmailInput').value;
    if (newName !== user.displayName) await updateProfile(user, { displayName: newName });
    if (newEmail !== user.email) await updateEmail(user, newEmail);
    await setDoc(doc(db, 'users', user.uid), { fullName: newName, email: newEmail }, { merge: true });
    Swal.fire({ icon: 'success', title: 'Account updated!', timer: 1500, showConfirmButton: false });
    setTimeout(() => location.reload(), 1500);
});

onAuthStateChanged(auth, async user => {
    if (!user || !ADMIN_EMAILS.includes(user.email)) { window.location.href = '../login.html'; return; }
    document.getElementById('adminName').textContent = user.displayName || user.email.split('@')[0];
    document.getElementById('adminEmail').textContent = user.email;
    if (document.getElementById('adminNameInput')) document.getElementById('adminNameInput').value = user.displayName || '';
    if (document.getElementById('adminEmailInput')) document.getElementById('adminEmailInput').value = user.email;
    await loadSettings();
});
document.getElementById('logoutBtn')?.addEventListener('click', async () => { await signOut(auth); window.location.href = '../login.html'; });
