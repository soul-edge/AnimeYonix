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

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
let currentUserUID = null; 

// --- CLOUDFLARE PROXY CONFIG ---
// Replace this with your actual Cloudflare Worker URL when you deploy it
const CLOUDFLARE_PROXY = "https://your-worker.workers.dev/?img=";

// --- AUTH & PROFILE ---
function login() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(err => alert("Login failed: " + err.message));
}
function logout() { firebase.auth().signOut().then(() => { window.location.href = 'index.html'; }); }

function showProfile() {
    if(!document.getElementById('home-view')) return; 
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('profile-view').style.display = 'block';
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    document.getElementById('nav-profile').classList.add('active');
    if(document.querySelector('.sidebar')) document.querySelector('.sidebar').classList.remove('mobile-active');
    loadWishlist();
}

if (typeof firebase.auth === 'function') {
    firebase.auth().onAuthStateChanged(user => {
        const navLogin = document.getElementById('nav-login');
        const navLogout = document.getElementById('nav-logout');
        const navProfile = document.getElementById('nav-profile');
        if (user) {
            currentUserUID = user.uid;
            if(navLogin) navLogin.style.display = 'none';
            if(navLogout) navLogout.style.display = 'flex'; 
            if(navProfile) {
                navProfile.style.display = 'flex';
                if(document.getElementById('home-view')) navProfile.onclick = (e) => { e.preventDefault(); showProfile(); };
            }
            const params = new URLSearchParams(window.location.search);
            if (params.get('id')) checkWishlistStatus(params.get('id'));
        } else {
            currentUserUID = null;
            if(navLogin) navLogin.style.display = 'flex';
            if(navLogout) navLogout.style.display = 'none';
            if(navProfile) navProfile.style.display = 'none';
        }
    });
}

// --- WISHLIST ENGINE ---
async function toggleWishlist(mangaId, title, thumb) {
    if (!currentUserUID) return alert("You must be logged in to save to your Wishlist!");
    try {
        const safeDocId = mangaId.replace(/[^a-zA-Z0-9]/g, '_');
        const docRef = db.collection('users').doc(currentUserUID).collection('wishlist').doc(safeDocId);
        const doc = await docRef.get();
        const btn = document.getElementById('wishlist-btn');
        if (doc.exists) {
            await docRef.delete();
            if(btn) btn.innerHTML = '<i class="far fa
