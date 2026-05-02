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
            if(navLogout) navLogout.style.display = 'inline';
            if(navProfile) navProfile.style.display = 'inline';
            if(document.getElementById('profileGrid')) loadProfile();
        } else {
            currentUserUID = null;
            if(navLogin) navLogin.style.display = 'inline';
            if(navLogout) navLogout.style.display = 'none';
            if(navProfile) navProfile.style.display = 'none';
        }
    });
}

// --- 2. HOMEPAGE & SEARCH (JIKAN API - CRASH PROOF) ---
let activeLetter = 'All'; 

function buildLetterFilter() {
    const letterBox = document.getElementById('letterBox');
    if(!letterBox) return;
    let html = `<button class="active" onclick="setLetter('All', this)">All</button>`;
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
    
    if (header) header.innerText = "Filtering Manga...";
    if (grid) grid.innerHTML = "<p style='color: lightgray; padding-left: 20px;'>Searching database...</p>";

    try {
        let url = `https://api.jikan.moe/v4/manga?limit=12&order_by=popularity`;
        if (query.trim() !== "") url += `&q=${encodeURIComponent(query)}`;
        if (selectedLetter && selectedLetter !== 'All') url += `&letter=${selectedLetter}`;

        const response = await fetch(url);
        
        // Catch Jikan API Rate Limits so it doesn't break your site
        if (response.status === 429) throw new Error("Database cooling down from too many searches. Give it 30 seconds!");
        if (!response.ok) throw new Error("Search failed to connect.");

        const jsonResponse = await response.json();
        if (!jsonResponse.data) throw new Error("No data received.");

        const formattedResults = jsonResponse.data.map(manga => ({
            title: manga.title, 
            mainThumbnail: manga.images.jpg.large_image_url 
        }));
        renderGrid(formattedResults, `Results`, "episodeGrid");
    } catch (error) { 
        console.error("Filter error:", error); 
        if (grid) grid.innerHTML = `<p style='color: #ff4757; padding-left: 20px; font-weight: bold;'>${error.message}</p>`;
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
        card.innerHTML = `
            <div class="thumbnail" style="background-image: url('${manga.mainThumbnail}');"></div>
            <div class="info">
                <h3>${manga.title}</h3>
                <button class="btn detail-btn">Read Now</button>
            </div>
        `;
        card.querySelector('.detail-btn').onclick = () => { 
            window.location.href = `details.html?title=${encodeURIComponent(manga.title)}`; 
        };
        grid.appendChild(card);
    });
}

// --- 3. DETAILS & CHAPTERS (MANGAPILL NINJA SCRAPER) ---
async function loadDetails() {
    const params = new URLSearchParams(window.location.search);
    const title = decodeURIComponent(params.get('title'));
    if(!title || title === "null") return;

    const epList = document.getElementById('ep-list');
    if (epList) epList.innerHTML = "<p style='color: gray;'>Scraping database...</p>";

    // Metadata (Jikan)
    try {
        const res = await fetch(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(title)}&limit=1`);
        if (res.ok) {
            const mal = await res.json();
            if (mal.data && mal.data[0]) {
                const manga = mal.data[0];
                document.getElementById('det-title').innerText = manga.title;
                document.getElementById('det-syn').innerText = manga.synopsis || "No description.";
                document.getElementById('det-thumb').src = manga.images.jpg.large_image_url;
                document.getElementById('det-genre').innerText = "GENRE: " + manga.genres.map(g => g.name).join(', ');
            }
        }
    } catch (e) { console.warn("Metadata skipped"); }

    try {
        // 1. Search for Manga
        const searchRes = await fetch(`/api/search?q=${encodeURIComponent(title)}`);
        if (!searchRes.ok) throw new Error("Backend Scraper Error");
        const searchData = await searchRes.json();

        if (!searchData || searchData.length === 0) {
            if (epList) epList.innerHTML = "<p style='color: gray;'>No chapters found.</p>";
            return;
        }

        const mangaId = searchData[0].id;

        // 2. Scrape Chapter List
        if (epList) epList.innerHTML = "<p style='color: var(--accent);'>Compiling chapters...</p>";
        const chapterRes = await fetch(`/api/search?mangaId=${encodeURIComponent(mangaId)}`);
        const chapters = await chapterRes.json();

        if (epList && chapters.length > 0) {
            epList.innerHTML = ""; 
            
            // Sort ascending (Ch 1, 2, 3...)
            const sortedChapters = chapters.sort((a, b) => a.chap - b.chap);

            sortedChapters.forEach(chapter => {
                const btn = document.createElement('div');
                btn.className = 'ep-btn';
                btn.innerText = chapter.title; 
                btn.style.textAlign = "left"; 
                
                btn.onclick = () => {
                    window.location.href = `watch.html?chapterId=${chapter.id}&title=${encodeURIComponent(title)}&ep=${chapter.chap}`;
                };
                epList.appendChild(btn);
            });
        } else {
            if (epList) epList.innerHTML = "<p style='color: gray;'>Failed to extract chapters.</p>";
        }

    } catch (err) {
        console.error("Scraper Crash:", err);
        if (epList) epList.innerHTML = `<p style='color: #ff4757; font-weight: bold;'>Error: ${err.message}. Please refresh.</p>`;
    }
}

// --- 4. THE MANGA READER (STEALTH MODE INCLUDED) ---
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
        // Ultimate Stealth Mode: Bypass Hotlink Protection without a proxy
        if (!document.querySelector('meta[name="referrer"]')) {
            const meta = document.createElement('meta');
            meta.name = "referrer";
            meta.content = "no-referrer";
            document.head.appendChild(meta);
        }

        const res = await fetch(`/api/search?chapterId=${encodeURIComponent(chapterId)}`);
        if (!res.ok) throw new Error("Image Scraper Failed");
        
        const data = await res.json();
        const pageFiles = data.images; 

        mangaView.innerHTML = ""; 
        
        pageFiles.forEach(imgUrl => {
            const img = document.createElement('img');
            
            // Direct connection to MangaPill's high-speed servers!
            img.src = imgUrl; 
            
            // Added a min-height so you can visually see the layout loading
            img.style.cssText = "width:100%; max-width:900px; display:block; margin:0 auto 5px; min-height:400px; background:#111; color:gray; text-align:center; line-height:400px;";
            img.alt = "Loading page...";
            img.loading = "lazy";
            
            mangaView.appendChild(img);
        });

        const endBtn = document.createElement('button');
        endBtn.innerText = "Back to Details";
        endBtn.className = "btn";
        endBtn.style.maxWidth = "200px";
        endBtn.style.margin = "40px auto";
        endBtn.style.display = "block";
        endBtn.onclick = () => window.location.href = `details.html?title=${encodeURIComponent(title)}`;
        mangaView.appendChild(endBtn);

    } catch (err) {
        mangaView.innerHTML = `<p style='color:red; text-align:center; padding:50px;'>${err.message}. Please refresh.</p>`;
    }
}

// --- 5. UTILS & INIT (CRASH PROOF) ---
async function loadTopManga() {
    const grid = document.getElementById('episodeGrid');
    if (!grid) return;
    
    grid.innerHTML = "<p style='color: lightgray; padding-left: 20px;'>Loading trending...</p>";
    
    try {
        const response = await fetch('https://api.jikan.moe/v4/top/manga?limit=12');
        
        // Catch Rate Limits here too!
        if (response.status === 429) throw new Error("Database cooling down from too many refreshes. Give it 30 seconds!");
        if (!response.ok) throw new Error("Failed to load trending manga.");

        const jsonResponse = await response.json();
        if (!jsonResponse.data) throw new Error("No data received.");

        const formattedResults = jsonResponse.data.map(manga => ({
            title: manga.title, 
            mainThumbnail: manga.images.jpg.large_image_url 
        }));
        renderGrid(formattedResults, "Top Trending Manga", "episodeGrid");
    } catch (error) { 
        console.error("Startup fetch error:", error); 
        if (grid) grid.innerHTML = `<p style='color: #ff4757; padding-left: 20px; font-weight: bold;'>${error.message}</p>`;
    }
}

async function searchAnimeAPI() { 
    const query = document.getElementById('userSearch').value;
    if (query.trim() === "") { loadTopManga(); return; }
    applyFilters(); 
}

window.onload = function() {
    if (document.getElementById('episodeGrid')) {
        buildLetterFilter();
        loadTopManga();
    }
    if (document.getElementById('det-title')) loadDetails();
    if (new URLSearchParams(window.location.search).get('chapterId')) loadMangaReader();
};
