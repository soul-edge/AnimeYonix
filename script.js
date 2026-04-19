// --- 1. FIREBASE SETUP ---
// Your actual Firebase credentials
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

        // Target the specific anime document in the cloud
        const docRef = db.collection("animeLibrary").doc(title);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            // Anime exists, just add the new episode
            let data = docSnap.data();
            if (data.episodes.find(e => e.number == epNum)) {
                return alert("Episode " + epNum + " already exists for this title!");
            }
            data.episodes.push({ number: epNum, link: finalUrl });
            await docRef.update({ episodes: data.episodes });
        } else {
            // New Anime, create it
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
        alert("An error occurred saving to Firebase. Check console.");
    }
}

async function displayAdminManager() {
    const managerDiv = document.getElementById('adminManageList');
    if(!managerDiv) return;

    managerDiv.innerHTML = "Loading library from cloud...";

    const snapshot = await db.collection("animeLibrary").get();
    managerDiv.innerHTML = "";

    snapshot.forEach(doc => {
        const title = doc.id;
        const data = doc.data();
        const item = document.createElement('div');
        item.className = 'manage-item';
        item.innerHTML = `
            <span><strong>${title}</strong> (${data.episodes.length} Eps)</span>
            <button class="delete-btn" onclick="deleteAnime('${title.replace(/'/g, "\\'")}')">Delete</button>
        `;
        managerDiv.appendChild(item);
    });
}

async function deleteAnime(title) {
    if(confirm("Delete " + title + " permanently from the cloud?")) {
        await db.collection("animeLibrary").doc(title).delete();
        displayAdminManager();
    }
}

function filterAdminList() {
    const query = document.getElementById('adminSearch').value.toLowerCase();
    const items = document.querySelectorAll('.manage-item');
    items.forEach(item => {
        const title = item.querySelector('strong').innerText.toLowerCase();
        item.style.display = title.includes(query) ? "flex" : "none";
    });
}

// --- 3. HOMEPAGE LOGIC (CLOUD READING) ---
async function displayEpisodes() {
    const grid = document.getElementById('episodeGrid');
    if(!grid) return;

    grid.innerHTML = "<p style='color: white; padding-left: 20px;'>Connecting to cloud database...</p>"; 

    const snapshot = await db.collection("animeLibrary").get();
    grid.innerHTML = ""; 

    snapshot.forEach(doc => {
        const title = doc.id;
        const anime = doc.data();
        
        // Create the card container
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="thumbnail" style="background-image: url('${anime.mainThumbnail}');"></div>
            <div class="info">
                <h3>${title}</h3>
                <button class="btn detail-btn">Details</button>
            </div>
        `;
        
        // Safely attach the click event bypassing the apostrophe bug
        card.querySelector('.detail-btn').addEventListener('click', () => {
            window.location.href = `details.html?title=${encodeURIComponent(title)}`;
        });

        grid.appendChild(card);
    });
}

function filterLibrary() {
    const query = document.getElementById('userSearch').value.toLowerCase();
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        const title = card.querySelector('h3').innerText.toLowerCase();
        card.style.display = title.includes(query) ? "block" : "none";
    });
}

// --- 4. DETAILS PAGE LOGIC ---
async function loadDetails() {
    const params = new URLSearchParams(window.location.search);
    const title = decodeURIComponent(params.get('title'));
    
    if(!title || title === "null") return;

    const docRef = db.collection("animeLibrary").doc(title);
    const docSnap = await docRef.get();

    if(docSnap.exists) {
        const anime = docSnap.data();
        document.getElementById('det-title').innerText = title;
        document.getElementById('det-genre').innerText = "GENRE: " + (anime.genre || "N/A");
        document.getElementById('det-syn').innerText = anime.synopsis || "No description.";
        document.getElementById('det-thumb').src = anime.mainThumbnail;

        const epList = document.getElementById('ep-list');
        epList.innerHTML = ""; 
        
        anime.episodes.sort((a,b) => a.number - b.number).forEach(ep => {
            const btn = document.createElement('div');
            btn.className = 'ep-btn';
            btn.innerText = "Ep " + ep.number;
            btn.onclick = () => window.location.href = `watch.html?url=${encodeURIComponent(ep.link)}&title=${encodeURIComponent(title)}&ep=${ep.number}`;
            epList.appendChild(btn);
        });
    } else {
        document.querySelector('.details-info').innerHTML = "<h1 style='color:red;'>Anime not found in database.</h1>";
    }
}

// --- 5. WATCH PAGE LOGIC ---
function loadVideo() {
    const params = new URLSearchParams(window.location.search);
    const videoUrl = params.get('url');
    const title = params.get('title');
    const ep = params.get('ep');

    if(videoUrl && document.getElementById('mainPlayer')) {
        document.getElementById('mainPlayer').src = videoUrl;
        document.getElementById('playingTitle').innerText = decodeURIComponent(title);
        document.getElementById('playingEp').innerText = "Episode " + ep;
    }
}

// --- 6. INITIALIZATION ROUTER ---
window.onload = function() {
    if (document.getElementById('episodeGrid')) displayEpisodes();
    if (document.getElementById('adminManageList')) displayAdminManager();
    if (document.getElementById('det-title')) loadDetails();
    if (document.getElementById('mainPlayer')) loadVideo();
};
