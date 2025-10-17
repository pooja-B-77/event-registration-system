// DOM Elements
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

// Current logged-in organizer
let currentOrganizerEvent = null;

// --- Organizer Login ---
btnShowLogin.addEventListener("click", () => loginModal.classList.remove("hidden"));
btnCloseLogin.addEventListener("click", () => loginModal.classList.add("hidden"));
btnLogout.addEventListener("click", () => auth.signOut());

// Firebase Auth state listener
auth.onAuthStateChanged(async (user) => {
  if (user) {
    userInfo.classList.remove("hidden");
    userEmailSpan.textContent = user.email;
    btnShowLogin.classList.add("hidden");
    
    // Get organizer event
    const orgDoc = await db.collection("organizers").doc(user.uid).get();
    if (orgDoc.exists) {
      currentOrganizerEvent = orgDoc.data().eventName;
      setupRealtime(currentOrganizerEvent);
    }
  } else {
    userInfo.classList.add("hidden");
    btnShowLogin.classList.remove("hidden");
    currentOrganizerEvent = null;
    setupRealtime(); // Show all participants for public view
  }
});

// Login button
btnLogin.addEventListener("click", async () => {
  try {
    await auth.signInWithEmailAndPassword(loginEmail.value, loginPassword.value);
    loginModal.classList.add("hidden");
    loginEmail.value = "";
    loginPassword.value = "";
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

// --- Participant Registration ---
regForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const participant = {
    name: nameInput.value,
    email: emailInput.value,
    phone: phoneInput.value,
    event: eventInput.value,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("participants").add(participant);
  regForm.reset();
});

// Reset form
btnReset.addEventListener("click", () => regForm.reset());

// --- Real-time Table ---
function setupRealtime(filterEventName = null) {
  let query = db.collection("participants").orderBy("createdAt", "desc");
  if (filterEventName) query = query.where("event", "==", filterEventName);

  query.onSnapshot((snapshot) => {
    tbody.innerHTML = "";
    const eventsSet = new Set();

    snapshot.forEach((doc) => {
      const data = doc.data();
      const tr = document.createElement("tr");

      const createdAt = data.createdAt ? data.createdAt.toDate().toLocaleString() : "";

      tr.innerHTML = `
        <td>${data.name}</td>
        <td>${data.email}</td>
        <td>${data.phone || ""}</td>
        <td>${data.event}</td>
        <td>${createdAt}</td>
        <td>
          <button class="edit-btn" data-id="${doc.id}">Edit</button>
          <button class="delete-btn" data-id="${doc.id}">Delete</button>
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

// --- Edit / Delete buttons ---
function setupTableActions() {
  document.querySelectorAll(".edit-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const docId = btn.dataset.id;
      const docRef = db.collection("participants").doc(docId);
      const docSnap = await docRef.get();
      if (docSnap.exists) {
        const data = docSnap.data();
        nameInput.value = data.name;
        emailInput.value = data.email;
        phoneInput.value = data.phone || "";
        eventInput.value = data.event;

        btnSubmit = document.getElementById("btn-submit");
        btnSubmit.textContent = "Update";
        btnSubmit.onclick = async (e) => {
          e.preventDefault();
          await docRef.update({
            name: nameInput.value,
            email: emailInput.value,
            phone: phoneInput.value,
            event: eventInput.value,
          });
          btnSubmit.textContent = "Register";
          regForm.reset();
        };
      }
    });
  });

  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (confirm("Are you sure to delete this participant?")) {
        await db.collection("participants").doc(btn.dataset.id).delete();
      }
    });
  });
}

// --- Search and Filter ---
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

// --- Initialize table on page load ---
setupRealtime();
