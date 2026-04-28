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

// Global variable to keep track of who is logged in
let currentUserUID = null; 

// --- 1.5 AUTH LOGIC (LOGIN/REGISTER/LOGOUT) ---
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
        .then(() => { alert("Account created successfully! Welcome to AnimeYonix."); })
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
        const navProfile = document.getElementById('nav-profile'); // New Profile Link

        const adminUIDs = ["oSGZdrHncdSZfNC482Q0XO2KYR42", "mo66mfVjmxdHUcKtwZSfcBsBieC3"];
        
        if (user) {
            currentUserUID = user.uid; // Save their ID
            if(navLogin) navLogin.style.display = 'none';
            if(navLogout) navLogout.style.display = 'inline';
            if(navProfile) navProfile.style.display = 'inline'; // Show My List
            
            // Check if they are on a details page, and update the watchlist button
            if(document.getElementById('det-title')) checkWatchlistStatus(document.getElementById('det-title').innerText);

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
            if(navProfile) navProfile.style.display = 'none'; // Hide My List
        }
    });
}

// --- 2. ADMIN LOGIC (CLOUD WRITING & EDITING) ---
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

        if(!title) return alert("Error: Anime Title is required!");

        const docRef = db.collection("animeLibrary").doc(title);
        const docSnap = await docRef.get();

        if (docSnap.exists) {
            let data = docSnap.data();
            let updateData = { type: type, status: status };
            if (genre) updateData.genre = genre;
            if (synopsis) updateData.synopsis = synopsis;
            if (thumb) updateData.mainThumbnail = thumb;

            if (epNum && finalUrl) {
                if (data.episodes.find(e => e.number == epNum)) return alert("Episode " + epNum + " already exists!");
                data.episodes.push({ number: epNum, link: finalUrl });
                updateData.episodes = data.episodes;
            }
            await docRef.update(updateData);
            alert("Anime Details Updated Successfully!");
        } else {
            if(!finalUrl || !epNum) return alert("Error: Episode # and Video URL are required for a NEW anime!");
            await docRef.set({ 
                mainThumbnail: thumb || 'https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=600&auto=format&fit=crop', 
                genre: genre || "Unknown", synopsis: synopsis || "No description.", type: type, status: status, 
                episodes: [{ number: epNum, link: finalUrl }] 
            });
            alert("New Anime Published to Cloud Successfully!");
        }
        location.reload(); 
    } catch (error) { alert("Permission Denied: Only the Admin can save data."); }
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
        item.innerHTML = `<span><strong>${title}</strong> (${data.episodes.length} Eps)</span><button class="delete-btn" onclick="deleteAnime('${title.replace(/'/g, "\\'")}')">Delete</button>`;
        managerDiv.appendChild(item);
    });
}

async function deleteAnime(title) {
    if(confirm("Delete " + title + " permanently?")) {
        try {
            await db.collection("animeLibrary").doc(title).delete();
            displayAdminManager();
        } catch(e) { alert("Error: You don't have permission."); }
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

// --- 3. HOMEPAGE LOGIC (ADVANCED FILTERS) ---
let globalAnimeData = []; 
let activeLetter = 'All'; 

async function displayEpisodes() {
    const grid = document.getElementById('episodeGrid');
    if(!grid) return;
    grid.innerHTML = "<p style='color: white; padding-left: 20px;'>Connecting to cloud database...</p>"; 

    const snapshot = await db.collection("animeLibrary").get();
    globalAnimeData = []; 
    let uniqueGenres = new Set(); 

    snapshot.forEach(doc => {
        const title = doc.id;
        const anime = doc.data();
        anime.title = title; 
        globalAnimeData.push(anime);
        if (anime.genre) {
            let genres = anime.genre.split(',');
            genres.forEach(g => {
                let cleanGenre = g.trim(); 
                if (cleanGenre !== "" && cleanGenre !== "Unknown") uniqueGenres.add(cleanGenre);
            });
        }
    });

    const genreSelect = document.getElementById('filter-genre');
    if(genreSelect) {
        genreSelect.innerHTML = `<option value="All">All Genres</option>`;
        Array.from(uniqueGenres).sort().forEach(g => { genreSelect.innerHTML += `<option value="${g}">${g}</option>`; });
    }

    buildLetterFilter();
    renderGrid(globalAnimeData, "Recent Additions");
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
    const genreSelect = document.getElementById('filter-genre');
    const activeGenre = genreSelect ? genreSelect.value : 'All';
    const typeSelect = document.getElementById('filter-type');
    const activeType = typeSelect ? typeSelect.value : 'All';
    const statusSelect = document.getElementById('filter-status');
    const activeStatus = statusSelect ? statusSelect.value : 'All';

    const filtered = globalAnimeData.filter(anime => {
        const matchesSearch = anime.title.toLowerCase().includes(searchQuery);
        const matchesGenre = (activeGenre === 'All') || (anime.genre && anime.genre.toLowerCase().includes(activeGenre.toLowerCase()));
        const matchesType = (activeType === 'All') || (anime.type === activeType);
        const matchesStatus = (activeStatus === 'All') || (anime.status === activeStatus);
        let matchesLetter = true;
        if (activeLetter !== 'All') {
            let firstChar = anime.title.charAt(0).toUpperCase();
            if (activeLetter === '#') matchesLetter = !/[A-Z]/.test(firstChar); 
            else matchesLetter = (firstChar === activeLetter);
        }
        return matchesSearch && matchesGenre && matchesType && matchesStatus && matchesLetter;
    });

    let headerText = "Filtered Results";
    if (searchQuery === "" && activeGenre === "All" && activeType === "All" && activeStatus === "All" && activeLetter === "All") {
        headerText = "Recent Additions";
    }
    renderGrid(filtered, headerText);
}

function renderGrid(animeArray, sectionTitle) {
    const grid = document.getElementById('episodeGrid');
    const header = document.querySelector('section h2');
    if (header && sectionTitle) header.innerText = sectionTitle;
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
        card.querySelector('.detail-btn').addEventListener('click', () => { window.location.href = `details.html?title=${encodeURIComponent(anime.title)}`; });
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
        
        // Show the Watchlist button if logged in
        if(currentUserUID) checkWatchlistStatus(title);

        const ratingElement = document.getElementById('det-rating');
        if (ratingElement) {
            try {
                const response = await fetch(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(title)}&limit=1`);
                const malData = await response.json();
                if (malData.data && malData.data.length > 0) {
                    const score = malData.data[0].score;
                    if (score) ratingElement.innerHTML = `⭐️ ${score} / 10 <span style="font-size: 0.8rem; color: gray; font-weight: normal;">(MyAnimeList)</span>`;
                    else ratingElement.innerText = "⭐️ No Rating Yet";
                } else { ratingElement.innerText = "⭐️ Rating Not Found"; }
            } catch (error) { ratingElement.innerText = "⭐️ Rating Unavailable"; }
        }

        const epList = document.getElementById('ep-list');
        epList.innerHTML = ""; 
        anime.episodes.sort((a,b) => a.number - b.number).forEach(ep => {
            const btn = document.createElement('div');
            btn.className = 'ep-btn';
            btn.innerText = "Ep " + ep.number;
            btn.onclick = () => window.location.href = `watch.html?url=${encodeURIComponent(ep.link)}&title=${encodeURIComponent(title)}&ep=${ep.number}`;
            epList.appendChild(btn);
        });
    } else { document.querySelector('.details-info').innerHTML = "<h1 style='color:red;'>Anime not found in database.</h1>"; }
}

// --- 4.5 USER PROFILE LOGIC (WATCHLIST) ---
async function toggleWatchlist() {
    if(!currentUserUID) return alert("Please log in to save anime to your Watchlist!");
    const title = document.getElementById('det-title').innerText;
    
    const userRef = db.collection("users").doc(currentUserUID);
    const docSnap = await userRef.get();
    
    let watchlist = [];
    if(docSnap.exists) watchlist = docSnap.data().watchlist || [];

    if(watchlist.includes(title)) {
        // It's already there, remove it
        watchlist = watchlist.filter(t => t !== title);
        await userRef.set({ watchlist: watchlist }, { merge: true });
        alert("Removed from Watchlist.");
    } else {
        // Add it
        watchlist.push(title);
        await userRef.set({ watchlist: watchlist }, { merge: true });
        alert("Added to Watchlist!");
    }
    checkWatchlistStatus(title); // Update the button color
}

async function checkWatchlistStatus(title) {
    if(!currentUserUID) return;
    const btn = document.getElementById('watchlist-btn');
    if(!btn) return;
    
    btn.style.display = "inline-block"; // Make it visible

    const docSnap = await db.collection("users").doc(currentUserUID).get();
    if(docSnap.exists && docSnap.data().watchlist && docSnap.data().watchlist.includes(title)) {
        btn.innerHTML = "💔 Remove from Watchlist";
        btn.style.background = "#ff4757"; // Red
    } else {
        btn.innerHTML = "❤️ Add to Watchlist";
        btn.style.background = "#444"; // Grey
    }
}

async function loadProfile() {
    if(!currentUserUID) return window.location.href = 'index.html'; // Kick out guests
    
    const profileGrid = document.getElementById('profileGrid');
    profileGrid.innerHTML = "<p style='color: white; padding-left: 20px;'>Loading your watchlist...</p>";

    const userDoc = await db.collection("users").doc(currentUserUID).get();
    if(!userDoc.exists || !userDoc.data().watchlist || userDoc.data().watchlist.length === 0) {
        profileGrid.innerHTML = "<p style='color: gray; padding-left: 20px;'>Your watchlist is empty! Go browse some anime.</p>";
        return;
    }

    const savedTitles = userDoc.data().watchlist;
    let savedAnimes = [];

    // Fetch the actual data for each saved title
    for (let title of savedTitles) {
        const animeDoc = await db.collection("animeLibrary").doc(title).get();
        if(animeDoc.exists) {
            let animeData = animeDoc.data();
            animeData.title = title;
            savedAnimes.push(animeData);
        }
    }
    
    // We can reuse the homepage render function!
    document.getElementById('episodeGrid').id = "tempID"; // Temporary hack to reuse renderGrid
    profileGrid.id = "episodeGrid"; 
    renderGrid(savedAnimes, "My Watchlist");
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
    
    // Wait for auth to finish before loading profile
    if (document.getElementById('profileGrid')) {
        firebase.auth().onAuthStateChanged(user => {
            if(user) { currentUserUID = user.uid; loadProfile(); }
            else { window.location.href = 'index.html'; }
        });
    }
};
