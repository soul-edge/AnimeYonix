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

// Initialize Firebase
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

// Watcher: Automatically shows/hides Admin Panel based on login status
firebase.auth().onAuthStateChanged(user => {
    const loginDiv = document.getElementById('login-section');
    const adminDiv = document.getElementById('admin-content');
    
    if (user) {
        // Logged In: Hide login form, show admin panel
        if(loginDiv) loginDiv.style.display = 'none';
        if(adminDiv) adminDiv.style.display = 'block';
    } else {
        // Logged Out: Show login form, hide admin panel
        if(loginDiv) loginDiv.style.display = 'block';
        if(adminDiv) adminDiv.style.display = 'none';
    }
});

// --- 2. ADMIN LOGIC (CLOUD WRITING) ---
async function saveEpisode() {
    try {
        const title = document.getElementById('title').value.trim();
        const genre = document.getElementById('genre').value.trim() || "Unknown";
        const synopsis = document.getElementById('synopsis').value.trim() || "No description.";
        const epNum = document.getElementById('episodeNum').value.trim();
        const thumb = document.getElementById('thumbUrl').value.trim() || 'https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=600&auto=format&fit=crop';
        
        let rawUrl = document.getElementById('videoUrl').value.trim();
        let finalUrl = rawUrl;
        if (rawUrl.includes('src=')) {
            const match = rawUrl.match(/src="([^"]+)"/);
            if (match) finalUrl = match[1];
        }

        if(!title || !finalUrl || !epNum) {
            return alert("Error: Title, Episode #, and URL are required!");
        }

        const docRef = db.collection("animeLibrary").doc(title);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            let data = docSnap.data();
            if (data.episodes.find(e => e.number == epNum)) {
                return alert("Episode " + epNum + " already exists for this title!");
            }
            data.episodes.push({ number: epNum, link: finalUrl });
            await docRef.update({ episodes: data.episodes });
        } else {
            await docRef.set({
                mainThumbnail: thumb,
                genre: genre,
                synopsis: synopsis,
                episodes: [{ number: epNum, link: finalUrl }]
            });
        }
        
        alert("Anime Published to Cloud Successfully!");
        location.reload(); 
    } catch (error) {
        console.error("Save Error:", error);
        alert("Permission Denied: Only the Admin can save data.");
    }
}

async function displayAdminManager() {
    const managerDiv = document.getElementById('adminManageList');
    if(!managerDiv) return;

    managerDiv.innerHTML = "Loading library from cloud...";

    const snapshot = await db.collection("animeLibrary").get();
    managerDiv.innerHTML = "";

    snapshot.forEach(doc => {
        const title =
