import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

let allSubscribers = [];
let currentSearch = '';
let currentStatus = 'all';
let emailConfig = { serviceId: null, templateId: null, publicKey: null };

function formatDate(date) {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

async function loadSubscribers() {
    try {
        const q = query(collection(db, 'newsletter'), orderBy('subscribedAt', 'desc'));
        const snapshot = await getDocs(q);
        allSubscribers = [];
        snapshot.forEach(docSnap => {
            allSubscribers.push({ id: docSnap.id, ...docSnap.data(), status: docSnap.data().status || 'active' });
        });
        renderSubscribers();
        updateStats();
    } catch (error) {
        console.error('Error loading subscribers:', error);
        Swal.fire('Error', 'Failed to load subscribers', 'error');
    }
}

function updateStats() {
    document.getElementById('totalSubscribers').textContent = allSubscribers.length;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newCount = allSubscribers.filter(s => {
        const date = s.subscribedAt?.toDate ? s.subscribedAt.toDate() : new Date(s.subscribedAt);
        return date >= thirtyDaysAgo;
    }).length;
    document.getElementById('newSubscribers').textContent = newCount;
    document.getElementById('sendCount').textContent = allSubscribers.filter(s => s.status !== 'unsubscribed').length;
}

function renderSubscribers() {
    let filtered = [...allSubscribers];
    if (currentStatus !== 'all') filtered = filtered.filter(s => s.status === currentStatus);
    if (currentSearch.trim()) {
        const search = currentSearch.toLowerCase();
        filtered = filtered.filter(s => s.email?.toLowerCase().includes(search) || s.name?.toLowerCase().includes(search));
    }
    document.getElementById('subscriberCount').textContent = filtered.length;
    const tbody = document.getElementById('subscribersTable');
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-16 text-gray-500">No subscribers found</td></tr>`;
        return;
    }
    tbody.innerHTML = filtered.map(sub => `
        <tr class="subscriber-row">
          <td class="px-4 sm:px-6 py-3 text-sm">${escapeHtml(sub.email)}</td>
          <td class="px-4 sm:px-6 py-3 text-sm">${escapeHtml(sub.name || '—')}</td>
          <td class="px-4 sm:px-6 py-3 text-sm">${formatDate(sub.subscribedAt)}</td>
          <td class="px-4 sm:px-6 py-3"><span class="px-2 py-1 rounded-full text-xs font-medium ${sub.status === 'unsubscribed' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}">${sub.status === 'unsubscribed' ? 'Unsubscribed' : 'Active'}</span></td>
          <td class="px-4 sm:px-6 py-3 text-right"><button onclick="deleteSubscriber('${sub.id}')" class="text-red-500 hover:text-red-700 transition-colors"><i class="fas fa-trash-alt"></i></button></td>
        </tr>
      `).join('');
}

function escapeHtml(str) { if (!str) return ''; return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m])); }

window.deleteSubscriber = async (id) => {
    const result = await Swal.fire({ title: 'Delete Subscriber?', text: 'This action cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#ef4444', confirmButtonText: 'Delete' });
    if (result.isConfirmed) {
        await deleteDoc(doc(db, 'newsletter', id));
        await loadSubscribers();
        Swal.fire('Deleted', 'Subscriber removed', 'success');
    }
};

window.openSendCampaignModal = () => { document.getElementById('campaignModal').classList.remove('hidden'); document.getElementById('campaignModal').classList.add('flex'); };
window.closeCampaignModal = () => { document.getElementById('campaignModal').classList.add('hidden'); document.getElementById('campaignModal').classList.remove('flex'); };
window.openEmailSetup = () => { document.getElementById('emailSetupModal').classList.remove('hidden'); document.getElementById('emailSetupModal').classList.add('flex'); };
window.closeEmailSetupModal = () => { document.getElementById('emailSetupModal').classList.add('hidden'); document.getElementById('emailSetupModal').classList.remove('flex'); };

// EmailJS Send Function
async function sendRealEmail(toEmail, toName, subject, message, fromName) {
    if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
        return { success: false, error: 'EmailJS not configured' };
    }

    try {
        const templateParams = {
            to_name: toName?.trim() ? toName : toEmail.split('@')[0],
            to_email: toEmail, // ✅ MUST
            from_name: fromName || 'PunnyCart',
            message: message,
            subject: subject
        };

        const response = await emailjs.send(
            emailConfig.serviceId,
            emailConfig.templateId,
            templateParams,
            emailConfig.publicKey
        );

        return { success: true, response };
    } catch (error) {
        console.error('EmailJS error:', error);
        return { success: false, error: error.text || 'Failed to send' };
    }
}

window.saveEmailJSConfig = () => {
    const serviceId = document.getElementById('emailjsServiceId').value.trim();
    const templateId = document.getElementById('emailjsTemplateId').value.trim();
    const publicKey = document.getElementById('emailjsPublicKey').value.trim();

    if (!serviceId || !templateId || !publicKey) {
        Swal.fire('Error', 'Please fill all fields', 'error');
        return;
    }

    emailConfig = { serviceId, templateId, publicKey };
    localStorage.setItem('emailjs_config', JSON.stringify(emailConfig));
    emailjs.init(publicKey);

    document.getElementById('emailStatusText').innerHTML = '<i class="fas fa-check-circle text-green-500 mr-1"></i> Active - Real emails will be sent';
    closeEmailSetupModal();
    Swal.fire('Configured!', 'EmailJS is now active. You can send real emails!', 'success');
};

window.sendCampaign = async () => {
    const fromName = document.getElementById('fromName').value.trim() || 'PunnyCart';
    const subject = document.getElementById('campaignSubject').value.trim();
    const message = document.getElementById('campaignMessage').value.trim();

    if (!subject || !message) {
        Swal.fire('Error', 'Please enter both subject and message', 'error');
        return;
    }

    const activeSubscribers = allSubscribers.filter(s => s.status !== 'unsubscribed');
    if (activeSubscribers.length === 0) {
        Swal.fire('No Subscribers', 'There are no active subscribers to send to.', 'info');
        return;
    }

    // Load saved config
    const savedConfig = localStorage.getItem('emailjs_config');
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        emailConfig = config;
        emailjs.init(config.publicKey);
    }

    if (!emailConfig.serviceId || !emailConfig.templateId || !emailConfig.publicKey) {
        Swal.fire({
            title: 'Email Service Not Configured',
            html: 'To send real emails, click "Configure EmailJS" in the status card above.',
            icon: 'warning',
            confirmButtonText: 'Configure Now'
        }).then(() => openEmailSetup());
        return;
    }

    Swal.fire({
        title: 'Sending Campaign...',
        html: `Sending to ${activeSubscribers.length} subscribers<br><div class="mt-2 text-sm text-gray-500">This may take a moment...</div>`,
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    let successCount = 0, failCount = 0;

    for (let i = 0; i < activeSubscribers.length; i++) {
        const sub = activeSubscribers[i];
        let name = sub.name || sub.email.split('@')[0];
        name = name.charAt(0).toUpperCase() + name.slice(1);
        const result = await sendRealEmail(sub.email, name, subject, message, fromName);

        if (result.success) {
            successCount++;
        } else {
            failCount++;
            console.error(`Failed to send to ${sub.email}:`, result.error);
        }

        if ((i + 1) % 5 === 0 || i === activeSubscribers.length - 1) {
            Swal.update({
                html: `Sending to ${activeSubscribers.length} subscribers<br>Progress: ${i + 1}/${activeSubscribers.length}<br>✅ Success: ${successCount}<br>❌ Failed: ${failCount}`
            });
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    Swal.fire({
        title: 'Campaign Complete!',
        html: `✅ Sent: ${successCount}<br>❌ Failed: ${failCount}`,
        icon: successCount > 0 ? 'success' : 'error'
    });

    closeCampaignModal();
    document.getElementById('campaignSubject').value = '';
    document.getElementById('campaignMessage').value = '';
};

window.exportSubscribers = () => {
    let csv = 'Email,Name,Subscribed Date,Status\n';
    allSubscribers.forEach(s => { csv += `"${s.email}","${s.name || ''}","${formatDate(s.subscribedAt)}","${s.status || 'active'}"\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `punnycart_subscribers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    Swal.fire('Exported!', 'Subscribers list exported successfully', 'success');
};

window.importSubscribers = () => { Swal.fire('Coming Soon', 'Import feature coming soon.', 'info'); };

document.getElementById('searchInput').addEventListener('input', (e) => { currentSearch = e.target.value; renderSubscribers(); });
document.getElementById('statusFilter').addEventListener('change', (e) => { currentStatus = e.target.value; renderSubscribers(); });

window.openSidebar = () => { document.getElementById('sidebar').classList.add('open'); document.getElementById('sidebar-overlay').style.display = 'block'; };
window.closeSidebar = () => { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebar-overlay').style.display = 'none'; };

const darkToggle = document.getElementById('darkToggle');
const themeIcon = document.getElementById('themeIcon');
function applyDark(on) { document.documentElement.classList.toggle('dark', on); themeIcon.className = on ? 'fas fa-sun text-sm' : 'fas fa-moon text-sm'; localStorage.setItem('darkMode', on); }
applyDark(localStorage.getItem('darkMode') === 'true');
darkToggle.addEventListener('click', () => applyDark(!document.documentElement.classList.contains('dark')));

// Load saved config on startup
const savedConfig = localStorage.getItem('emailjs_config');
if (savedConfig) {
    const config = JSON.parse(savedConfig);
    emailConfig = config;
    emailjs.init(config.publicKey);
    document.getElementById('emailStatusText').innerHTML = '<i class="fas fa-check-circle text-green-500 mr-1"></i> Active - Real emails will be sent';
}

onAuthStateChanged(auth, async (user) => {
    if (user && ADMIN_EMAILS.includes(user.email)) {
        document.getElementById('adminName').textContent = user.displayName || user.email.split('@')[0];
        document.getElementById('adminEmail').textContent = user.email;
        loadSubscribers();
    } else if (user) { Swal.fire('Access Denied', 'You are not authorized', 'error').then(() => window.location.href = '../Pages/Dashboard.html'); }
    else { window.location.href = '../Pages/login.html'; }
});
document.getElementById('logoutBtn').addEventListener('click', async () => { await signOut(auth); window.location.href = '../Pages/login.html'; });
