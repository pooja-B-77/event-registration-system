<<<<<<< HEAD
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
   🔥 YOUR FIREBASE CONFIG (from your message)
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
let participantsCache = []; // local cache for filter/search
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

/* Render table function */
function renderTable(items) {
  // apply search & filter
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

/* Sanitize small strings to avoid injected HTML (basic) */
function escapeHtml(s='') {
  return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
}

/* Search & filter events */
searchInput.addEventListener('input', () => renderTable(participantsCache));
filterSelect.addEventListener('change', () => renderTable(participantsCache));

/* Fill event dropdown options */
function populateFilterEvents(items = []) {
  const set = new Set(items.map(i => i.event).filter(Boolean));
  // preserve current selection
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

/* Login handler */
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

/* Watch auth state and check if user is an organizer (organizers/{uid} doc) */
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    currentUser = null; isOrganizer = false;
    userInfo.classList.add('hidden');
    userEmailSpan.textContent = '';
    document.getElementById('btn-show-login').classList.remove('hidden');
    renderTable(participantsCache); // update actions column
    return;
  }
  currentUser = user;
  userEmailSpan.textContent = user.email;
  userInfo.classList.remove('hidden');
  document.getElementById('btn-show-login').classList.add('hidden');

  // check organizers collection for permission doc id == uid
  try {
    const organizerRef = doc(db, 'organizers', user.uid);
    const snap = await getDoc(organizerRef);
    if (snap.exists()) {
      isOrganizer = true;
    } else {
      isOrganizer = false;
      // if you want to auto create an organizer doc on first login, you could do that here (not recommended)
      alert('You are authenticated but not authorized as an organizer. Contact admin.');
      await signOut(auth);
    }
  } catch (err) {
    console.error('Organizer check failed', err);
    isOrganizer = false;
  }
  renderTable(participantsCache); // update actions column
});

/* ---------------------------
   Edit & Delete (Organizer only)
   --------------------------- */

/* Expose functions globally so inline onclick in table works */
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
    // get current doc
    const dRef = doc(db, 'participants', id);
    const dSnap = await getDoc(dRef);
    if (!dSnap.exists()) { alert('Record not found'); return; }
    const data = dSnap.data();
    // simple prompt-based edit (you can replace this with a proper modal)
    const newName = prompt('Edit name', data.name || '')?.trim();
    if (newName === null) return; // cancelled
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

onAuthStateChanged(auth, async (user) => {
  console.log('Auth state changed, user:', user);
  if (!user) { /*...*/ }
  else {
    console.log('Logged in UID:', user.uid);
    // then your organizer check...
  }
});

=======
// -------------------------
// DOM ELEMENTS
// -------------------------
const regForm = document.getElementById("reg-form");
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const eventInput = document.getElementById("event");
const tbody = document.getElementById("tbody");
const searchInput = document.getElementById("search");
const filterEvent = document.getElementById("filter-event");

const btnReset = document.getElementById("btn-reset");
const btnShowLogin = document.getElementById("btn-show-login");
const loginModal = document.getElementById("login-modal");
const btnCloseLogin = document.getElementById("btn-close-login");
const btnLogin = document.getElementById("btn-login");
const loginEmail = document.getElementById("login-email");
const loginPassword = document.getElementById("login-password");

const userInfo = document.getElementById("user-info");
const userEmailSpan = document.getElementById("user-email");
const btnLogout = document.getElementById("btn-logout");

// Firebase global objects from window
const db = window.db;
const auth = window.auth;

// Current logged-in organizer
let currentOrganizerEvent = null;

// -------------------------
// ORGANIZER LOGIN / LOGOUT
// -------------------------
btnShowLogin.addEventListener("click", () => loginModal.classList.remove("hidden"));
btnCloseLogin.addEventListener("click", () => loginModal.classList.add("hidden"));
btnLogout.addEventListener("click", () => auth.signOut());

// -------------------------
// ORGANIZER LOGIN ACTION
// -------------------------
btnLogin.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, loginEmail.value, loginPassword.value);
    loginModal.classList.add("hidden");
    loginEmail.value = "";
    loginPassword.value = "";
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

// -------------------------
// AUTH STATE CHANGE
// -------------------------
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  doc,
  query,
  orderBy,
  where,
  onSnapshot,
  serverTimestamp,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
  if (user) {
    userInfo.classList.remove("hidden");
    userEmailSpan.textContent = user.email;
    btnShowLogin.classList.add("hidden");

    // Get organizer’s assigned event (if exists)
    const orgRef = doc(db, "organizers", user.uid);
    const orgSnap = await getDoc(orgRef);
    if (orgSnap.exists()) {
      currentOrganizerEvent = orgSnap.data().eventName;
      setupRealtime(currentOrganizerEvent);
    }
  } else {
    userInfo.classList.add("hidden");
    btnShowLogin.classList.remove("hidden");
    currentOrganizerEvent = null;
    setupRealtime();
  }
});

// -------------------------
// REGISTER PARTICIPANT
// -------------------------
regForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  try {
    await addDoc(collection(db, "participants"), {
      name: nameInput.value,
      email: emailInput.value,
      phone: phoneInput.value,
      event: eventInput.value,
      createdAt: serverTimestamp(),
    });

    regForm.reset();
  } catch (err) {
    alert("Error adding participant: " + err.message);
  }
});

// Reset form
btnReset.addEventListener("click", () => regForm.reset());

// -------------------------
// REAL-TIME PARTICIPANTS TABLE
// -------------------------
function setupRealtime(filterEventName = null) {
  let q = query(collection(db, "participants"), orderBy("createdAt", "desc"));
  if (filterEventName) q = query(collection(db, "participants"), where("event", "==", filterEventName));

  onSnapshot(q, (snapshot) => {
    tbody.innerHTML = "";
    const eventsSet = new Set();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const tr = document.createElement("tr");

      const createdAt = data.createdAt?.toDate?.().toLocaleString() || "";

      tr.innerHTML = `
        <td>${data.name}</td>
        <td>${data.email}</td>
        <td>${data.phone || ""}</td>
        <td>${data.event}</td>
        <td>${createdAt}</td>
        <td>
          <button class="edit-btn" data-id="${docSnap.id}">Edit</button>
          <button class="delete-btn" data-id="${docSnap.id}">Delete</button>
        </td>
      `;

      tbody.appendChild(tr);
      eventsSet.add(data.event);
    });

    // Update filter dropdown
    filterEvent.innerHTML = '<option value="">All events</option>';
    eventsSet.forEach((evt) => {
      const opt = document.createElement("option");
      opt.value = evt;
      opt.textContent = evt;
      filterEvent.appendChild(opt);
    });

    setupTableActions();
  });
}

// -------------------------
// EDIT / DELETE PARTICIPANTS
// -------------------------
function setupTableActions() {
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const docId = btn.dataset.id;
      const ref = doc(db, "participants", docId);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data = snap.data();
        nameInput.value = data.name;
        emailInput.value = data.email;
        phoneInput.value = data.phone || "";
        eventInput.value = data.event;

        const submitBtn = document.getElementById("btn-submit");
        submitBtn.textContent = "Update";
        submitBtn.onclick = async (e) => {
          e.preventDefault();
          await updateDoc(ref, {
            name: nameInput.value,
            email: emailInput.value,
            phone: phoneInput.value,
            event: eventInput.value,
          });
          submitBtn.textContent = "Register";
          regForm.reset();
        };
      }
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (confirm("Are you sure you want to delete this participant?")) {
        await deleteDoc(doc(db, "participants", btn.dataset.id));
      }
    });
  });
}

// -------------------------
// SEARCH + FILTER
// -------------------------
searchInput.addEventListener("input", () => {
  const term = searchInput.value.toLowerCase();
  tbody.querySelectorAll("tr").forEach((tr) => {
    const name = tr.children[0].textContent.toLowerCase();
    const eventName = tr.children[3].textContent.toLowerCase();
    tr.style.display = name.includes(term) || eventName.includes(term) ? "" : "none";
  });
});

filterEvent.addEventListener("change", () => {
  const selected = filterEvent.value;
  setupRealtime(selected || currentOrganizerEvent);
});

// -------------------------
// CSV DOWNLOAD FEATURE
// -------------------------
document.getElementById("downloadCsvBtn")?.addEventListener("click", async () => {
  const snapshot = await getDocs(collection(db, "participants"));
  const data = snapshot.docs.map((doc) => doc.data());

  if (data.length === 0) {
    alert("No participants found to download!");
    return;
  }

  const headers = Object.keys(data[0]);
  const rows = data.map((obj) => headers.map((h) => `"${(obj[h] || "").toString().replace(/"/g, '""')}"`));
  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "participants.csv";
  link.click();
});

// Initialize on load
setupRealtime();
>>>>>>> 4abf62d4d0beb1801624dae3dd7debc07dc34e8d
