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

// --- 2. ADMIN LOGIC (MANUAL FIREBASE OVERRIDES) ---
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
                data.episodes = data.episodes.filter(e => e.number != epNum);
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

// --- 3. HOMEPAGE & FILTER LOGIC (JIKAN API) ---
let activeLetter = 'All'; 

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
    applyFilters(activeLetter);
}

async function applyFilters(selectedLetter = 'All') {
    const query = document.getElementById('userSearch') ? document.getElementById('userSearch').value : "";
    const grid = document.getElementById('episodeGrid');
    const header = document.querySelector('section h2');
    
    if (header) header.innerText = "Filtering Database...";
    if (grid) grid.innerHTML = "<p style='color: lightgray; padding-left: 20px;'>Fetching results...</p>";

    try {
        let url = `https://api.jikan.moe/v4/manga?limit=12&order_by=popularity`;
        if (query.trim() !== "") url += `&q=${encodeURIComponent(query)}`;
        if (selectedLetter && selectedLetter !== 'All' && selectedLetter !== '#') url += `&letter=${selectedLetter}`;

        const response = await fetch(url);
        const jsonResponse = await response.json();

        const formattedResults = jsonResponse.data.map(manga => ({
            title: manga.title, 
            mainThumbnail: manga.images.jpg.large_image_url 
        }));

        renderGrid(formattedResults, `Filtered Results`, "episodeGrid");
    } catch (error) {
        console.error("Filter fetch failed:", error);
    }
}

function renderGrid(animeArray, sectionTitle, targetID) {
    const grid = document.getElementById(targetID);
    const header = document.querySelector('section h2');
    if (header && targetID === "episodeGrid") header.innerText = sectionTitle;
    if(!grid) return;
    grid.innerHTML = ""; 

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
        card.querySelector('.detail-btn').onclick = () => { 
            window.location.href = `details.html?title=${encodeURIComponent(anime.title)}`; 
        };
        grid.appendChild(card);
    });
}

// --- 4. DETAILS PAGE LOGIC (HYBRID JIKAN + MANGADEX) ---
async function loadDetails() {
    const params = new URLSearchParams(window.location.search);
    const title = decodeURIComponent(params.get('title'));
    if(!title || title === "null") return;

    const epList = document.getElementById('ep-list');
    if (epList) epList.innerHTML = "<p style='color: gray;'>Searching MangaDex for chapters...</p>";

    // 1. Get high-quality metadata from Jikan (MAL)
    try {
        const res = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=1`);
        const mal = await res.json();
        
        if (mal.data && mal.data[0]) {
            const manga = mal.data[0];
            document.getElementById('det-title').innerText = manga.title;
            document.getElementById('det-syn').innerText = manga.synopsis || "No description available.";
            document.getElementById('det-thumb').src = manga.images.jpg.large_image_url;
            
            const ratingElement = document.getElementById('det-rating');
            if (ratingElement) ratingElement.innerHTML = `⭐️ ${manga.score || 'N/A'} / 10`;
            
            const genres = manga.genres.map(g => g.name).join(', ');
            document.getElementById('det-genre').innerText = "GENRE: " + (genres || "N/A");
        }
    } catch (e) { console.error("Jikan detail load failed", e); }

    // 2. Fetch actual Chapters from MangaDex
    try {
        // We use "title" from the URL for a broad search
        const searchRes = await fetch(`https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=5&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`);
        const searchData = await searchRes.json();

        if (searchData.data && searchData.data.length > 0) {
            // We take the first result that MangaDex thinks matches best
            const mangaId = searchData.data[0].id;
            
            // Get chapters: English only, sorted by chapter ascending
            const feedRes = await fetch(`https://api.mangadex.org/manga/${mangaId}/feed?translatedLanguage[]=en&order[chapter]=asc&limit=100&includeExternalUrl=0`);
            const feedData = await feedRes.json();

            if (epList) {
                if (!feedData.data || feedData.data.length === 0) {
                    epList.innerHTML = "<p style='color: gray;'>Found the manga, but no English chapters are available on MangaDex.</p>";
                    return;
                }

                epList.innerHTML = ""; 
                feedData.data.forEach(chapter => {
                    const attrs = chapter.attributes;
                    const chapNum = attrs.chapter || "???";
                    const chapTitle = attrs.title ? `: ${attrs.title}` : "";

                    const btn = document.createElement('div');
                    btn.className = 'ep-btn';
                    btn.innerText = `Chapter ${chapNum}${chapTitle}`;
                    
                    // Link to the MangaDex reader
                    btn.onclick = () => window.open(`https://mangadex.org/chapter/${chapter.id}`, '_blank');
                    epList.appendChild(btn);
                });
            }
        } else {
            if (epList) epList.innerHTML = "<p style='color: gray;'>MangaDex couldn't find a match for this title.</p>";
        }
    } catch (err) {
        console.error("MangaDex fetch failed", err);
        if (epList) epList.innerHTML = `<p style='color: #ff4757;'>Error connecting to MangaDex. Please refresh.</p>`;
    }
}
// --- 5. WATCHLIST & PROFILE ---
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
        btn.innerHTML = "💔 Remove"; btn.style.background = "#ff4757";
    } else {
        btn.innerHTML = "❤️ Add to List"; btn.style.background = "#444";
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
            let d = doc.data(); d.title = t; items.push(d);
        } else {
            items.push({ title: t, mainThumbnail: 'https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=600&auto=format&fit=crop' });
        }
    }
    renderGrid(items, "My List", "profileGrid");
}

// --- 6. STARTUP & SEARCH TRIGGER ---
async function searchAnimeAPI() { 
    const query = document.getElementById('userSearch').value;
    if (query.trim() === "") { loadTopManga(); return; }
    applyFilters(); 
}

async function loadTopManga() {
    const grid = document.getElementById('episodeGrid');
    const header = document.querySelector('section h2');
    if (header) header.innerText = "Top Trending Manga";
    if (grid) grid.innerHTML = "<p style='color: lightgray; padding-left: 20px;'>Loading trending manga...</p>";

    try {
        const response = await fetch('https://api.jikan.moe/v4/top/manga?limit=12');
        const jsonResponse = await response.json();
        const formattedResults = jsonResponse.data.map(manga => ({
            title: manga.title, 
            mainThumbnail: manga.images.jpg.large_image_url 
        }));
        renderGrid(formattedResults, "Top Trending Manga", "episodeGrid");
    } catch (error) { console.error("Startup fetch failed:", error); }
}

window.onload = function() {
    if (document.getElementById('episodeGrid')) {
        buildLetterFilter();
        loadTopManga();
    }
    if (document.getElementById('adminManageList')) displayAdminManager();
    if (document.getElementById('det-title')) loadDetails();
};
