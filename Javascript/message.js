
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

const darkToggle = document.getElementById('darkToggle');
const themeIcon = document.getElementById('themeIcon');
function applyDark(on) {
    document.documentElement.classList.toggle('dark', on);
    themeIcon.className = on ? 'fas fa-sun text-sm' : 'fas fa-moon text-sm';
    localStorage.setItem('darkMode', on);
}
applyDark(localStorage.getItem('darkMode') === 'true');
darkToggle.addEventListener('click', () => applyDark(!document.documentElement.classList.contains('dark')));

window.openSidebar = () => {
    document.getElementById('sidebar').classList.add('open');
    document.getElementById('sidebar-overlay').style.display = 'block';
};

window.closeSidebar = () => {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').style.display = 'none';
};

let allMessages = [];
let currentStatusFilter = 'all';
let currentSubjectFilter = 'all';
let currentSearch = '';

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = dateString.toDate ? dateString.toDate() : new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function getSubjectBadge(subject) {
    const colors = {
        'general': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'order': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        'returns': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        'shipping': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'product': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        'feedback': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
    };
    return colors[subject] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
}

function getSubjectDisplay(subjectKey) {
    const subjects = {
        'general': 'General Inquiry',
        'order': 'Order Status',
        'returns': 'Returns & Exchanges',
        'shipping': 'Shipping Information',
        'product': 'Product Question',
        'feedback': 'Feedback'
    };
    return subjects[subjectKey] || subjectKey;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function (m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function updateStats() {
    const total = allMessages.length;
    const unread = allMessages.filter(m => m.status === 'unread').length;
    const replied = allMessages.filter(m => m.replied === true).length;
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekly = allMessages.filter(m => {
        const date = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt);
        return date >= oneWeekAgo;
    }).length;

    document.getElementById('totalMessages').textContent = total;
    document.getElementById('unreadMessages').textContent = unread;
    document.getElementById('repliedMessages').textContent = replied;
    document.getElementById('weeklyMessages').textContent = weekly;

    const unreadBadge = document.getElementById('unreadBadge');
    if (unreadBadge && unread > 0) {
        unreadBadge.textContent = unread;
        unreadBadge.classList.remove('hidden');
    } else if (unreadBadge) {
        unreadBadge.classList.add('hidden');
    }
}

function filterMessages() {
    let filtered = [...allMessages];

    if (currentStatusFilter !== 'all') {
        filtered = filtered.filter(m => m.status === currentStatusFilter);
    }

    if (currentSubjectFilter !== 'all') {
        filtered = filtered.filter(m => m.subject === currentSubjectFilter);
    }

    if (currentSearch.trim() !== '') {
        const searchTerm = currentSearch.toLowerCase();
        filtered = filtered.filter(m =>
            m.fullName?.toLowerCase().includes(searchTerm) ||
            m.email?.toLowerCase().includes(searchTerm) ||
            m.subject?.toLowerCase().includes(searchTerm) ||
            m.message?.toLowerCase().includes(searchTerm)
        );
    }

    return filtered;
}

function renderMessages(messages) {
    const container = document.getElementById('messagesList');
    document.getElementById('messageCount').textContent = messages.length;

    if (!messages.length) {
        container.innerHTML = `
                    <div class="text-center py-16">
                        <i class="fas fa-inbox text-6xl text-gray-400 mb-4"></i>
                        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No messages found</h3>
                        <p class="text-gray-500 dark:text-gray-400">Messages from customers will appear here</p>
                    </div>
                `;
        return;
    }

    container.innerHTML = messages.map(message => {
        const subjectColor = getSubjectBadge(message.subject);
        const isUnread = message.status === 'unread';
        const createdAt = formatDate(message.createdAt);
        const subjectDisplay = getSubjectDisplay(message.subject);

        return `
                    <div class="message-card bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-lg transition-all ${isUnread ? 'message-unread' : ''}">
                        <div class="p-5">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                                        <i class="fas fa-user text-indigo-500 text-sm"></i>
                                    </div>
                                    <div>
                                        <p class="font-semibold text-gray-900 dark:text-white">${escapeHtml(message.fullName || 'Customer')}</p>
                                        <p class="text-xs text-gray-500">${escapeHtml(message.email || '')} • ${createdAt}</p>
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <span class="px-2 py-1 rounded-lg text-xs font-medium ${subjectColor}">${escapeHtml(subjectDisplay)}</span>
                                    ${isUnread ? '<span class="px-2 py-1 rounded-lg text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><i class="fas fa-circle text-[8px] mr-1"></i>Unread</span>' : ''}
                                    ${message.replied ? '<span class="px-2 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><i class="fas fa-check-circle text-xs mr-1"></i>Replied</span>' : ''}
                                </div>
                            </div>
                            
                            <div class="mb-4">
                                <h3 class="font-semibold text-gray-800 dark:text-gray-200 mb-2">${escapeHtml(message.subjectDisplay || message.subject || 'No Subject')}</h3>
                                <p class="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">${escapeHtml(message.message || 'No message content').substring(0, 200)}${message.message && message.message.length > 200 ? '...' : ''}</p>
                            </div>
                            
                            <div class="flex flex-wrap gap-2 justify-end border-t border-gray-100 dark:border-gray-800 pt-4">
                                <button onclick="viewMessageDetails('${message.id}')" class="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50 transition-colors">
                                    <i class="fas fa-eye mr-1"></i> View Details
                                </button>
                                <button onclick="markAsRead('${message.id}')" class="px-4 py-2 text-sm font-medium rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors" ${message.status === 'read' ? 'disabled style="opacity:0.5"' : ''}>
                                    <i class="fas fa-check mr-1"></i> Mark as Read
                                </button>
                                <button onclick="deleteMessage('${message.id}')" class="px-4 py-2 text-sm font-medium rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-colors">
                                    <i class="fas fa-trash-alt mr-1"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;
    }).join('');
}

window.viewMessageDetails = async (messageId) => {
    const message = allMessages.find(m => m.id === messageId);
    if (!message) return;

    if (message.status === 'unread') {
        try {
            await updateDoc(doc(db, 'messages', messageId), { status: 'read' });
            message.status = 'read';
            renderMessages(filterMessages());
            updateStats();
        } catch (error) {
            console.error('Error marking message as read:', error);
        }
    }

    const subjectDisplay = getSubjectDisplay(message.subject);
    const createdAt = formatDate(message.createdAt);

    Swal.fire({
        title: 'Message Details',
        html: `
                    <div class="text-left">
                        <div class="mb-4">
                            <p class="text-sm text-gray-500 mb-1">From</p>
                            <p class="font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(message.fullName || 'Customer')}</p>
                            <p class="text-sm text-gray-600 dark:text-gray-400">${escapeHtml(message.email || '')}</p>
                        </div>
                        <div class="mb-4">
                            <p class="text-sm text-gray-500 mb-1">Subject</p>
                            <p class="font-semibold text-gray-800 dark:text-gray-200">${escapeHtml(subjectDisplay)}</p>
                        </div>
                        <div class="mb-4">
                            <p class="text-sm text-gray-500 mb-1">Date</p>
                            <p class="text-gray-800 dark:text-gray-200">${createdAt}</p>
                        </div>
                        <div class="mb-4">
                            <p class="text-sm text-gray-500 mb-1">Status</p>
                            <p class="text-gray-800 dark:text-gray-200">${message.status === 'unread' ? 'Unread' : 'Read'} ${message.replied ? '· Replied' : ''}</p>
                        </div>
                        <div class="mb-4">
                            <p class="text-sm text-gray-500 mb-1">Message</p>
                            <div class="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">${escapeHtml(message.message || 'No message content')}</div>
                        </div>
                        ${message.replyMessage ? `
                            <div class="mb-4">
                                <p class="text-sm text-gray-500 mb-1">Your Reply</p>
                                <div class="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
                                    ${escapeHtml(message.replyMessage)}
                                    <p class="text-xs text-gray-500 mt-2">Replied on ${formatDate(message.repliedAt)} by ${escapeHtml(message.repliedBy || 'You')}</p>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `,
        showCancelButton: true,
        confirmButtonText: 'Reply to Customer',
        cancelButtonText: 'Close',
        confirmButtonColor: '#4f46e5',
        customClass: {
            popup: 'rounded-2xl'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            window.openReplyModal(message);
        }
    });
};

window.openReplyModal = (message) => {
    Swal.fire({
        title: `Reply to ${message.fullName || 'Customer'}`,
        html: `
                    <div class="text-left">
                        <p class="text-sm text-gray-500 mb-2">Subject: ${escapeHtml(getSubjectDisplay(message.subject))}</p>
                        <textarea id="replyMessage" rows="5" class="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Type your reply here..."></textarea>
                    </div>
                `,
        showCancelButton: true,
        confirmButtonText: 'Send Reply',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#4f46e5',
        preConfirm: () => {
            const replyMessage = document.getElementById('replyMessage').value;
            if (!replyMessage.trim()) {
                Swal.showValidationMessage('Please enter a reply message');
                return false;
            }
            return replyMessage;
        }
    }).then(async (result) => {
        if (result.isConfirmed && result.value) {
            try {
                await updateDoc(doc(db, 'messages', message.id), {
                    replied: true,
                    status: 'read',
                    replyMessage: result.value,
                    repliedAt: new Date(),
                    repliedBy: auth.currentUser?.email || 'admin'
                });

                Swal.fire('Success', 'Reply has been sent to the customer', 'success');

                message.replied = true;
                message.status = 'read';
                message.replyMessage = result.value;

                renderMessages(filterMessages());
                updateStats();
            } catch (error) {
                console.error('Error sending reply:', error);
                Swal.fire('Error', 'Failed to send reply. Please try again.', 'error');
            }
        }
    });
};

window.markAsRead = async (messageId) => {
    try {
        await updateDoc(doc(db, 'messages', messageId), { status: 'read' });
        const message = allMessages.find(m => m.id === messageId);
        if (message) message.status = 'read';
        renderMessages(filterMessages());
        updateStats();
        Swal.fire('Success', 'Message marked as read', 'success');
    } catch (error) {
        console.error('Error marking as read:', error);
        Swal.fire('Error', 'Failed to update message status', 'error');
    }
};

window.deleteMessage = async (messageId) => {
    const result = await Swal.fire({
        title: 'Delete Message?',
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
        try {
            await deleteDoc(doc(db, 'messages', messageId));
            allMessages = allMessages.filter(m => m.id !== messageId);
            renderMessages(filterMessages());
            updateStats();
            Swal.fire('Deleted', 'Message has been deleted', 'success');
        } catch (error) {
            console.error('Error deleting message:', error);
            Swal.fire('Error', 'Failed to delete message', 'error');
        }
    }
};

async function loadMessages() {
    const container = document.getElementById('messagesList');
    container.innerHTML = `
                <div class="text-center py-16">
                    <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <p class="mt-4 text-gray-500">Loading messages...</p>
                </div>
            `;

    try {
        const messagesQuery = query(collection(db, 'messages'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(messagesQuery);
        allMessages = [];
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            allMessages.push({
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt || new Date()
            });
        });
        renderMessages(filterMessages());
        updateStats();
    } catch (error) {
        console.error('Error loading messages:', error);
        container.innerHTML = `
                    <div class="text-center py-16">
                        <i class="fas fa-exclamation-triangle text-6xl text-red-400 mb-4"></i>
                        <h3 class="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">Failed to load messages</h3>
                        <p class="text-gray-500 dark:text-gray-400">Please try again later</p>
                        <button onclick="loadMessages()" class="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Retry</button>
                    </div>
                `;
        Swal.fire('Error', 'Failed to load messages', 'error');
    }
}

document.getElementById('statusFilter').addEventListener('change', (e) => {
    currentStatusFilter = e.target.value;
    renderMessages(filterMessages());
});

document.getElementById('subjectFilter').addEventListener('change', (e) => {
    currentSubjectFilter = e.target.value;
    renderMessages(filterMessages());
});

document.getElementById('searchInput').addEventListener('input', (e) => {
    currentSearch = e.target.value;
    renderMessages(filterMessages());
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        const email = user.email;
        if (!ADMIN_EMAILS.includes(email)) {
            Swal.fire('Access Denied', 'You are not authorized to view this page', 'error').then(() => {
                window.location.href = './Dashboard.html';
            });
            return;
        }
        document.getElementById('adminName').textContent = user.displayName || user.email.split('@')[0];
        document.getElementById('adminEmail').textContent = user.email;
        loadMessages();
    } else {
        window.location.href = './index.html';
    }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
    await signOut(auth);
    window.location.href = './index.html';
});
