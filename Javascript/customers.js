import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig={apiKey:"AIzaSyDlkoedJh9k940IofE8VKJ9-fT8Gz7WvoI",authDomain:"e-commerce-29a73.firebaseapp.com",projectId:"e-commerce-29a73",storageBucket:"e-commerce-29a73.firebasestorage.app",messagingSenderId:"870933397259",appId:"1:870933397259:web:7a0d6f50a6a11f92b66c0e"};
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const ADMIN_EMAILS=['abdulwarisabdullahi52@gmail.com','yxngalhaji02@gmail.com'];

const darkToggle=document.getElementById('darkToggle'),themeIcon=document.getElementById('themeIcon');
function applyDark(on){document.documentElement.classList.toggle('dark',on);themeIcon.className=on?'fas fa-sun text-sm':'fas fa-moon text-sm';localStorage.setItem('darkMode',on);}
applyDark(localStorage.getItem('darkMode')==='true');
darkToggle.addEventListener('click',()=>applyDark(!document.documentElement.classList.contains('dark')));
window.openSidebar=()=>{document.getElementById('sidebar').classList.add('open');document.getElementById('sidebar-overlay').style.display='block';};
window.closeSidebar=()=>{document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebar-overlay').style.display='none';};

function getInitials(name){return name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2)||'?';}
const avatarColors=['bg-indigo-500','bg-purple-500','bg-pink-500','bg-blue-500','bg-teal-500','bg-amber-500'];
function avatarColor(str){let h=0;for(const c of str)h=(h*31+c.charCodeAt(0))%avatarColors.length;return avatarColors[h];}

let allCustomers=[];

function renderCustomers(list){
  const tbody=document.getElementById('customersTable');
  document.getElementById('custCount').textContent=list.length;
  if(!list.length){tbody.innerHTML=`<tr><td colspan="5" class="text-center py-12 text-gray-400"><i class="fas fa-users text-3xl mb-2 block"></i>No customers found</td></tr>`;return;}
  tbody.innerHTML=list.map(c=>{
    const name=c.displayName||c.email?.split('@')[0]||'N/A';
    const joined=c.createdAt?new Date(c.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'N/A';
    const col=avatarColor(name);
    return `
    <tr class="cust-row">
      <td class="px-4 sm:px-6 py-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-full ${col} flex items-center justify-center text-white text-xs font-bold flex-shrink-0">${getInitials(name)}</div>
          <span class="text-sm font-medium text-gray-800 dark:text-white truncate max-w-[120px] sm:max-w-xs">${name}</span>
        </div>
      </td>
      <td class="px-4 sm:px-6 py-3 text-xs text-gray-500 dark:text-gray-400 truncate max-w-[140px] sm:max-w-xs">${c.email||'N/A'}</td>
      <td class="px-4 sm:px-6 py-3 text-xs text-gray-500 dark:text-gray-400 hidden sm:table-cell">${c.phone||'—'}</td>
      <td class="px-4 sm:px-6 py-3 text-center"><span class="inline-block min-w-[24px] px-2 py-0.5 rounded-full text-[11px] font-bold ${c.totalOrders>0?'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400':'bg-gray-100 text-gray-500 dark:bg-gray-800'}">${c.totalOrders}</span></td>
      <td class="px-4 sm:px-6 py-3 text-xs text-gray-500 dark:text-gray-400 hidden md:table-cell">${joined}</td>
    </tr>`}).join('');
}

async function loadCustomers(){
  document.getElementById('customersTable').innerHTML=`<tr><td colspan="5" class="py-8 text-center"><div class="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>`;
  try{
    const snap=await getDocs(collection(db,'users'));
    allCustomers=[];
    let active=0, newCount=0;
    const thirtyAgo=Date.now()-30*24*60*60*1000;
    for(const d of snap.docs){
      const u=d.data();
      const ordSnap=await getDocs(query(collection(db,'orders'),where('userId','==',d.id)));
      const totalOrders=ordSnap.size;
      if(totalOrders>0) active++;
      if(u.createdAt && new Date(u.createdAt).getTime()>thirtyAgo) newCount++;
      allCustomers.push({...u,id:d.id,totalOrders});
    }
    document.getElementById('totalCustomers').textContent=allCustomers.length;
    document.getElementById('activeCustomers').textContent=active;
    document.getElementById('newCustomers').textContent=newCount;
    renderCustomers(allCustomers);
  }catch(e){document.getElementById('customersTable').innerHTML=`<tr><td colspan="5" class="text-center py-8 text-red-400">${e.message}</td></tr>`;}
}

document.getElementById('searchInput')?.addEventListener('input',e=>{
  const q=e.target.value.toLowerCase();
  renderCustomers(allCustomers.filter(c=>(c.displayName||'').toLowerCase().includes(q)||(c.email||'').toLowerCase().includes(q)));
});

onAuthStateChanged(auth,async user=>{
  if(!user||!ADMIN_EMAILS.includes(user.email)){window.location.href='../Pages/login.html';return;}
  document.getElementById('adminName').textContent=user.displayName||user.email.split('@')[0];
  document.getElementById('adminEmail').textContent=user.email;
  await loadCustomers();
});
document.getElementById('logoutBtn')?.addEventListener('click',async()=>{await signOut(auth);window.location.href='../Pages/login.html';});
