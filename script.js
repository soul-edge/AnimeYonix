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
        const navProfile = document.getElementById('nav-profile');

        if (user) {
            currentUserUID = user.uid;
            if(navLogin) navLogin.style.display = 'none';
            if(navLogout) navLogout.style.display = 'flex'; // Changed to flex for sidebar
            if(navProfile) navProfile.style.display = 'flex';
        } else {
            currentUserUID = null;
            if(navLogin) navLogin.style.display = 'flex';
            if(navLogout) navLogout.style.display = 'none';
            if(navProfile) navProfile.style.display = 'none';
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
        renderGrid(results, "Top Trending", "episodeGrid");
    } catch (error) { 
        if (grid) grid.innerHTML = `<p style='color: #ff4757; padding-left: 20px;'>${error.message}</p>`;
    }
}

async function searchAnimeAPI() { 
    const query = document.getElementById('userSearch').value;
    if (query.trim() === "") { loadTopManga(); return; }
    
    const grid = document.getElementById('episodeGrid');
    const header = document.querySelector('.content-section h2');
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

// THE NEW MANGADEX STYLE GRID RENDERER
function renderGrid(mangaArray, sectionTitle, targetID) {
    const grid = document.getElementById(targetID);
    const header = document.querySelector('.content-section h2');
    if (header && targetID === "episodeGrid") header.innerText = sectionTitle;
    if(!grid) return;
    grid.innerHTML = ""; 

    mangaArray.forEach(manga => {
        const card = document.createElement('div');
        card.className = 'card';
        
        // Pass cover image through your Vercel proxy
        const safeImageUrl = `/api/search?proxyImage=${encodeURIComponent(manga.thumbnail)}`;
        
        // Professional UI: Full cover, title below, no ugly buttons
        card.innerHTML = `
            <div class="thumbnail-wrapper">
                <div class="thumbnail" style="background-image: url('${safeImageUrl}');"></div>
            </div>
            <div class="info">
                <h3 class="manga-title" title="${manga.title}">${manga.title}</h3>
            </div>
        `;
        
        // Make the entire card clickable
        card.onclick = () => { 
            window.location.href = `details.html?id=${encodeURIComponent(manga.id)}&title=${encodeURIComponent(manga.title)}&thumb=${encodeURIComponent(safeImageUrl)}`; 
        };
        grid.appendChild(card);
    });
}

// --- 3. DETAILS & CHAPTERS ---
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
    if (epList) epList.innerHTML = "<p style='color: var(--accent); padding: 20px 0;'>Extracting chapters...</p>";

    try {
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
    
    if (!chapterId) return;

    document.getElementById('playingTitle').innerText = decodeURIComponent(title);
    document.getElementById('playingEp').innerText = "Chapter " + ep;

    let mangaView = document.getElementById('mangaView');
    if(!mangaView) {
        mangaView = document.createElement('div');
        mangaView.id = "mangaView";
        mangaView.style.cssText = "width:100%; max-width:900px; margin:0 auto; background: var(--bg-dark);";
        
        // Append to wherever your reader container is
        const container = document.querySelector('.player-container') || document.querySelector('.main-content');
        container.appendChild(mangaView);
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
            img.style.cssText = "width:100%; max-width:900px; display:block; margin:0 auto 5px; min-height:400px; background:var(--bg-panel); color:gray; text-align:center; line-height:400px;";
            img.alt = "Loading page...";
            img.loading = "lazy";
            mangaView.appendChild(img);
        });

        const endBtn = document.createElement('button');
        endBtn.innerText = "Back to Homepage";
        endBtn.style.cssText = "background: var(--accent); color: white; border: none; padding: 15px 30px; border-radius: 8px; cursor: pointer; max-width: 200px; margin: 40px auto; display: block; font-weight: bold;";
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
