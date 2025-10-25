// app.js (module)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getFirestore, collection, addDoc, serverTimestamp,
  query, orderBy, onSnapshot, doc, deleteDoc, updateDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

/* =====================================================
   🔥 YOUR FIREBASE CONFIG
   ===================================================== */
const firebaseConfig = {
  apiKey: "AIzaSyCaTMHT17s-EjLzwTUO_GGVkdT7yxueDgQ",
  authDomain: "event-registration-main.firebaseapp.com",
  projectId: "event-registration-main",
  storageBucket: "event-registration-main.firebasestorage.app",
  messagingSenderId: "63109792099",
  appId: "1:63109792099:web:85d07a0f6b35f619d01356",
  measurementId: "G-5YJWDRPL0T"
};

/* Initialize Firebase */
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/* DOM Elements */
const regForm = document.getElementById('reg-form');
const tbody = document.getElementById('tbody');
const searchInput = document.getElementById('search');
const filterSelect = document.getElementById('filter-event');
const btnShowLogin = document.getElementById('btn-show-login');
const loginModal = document.getElementById('login-modal');
const btnCloseLogin = document.getElementById('btn-close-login');
const btnLogin = document.getElementById('btn-login');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const userInfo = document.getElementById('user-info');
const userEmailSpan = document.getElementById('user-email');
const btnLogout = document.getElementById('btn-logout');
const btnReset = document.getElementById('btn-reset');

let currentUser = null;
let participantsCache = [];
let isOrganizer = false;

/* ---------------------------
   Registration (public)
   --------------------------- */
regForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const eventName = document.getElementById('event').value.trim();

  if (!name || !email || !eventName) {
    alert('Please fill required fields (Name, Email, Event).');
    return;
  }

  try {
    await addDoc(collection(db, 'participants'), {
      name, email, phone, event: eventName,
      createdAt: serverTimestamp()
    });
    alert('Registration successful!');
    regForm.reset();
  } catch (err) {
    console.error('Add participant error:', err);
    alert('Failed to register. See console.');
  }
});

btnReset.addEventListener('click', () => regForm.reset());

/* ---------------------------
   Real-time participants listener
   --------------------------- */
const q = query(collection(db, 'participants'), orderBy('createdAt', 'desc'));
onSnapshot(q, (snapshot) => {
  const items = [];
  snapshot.forEach(docSnap => {
    const d = docSnap.data();
    items.push({
      id: docSnap.id,
      name: d.name || '',
      email: d.email || '',
      phone: d.phone || '',
      event: d.event || '',
      createdAt: d.createdAt ? d.createdAt.toDate() : null
    });
  });
  participantsCache = items;
  renderTable(items);
  populateFilterEvents(items);
});

/* Render table */
function renderTable(items) {
  const term = (searchInput.value || '').toLowerCase();
  const filterEvent = (filterSelect.value || '').toLowerCase();

  const filtered = items.filter(it => {
    const matchesTerm = !term || (it.name + ' ' + it.email + ' ' + it.event).toLowerCase().includes(term);
    const matchesEvent = !filterEvent || it.event.toLowerCase() === filterEvent;
    return matchesTerm && matchesEvent;
  });

  tbody.innerHTML = filtered.map(it => `
    <tr>
      <td>${escapeHtml(it.name)}</td>
      <td>${escapeHtml(it.email)}</td>
      <td>${escapeHtml(it.phone)}</td>
      <td>${escapeHtml(it.event)}</td>
      <td>${it.createdAt ? it.createdAt.toLocaleString() : ''}</td>
      <td class="actions">
        ${isOrganizer ? `<button onclick="window.editParticipant('${it.id}')">Edit</button>
                         <button class="delete" onclick="window.deleteParticipant('${it.id}')">Delete</button>` : '<span style="color:#888">—</span>'}
      </td>
    </tr>
  `).join('');
}

/* Escape HTML */
function escapeHtml(s='') {
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

searchInput.addEventListener('input', () => renderTable(participantsCache));
filterSelect.addEventListener('change', () => renderTable(participantsCache));

function populateFilterEvents(items = []) {
  const set = new Set(items.map(i => i.event).filter(Boolean));
  const current = filterSelect.value;
  filterSelect.innerHTML = `<option value="">All events</option>` + [...set].map(ev => `<option value="${escapeHtml(ev)}">${escapeHtml(ev)}</option>`).join('');
  if ([...set].includes(current)) filterSelect.value = current;
}

/* ---------------------------
   Organizer Authentication
   --------------------------- */
btnShowLogin.addEventListener('click', () => { loginModal.classList.remove('hidden'); });
btnCloseLogin.addEventListener('click', () => { loginModal.classList.add('hidden'); });
btnLogout.addEventListener('click', async () => {
  await signOut(auth);
});

btnLogin.addEventListener('click', async () => {
  const email = loginEmail.value.trim();
  const password = loginPassword.value;
  if (!email || !password) { alert('Enter email and password'); return; }
  try {
    await signInWithEmailAndPassword(auth, email, password);
    loginModal.classList.add('hidden');
    loginEmail.value = '';
    loginPassword.value = '';
  } catch (err) {
    console.error('Login error:', err);
    alert('Login failed. Check credentials.');
  }
});

/* Watch auth state */
onAuthStateChanged(auth, async (user) => {
  console.log('Auth state changed, user:', user);
  if (!user) {
    currentUser = null; isOrganizer = false;
    userInfo.classList.add('hidden');
    userEmailSpan.textContent = '';
    document.getElementById('btn-show-login').classList.remove('hidden');
    renderTable(participantsCache);
    return;
  }
  currentUser = user;
  userEmailSpan.textContent = user.email;
  userInfo.classList.remove('hidden');
  document.getElementById('btn-show-login').classList.add('hidden');

  try {
    const organizerRef = doc(db, 'organizers', user.uid);
    const snap = await getDoc(organizerRef);
    isOrganizer = snap.exists();
    if (!isOrganizer) {
      alert('You are authenticated but not authorized as an organizer. Contact admin.');
      await signOut(auth);
    }
  } catch (err) {
    console.error('Organizer check failed', err);
    isOrganizer = false;
  }
  renderTable(participantsCache);
});

/* ---------------------------
   Edit & Delete (Organizer)
   --------------------------- */
window.deleteParticipant = async function(id) {
  if (!isOrganizer) { alert('Only organizers can delete.'); return; }
  if (!confirm('Delete this participant permanently?')) return;
  try {
    await deleteDoc(doc(db, 'participants', id));
  } catch (err) {
    console.error('delete error', err);
    alert('Failed to delete. See console.');
  }
};

window.editParticipant = async function(id) {
  if (!isOrganizer) { alert('Only organizers can edit.'); return; }
  try {
    const dRef = doc(db, 'participants', id);
    const dSnap = await getDoc(dRef);
    if (!dSnap.exists()) { alert('Record not found'); return; }
    const data = dSnap.data();
    const newName = prompt('Edit name', data.name || '')?.trim();
    if (newName === null) return;
    const newEmail = prompt('Edit email', data.email || '')?.trim();
    const newPhone = prompt('Edit phone', data.phone || '')?.trim();
    const newEvent = prompt('Edit event', data.event || '')?.trim();
    await updateDoc(dRef, {
      name: newName || data.name,
      email: newEmail || data.email,
      phone: newPhone || data.phone,
      event: newEvent || data.event
    });
  } catch (err) {
    console.error('edit error', err);
    alert('Failed to update. See console.');
  }
};

