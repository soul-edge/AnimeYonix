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

function logout() {
    firebase.auth().signOut().then(() => { window.location.href = 'index.html'; });
}

if (typeof firebase.auth === 'function') {
    firebase.auth().onAuthStateChanged(user => {
        const navLogin = document.getElementById('nav-login');
        const navLogout = document.getElementById('nav-logout');
        if (user) {
            currentUserUID = user.uid;
            if(navLogin) navLogin.style.display = 'none';
            if(navLogout) navLogout.style.display = 'inline';
        } else {
            currentUserUID = null;
            if(navLogin) navLogin.style.display = 'inline';
            if(navLogout) navLogout.style.display = 'none';
        }
    });
}

// --- 2. HOMEPAGE & SEARCH (100% MANGAPILL) ---
async function loadTopManga() {
    const grid = document.getElementById('episodeGrid');
    if (!grid) return;
    grid.innerHTML = "<p style='color: lightgray; padding-left: 20px;'>Loading trending...</p>";
    
    try {
        const response = await fetch('/api/search?trending=true');
        if (!response.ok) throw new Error("Failed to load trending.");
        const results = await response.json();
        renderGrid(results, "Top Trending Manga", "episodeGrid");
    } catch (error) { 
        if (grid) grid.innerHTML = `<p style='color: #ff4757; padding-left: 20px;'>${error.message}</p>`;
    }
}

async function searchAnimeAPI() { 
    const query = document.getElementById('userSearch').value;
    if (query.trim() === "") { loadTopManga(); return; }
    
    const grid = document.getElementById('episodeGrid');
    const header = document.querySelector('section h2');
    if (header) header.innerText = "Search Results";
    if (grid) grid.innerHTML = "<p style='color: lightgray; padding-left: 20px;'>Searching database...</p>";

    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!response.ok) throw new Error("Search failed.");
        const results = await response.json();
        renderGrid(results, "Search Results", "episodeGrid");
    } catch (error) { 
        if (grid) grid.innerHTML = `<p style='color: #ff4757; padding-left: 20px;'>No manga found.</p>`;
    }
}

function renderGrid(mangaArray, sectionTitle, targetID) {
    const grid = document.getElementById(targetID);
    const header = document.querySelector('section h2');
    if (header && targetID === "episodeGrid") header.innerText = sectionTitle;
    if(!grid) return;
    grid.innerHTML = ""; 

    mangaArray.forEach(manga => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // Pass cover image through proxy
        const safeImageUrl = `/api/search?proxyImage=${encodeURIComponent(manga.thumbnail)}`;
        
        card.innerHTML = `
            <div class="thumbnail" style="background-image: url('${safeImageUrl}');"></div>
            <div class="info">
                <h3>${manga.title}</h3>
                <button class="btn detail-btn">Read Now</button>
            </div>
        `;
        
        // Pass the EXACT ID to the details page
        card.querySelector('.detail-btn').onclick = () => { 
            window.location.href = `details.html?id=${encodeURIComponent(manga.id)}&title=${encodeURIComponent(manga.title)}&thumb=${encodeURIComponent(safeImageUrl)}`; 
        };
        grid.appendChild(card);
    });
}

// --- 3. DETAILS & CHAPTERS (ONE FETCH, NO MIXUPS) ---
async function loadDetails() {
    const params = new URLSearchParams(window.location.search);
    const mangaId = decodeURIComponent(params.get('id'));
    const title = decodeURIComponent(params.get('title'));
    const thumb = decodeURIComponent(params.get('thumb'));
    
    if(!mangaId || mangaId === "null") return;

    // Instantly load the Title and Cover Art passed from the homepage
    document.getElementById('det-title').innerText = title;
    document.getElementById('det-thumb').src = thumb;

    const epList = document.getElementById('ep-list');
    if (epList) epList.innerHTML = "<p style='color: var(--accent);'>Extracting data...</p>";

    try {
        // Fetch Synopses, Genres, and Chapters in ONE hit
        const response = await fetch(`/api/search?mangaId=${encodeURIComponent(mangaId)}`);
        if (!response.ok) throw new Error("Backend Scraper Error");
        const data = await response.json();

        // Populate Metadata
        document.getElementById('det-syn').innerText = data.details.description;
        document.getElementById('det-genre').innerText = "GENRE: " + data.details.genres;

        // Populate Chapters
        const chapters = data.chapters;
        if (epList && chapters.length > 0) {
            epList.innerHTML = ""; 
            const sortedChapters = chapters.sort((a, b) => a.chap - b.chap);

            sortedChapters.forEach(chapter => {
                const btn = document.createElement('div');
                btn.className = 'ep-btn';
                btn.innerText = chapter.title; 
                btn.style.textAlign = "left"; 
                
                btn.onclick = () => {
                    window.location.href = `watch.html?chapterId=${encodeURIComponent(chapter.id)}&title=${encodeURIComponent(title)}&ep=${chapter.chap}`;
                };
                epList.appendChild(btn);
            });
        } else {
            if (epList) epList.innerHTML = "<p style='color: gray;'>Failed to extract chapters.</p>";
        }
    } catch (err) {
        if (epList) epList.innerHTML = `<p style='color: #ff4757; font-weight: bold;'>Error: ${err.message}. Please refresh.</p>`;
    }
}

// --- 4. THE MANGA READER ---
async function loadMangaReader() {
    const params = new URLSearchParams(window.location.search);
    const chapterId = params.get('chapterId');
    const title = params.get('title');
    const ep = params.get('ep');
    const wrapper = document.querySelector('.video-wrapper');
    const mainPlayer = document.getElementById('mainPlayer');
    
    if (!chapterId) return;

    if (mainPlayer) mainPlayer.remove();
    if (wrapper) {
        wrapper.style.paddingBottom = "0";
        wrapper.style.height = "auto";
        wrapper.style.background = "transparent";
        wrapper.style.boxShadow = "none";
    }

    document.getElementById('playingTitle').innerText = decodeURIComponent(title);
    document.getElementById('playingEp').innerText = "Chapter " + ep;

    let mangaView = document.getElementById('mangaView');
    if(!mangaView) {
        mangaView = document.createElement('div');
        mangaView.id = "mangaView";
        mangaView.style.cssText = "width:100%; max-width:900px; margin:0 auto; background:#000;";
        document.querySelector('.player-container').appendChild(mangaView);
    }
    mangaView.innerHTML = "<p style='color:white; text-align:center; padding:50px;'>Stealing high-quality pages...</p>";
    window.scrollTo(0, 0);

    try {
        const res = await fetch(`/api/search?chapterId=${encodeURIComponent(chapterId)}`);
        if (!res.ok) throw new Error("Image Scraper Failed");
        
        const data = await res.json();
        const pageFiles = data.images; 

        mangaView.innerHTML = ""; 
        
        pageFiles.forEach(imgUrl => {
            const img = document.createElement('img');
            img.src = `/api/search?proxyImage=${encodeURIComponent(imgUrl)}`; 
            img.style.cssText = "width:100%; max-width:900px; display:block; margin:0 auto 5px; min-height:400px; background:#111; color:gray; text-align:center; line-height:400px;";
            img.alt = "Loading page...";
            img.loading = "lazy";
            mangaView.appendChild(img);
        });

        const endBtn = document.createElement('button');
        endBtn.innerText = "Back to Homepage";
        endBtn.className = "btn";
        endBtn.style.maxWidth = "200px";
        endBtn.style.margin = "40px auto";
        endBtn.style.display = "block";
        endBtn.onclick = () => window.location.href = `index.html`;
        mangaView.appendChild(endBtn);

    } catch (err) {
        mangaView.innerHTML = `<p style='color:red; text-align:center; padding:50px;'>${err.message}. Please refresh.</p>`;
    }
}

// --- 5. INIT ---
window.onload = function() {
    if (document.getElementById('episodeGrid')) loadTopManga();
    if (document.getElementById('det-title')) loadDetails();
    if (new URLSearchParams(window.location.search).get('chapterId')) loadMangaReader();
};
