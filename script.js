// --- 1. FIREBASE SETUP ---
const firebaseConfig = {
    apiKey: "AIzaSyCVwL4UNX2o564IrcQJ9WZGNwkcxiyNArg",
    authDomain: "animeyonix-827c9.firebaseapp.com",
    projectId: "animeyonix-827c9",
    storageBucket: "animeyonix-827c9.firebasestorage.app",
    messagingSenderId: "225022514016",
    appId: "1:225022514016:web:8a8823a527c8e3db3a0405",
    measurementId: "G-NJ0BN6CZ2T"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// --- 1.5 AUTH LOGIC (LOGIN/LOGOUT) ---
function login() {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPass').value;
    
    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(() => {
            console.log("Logged in successfully");
        })
        .catch(error => {
            alert("Access Denied: " + error.message);
        });
}

function logout() {
    firebase.auth().signOut().then(() => {
        location.reload();
    });
}

// Watcher: Automatically shows/hides Admin Panel & Navbar based on login status
if (typeof firebase.auth === 'function') {
    firebase.auth().onAuthStateChanged(user => {
        // Dashboard Page Elements
        const loginDiv = document.getElementById('login-section');
        const adminDiv = document.getElementById('admin-content');
        
        // Navbar Elements
        const navLogin = document.getElementById('nav-login');
        const navAdmin = document.getElementById('nav-admin');
        const navLogout = document.
