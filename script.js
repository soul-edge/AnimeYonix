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

let currentUserUID = null; 

// --- 1.5 AUTH LOGIC ---
function login() {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPass').value;
    firebase.auth().signInWithEmailAndPassword(email, pass)
        .then(() => { console.log("Logged in successfully"); })
        .catch(error => { alert("Login Failed: " + error.message); });
}

function register() {
    const email = document.getElementById('adminEmail').value;
    const pass = document.getElementById('adminPass').value;
    firebase.auth().createUserWithEmailAndPassword(email, pass)
        .then(() => { alert("Account created successfully!"); })
        .catch(error => { alert("Registration Failed: " + error.message); });
}

function logout() {
    firebase.auth().signOut().then(() => { window.location.href = 'index.html'; });
}

if (typeof firebase.auth === 'function') {
    firebase.auth().onAuthStateChanged(user => {
        const loginDiv = document.getElementById('login-section');
        const adminDiv = document.getElementById('admin-content');
        const navLogin = document.getElementById('nav-login');
        const navAdmin = document.getElementById('nav-admin');
        const navLogout = document.getElementById('nav-logout');
        const navProfile = document.getElementById('nav-profile');

        const adminUIDs = ["oSGZdrHncdSZfNC482Q0XO2KYR42", "mo66mfVjmxdHUcKtwZSfcBsBieC3"];
        
        if (user) {
            currentUserUID = user.uid;
            if(navLogin) navLogin.style.display = 'none';
            if(navLogout) navLogout.style.display = 'inline';
            if(navProfile) navProfile.style.display = 'inline';
            if(document.getElementById('profileGrid')) loadProfile();

            if (adminUIDs.includes(user.uid)) {
                if(navAdmin) navAdmin.style.display = 'inline';
                if(loginDiv) loginDiv.style.display = 'none';
                if(adminDiv) adminDiv.style.display = 'block';
            } else {
                if(navAdmin) navAdmin.style.display = 'none'; 
                if(loginDiv) loginDiv.style.display = 'none';
                if(window.location.pathname.includes('admin.html')) window.location.href = 'index.html';
            }
        } else {
            currentUserUID = null;
            if(loginDiv) loginDiv.style.display = 'block';
            if(adminDiv) adminDiv.style.display = 'none';
            if(navLogin) navLogin.style.display = 'inline';
            if(navAdmin) navAdmin.style.display = 'none';
            if(navLogout) navLogout.style.display = 'none';
            if(navProfile) navProfile.style.display = 'none';
        }
    });
}

// --- 2. ADMIN LOGIC ---
async function saveEpisode() {
    try {
        const title = document.getElementById('title').value.trim();
        const genre = document.getElementById('genre').value.trim();
        const synopsis = document.getElementById('synopsis').value.trim();
        const epNum = document.getElementById('episodeNum').value.trim();
        const thumb = document.getElementById('thumbUrl').value.trim();
        const type = document.getElementById('type').value;
        const status = document.getElementById('status').value;
        
        let rawUrl = document.getElementById('videoUrl').value.trim();
        let finalUrl = rawUrl;
        if (rawUrl.includes('src=')) {
            const match = rawUrl.match(/src="([^"]+)"/);
            if (match) finalUrl = match[1];
        }

        if(!title) return alert("Error: Title required!");

        const docRef = db.collection("animeLibrary").doc(title);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            let data = docSnap.data();
            let updateData = { type: type, status: status };
            if (genre) updateData.genre = genre;
            if (synopsis) updateData.synopsis = synopsis;
            if (thumb) updateData.mainThumbnail = thumb;

            if (epNum && finalUrl) {
                if (data.episodes.find(e => e.number == epNum)) return alert("Ep exists!");
                data.episodes.push({ number: epNum, link: finalUrl });
                updateData.episodes = data.episodes;
            }
            await docRef.update(updateData);
            alert("Updated!");
        } else {
            await docRef.set({ 
                mainThumbnail: thumb || 'https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=600&auto=format&fit=crop', 
                genre: genre || "Unknown", synopsis: synopsis || "No description.", type: type, status: status, 
                episodes: [{ number: epNum, link: finalUrl }] 
            });
            alert("Published!");
        }
        location.reload(); 
    } catch (error) { alert("Error saving data."); }
}

async function displayAdminManager() {
    const managerDiv = document.getElementById('adminManageList');
    if(!managerDiv) return;
    const snapshot = await db.collection("animeLibrary").get();
    managerDiv.innerHTML = "";
    snapshot.forEach(doc => {
        const title = doc.id;
        const data = doc.data();
        const item = document.createElement('div');
        item.className = 'manage-item';
        item.innerHTML = `<span><strong>${title}</strong> (${data.episodes.length} Eps)</span><button class="delete-btn" onclick="deleteAnime('${title.replace(/'/g, "\\'")}')">Delete</button>`;
        managerDiv.appendChild(item);
    });
}

async function deleteAnime(title) {
    if(confirm("Delete " + title + "?")) {
        await db.collection("animeLibrary").doc(title).delete();
        displayAdminManager();
    }
}

// --- 3. HOMEPAGE LOGIC ---
let globalAnimeData = []; 
let activeLetter = 'All'; 

async function displayEpisodes() {
    const grid = document.getElementById('episodeGrid');
    if(!grid) return;
    const snapshot = await db.collection("animeLibrary").get();
    globalAnimeData = []; 
    let uniqueGenres = new Set(); 

    snapshot.forEach(doc => {
        const title = doc.id;
        const anime = doc.data();
        anime.title = title; 
        globalAnimeData.push(anime);
        if (anime.genre) {
            anime.genre.split(',').forEach(g => {
                let clean = g.trim();
                if (clean !== "" && clean !== "Unknown") uniqueGenres.add(clean);
            });
        }
    });

    const genreSelect = document.getElementById('filter-genre');
    if(genreSelect) {
        genreSelect.innerHTML = `<option value="All">All Genres</option>`;
        Array.from(uniqueGenres).sort().forEach(g => { genreSelect.innerHTML += `<option value="${g}">${g}</option>`; });
    }

    buildLetterFilter();
    renderGrid(globalAnimeData, "Recent Additions", "episodeGrid");
}

function buildLetterFilter() {
    const letterBox = document.getElementById('letterBox');
    if(!letterBox) return;
    let html = `<button class="active" onclick="setLetter('All', this)">All</button><button onclick="setLetter('#', this)">#</button>`;
    for(let i = 65; i <= 90; i++) {
        let letter = String.fromCharCode(i);
        html += `<button onclick="setLetter('${letter}', this)">${letter}</button>`;
    }
    letterBox.innerHTML = html;
}

function setLetter(letter, btnElement) {
    activeLetter = letter;
    document.querySelectorAll('.filter-letters button').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    applyFilters();
}

function applyFilters() {
    const searchQuery = document.getElementById('userSearch') ? document.getElementById('userSearch').value.toLowerCase() : "";
    const activeGenre = document.getElementById('filter-genre') ? document.getElementById('filter-genre').value : 'All';
    const activeType = document.getElementById('filter-type') ? document.getElementById('filter-type').value : 'All';
    const activeStatus = document.getElementById('filter-status') ? document.getElementById('filter-status').value : 'All';

    const filtered = globalAnimeData.filter(anime => {
        const matchesSearch = anime.title.toLowerCase().includes(searchQuery);
        const matchesGenre = (activeGenre === 'All') || (anime.genre && anime.genre.toLowerCase().includes(activeGenre.toLowerCase()));
        
        // Fixed: Allow showing anime even if Type/Status isn't set yet
        const matchesType = (activeType === 'All') || (anime.type === activeType) || (!anime.type);
        const matchesStatus = (activeStatus === 'All') || (anime.status === activeStatus) || (!anime.status);
        
        let matchesLetter = true;
        if (activeLetter !== 'All') {
            let firstChar = anime.title.charAt(0).toUpperCase();
            if (activeLetter === '#') matchesLetter = !/[A-Z]/.test(firstChar); 
            else matchesLetter = (firstChar === activeLetter);
        }
        return matchesSearch && matchesGenre && matchesType && matchesStatus && matchesLetter;
    });

    renderGrid(filtered, "Filtered Results", "episodeGrid");
}

function renderGrid(animeArray, sectionTitle, targetID) {
    const grid = document.getElementById(targetID);
    const header = document.querySelector('section h2');
    if (header && targetID === "episodeGrid") header.innerText = sectionTitle;
    if(!grid) return;
    grid.innerHTML = ""; 

    if (animeArray.length === 0) {
        grid.innerHTML = "<p style='color: gray; padding-left: 20px;'>No anime found.</p>";
        return;
    }

    animeArray.forEach(anime => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="thumbnail" style="background-image: url('${anime.mainThumbnail}');"></div>
            <div class="info">
                <h3>${anime.title}</h3>
                <button class="btn detail-btn">Details</button>
            </div>
        `;
        card.querySelector('.detail-btn').onclick = () => { window.location.href = `details.html?title=${encodeURIComponent(anime.title)}`; };
        grid.appendChild(card);
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
        
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                currentUserUID = user.uid;
                checkWatchlistStatus(title); 
            }
        });

        const ratingElement = document.getElementById('det-rating');
        if (ratingElement) {
            try {
                const res = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`);
                const mal = await res.json();
                if (mal.data && mal.data[0]) {
                    ratingElement.innerHTML = `⭐️ ${mal.data[0].score} / 10 <span style="font-size:0.8rem;color:gray;">(MAL)</span>`;
                } else {
                    ratingElement.innerText = "⭐️ No Rating Found";
                }
            } catch (e) { ratingElement.innerText = ""; }
        }

        const epList = document.getElementById('ep-list');
        if(epList && anime.episodes) {
            epList.innerHTML = ""; 
            anime.episodes.sort((a,b) => a.number - b.number).forEach(ep => {
                const btn = document.createElement('div');
                btn.className = 'ep-btn';
                btn.innerText = "Ep " + ep.number;
                btn.onclick = () => window.location.href = `watch.html?url=${encodeURIComponent(ep.link)}&title=${encodeURIComponent(title)}&ep=${ep.number}`;
                epList.appendChild(btn);
            });
        }
    }
}

// --- 4.5 WATCHLIST LOGIC ---
async function toggleWatchlist() {
    if(!currentUserUID) return alert("Log in first!");
    const title = document.getElementById('det-title').innerText;
    const userRef = db.collection("users").doc(currentUserUID);
    const doc = await userRef.get();
    
    let list = (doc.exists) ? (doc.data().watchlist || []) : [];

    if(list.includes(title)) {
        list = list.filter(t => t !== title);
        alert("Removed.");
    } else {
        list.push(title);
        alert("Added!");
    }
    await userRef.set({ watchlist: list }, { merge: true });
    checkWatchlistStatus(title);
}

async function checkWatchlistStatus(title) {
    if(!currentUserUID) return;
    const btn = document.getElementById('watchlist-btn');
    if(!btn) return;
    btn.style.display = "inline-block";

    const doc = await db.collection("users").doc(currentUserUID).get();
    if(doc.exists && doc.data().watchlist && doc.data().watchlist.includes(title)) {
        btn.innerHTML = "💔 Remove";
        btn.style.background = "#ff4757";
    } else {
        btn.innerHTML = "❤️ Add to List";
        btn.style.background = "#444";
    }
}

async function loadProfile() {
    const profileGrid = document.getElementById('profileGrid');
    if(!profileGrid || !currentUserUID) return;

    profileGrid.innerHTML = "<p style='color:white;'>Loading...</p>";
    const userDoc = await db.collection("users").doc(currentUserUID).get();
    
    if(!userDoc.exists || !userDoc.data().watchlist || userDoc.data().watchlist.length === 0) {
        profileGrid.innerHTML = "<p style='color:gray;'>Your list is empty.</p>";
        return;
    }

    const titles = userDoc.data().watchlist;
    let items = [];
    for (let t of titles) {
        const doc = await db.collection("animeLibrary").doc(t).get();
        if(doc.exists) {
            let d = doc.data();
            d.title = t;
            items.push(d);
        }
    }
    renderGrid(items, "My List", "profileGrid");
}

// --- 5. WATCH PAGE ---
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

// --- 6. INIT ---
window.onload = function() {
    if (document.getElementById('episodeGrid')) displayEpisodes();
    if (document.getElementById('adminManageList')) displayAdminManager();
    if (document.getElementById('det-title')) loadDetails();
    if (document.getElementById('mainPlayer')) loadVideo();
};
