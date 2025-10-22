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
