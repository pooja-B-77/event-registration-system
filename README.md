# Event Registration System

A ready-to-use web app to register participants for events and view/manage them in real time using Firebase Firestore.

## 🧱 Tech Stack
- HTML, CSS, JavaScript (Frontend)
- Firebase Firestore (Backend database)
- Firebase Authentication (optional for organizers)
- Vercel (for hosting)

## ⚙️ Setup Instructions

### Step 1: Clone the project
```bash
git clone <your-repo-url>
cd EventRegistrationSystem
```

### Step 2: Open in VS Code
Open the folder in VS Code.

### Step 3: Setup Firebase
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project.
3. Enable **Firestore Database** (Native Mode).
4. (Optional) Enable **Email/Password Authentication** for organizers.
5. Go to **Project Settings → SDK Setup and Configuration → Firebase Config**.
6. Copy the config object and paste it inside `index.html` where it says:
   ```js
   const firebaseConfig = {
     // Paste your Firebase config here
   };
   ```

### Step 4: Run locally
Simply open `index.html` in your browser (double click).  
It will connect to Firebase directly via client SDKs.

### Step 5: Firestore Rules (optional for testing)
```js
service cloud.firestore {
  match /databases/{database}/documents {
    match /participants/{docId} {
      allow read, write: if true; // open for testing only
    }
  }
}
```

### Step 6: Deployment (next phase)
We’ll deploy to Vercel once you confirm frontend works locally.

---
## 🧩 Features
- Register participants via form
- View all participants in real-time table
- Edit and delete entries
- Search and filter by event or name
- Optional organizer login

---
## 💬 Contact
Made by Pooja — for learning and event management purposes.
