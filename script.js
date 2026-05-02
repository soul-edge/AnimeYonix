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

// --- 2. HOMEPAGE & SEARCH (JIKAN API) ---
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
    if (grid) grid.innerHTML = "<p style='color: lightgray; padding-left: 20px;'>Searching...</p>";

    try {
        let url = `https://api.jikan.moe/v4/manga?limit=12&order_by=popularity`;
        if (query.trim() !== "") url += `&q=${encodeURIComponent(query)}`;
        if (selectedLetter && selectedLetter !== 'All') url += `&letter=${selectedLetter}`;

        const response = await fetch(url);
        const jsonResponse = await response.json();
        const formattedResults = jsonResponse.data.map(manga => ({
            title: manga.title, 
            mainThumbnail: manga.images.jpg.large_image_url 
        }));
        renderGrid(formattedResults, `Results`, "episodeGrid");
    } catch (error) { console.error("Filter error:", error); }
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

// --- 3. DETAILS & CHAPTERS (ULTRA FETCH) ---
async function loadDetails() {
    const params = new URLSearchParams(window.location.search);
    const title = decodeURIComponent(params.get('title'));
    if(!title || title === "null") return;

    const epList = document.getElementById('ep-list');
    if (epList) epList.innerHTML = "<p style='color: gray;'>Establishing secure connection...</p>";

    // 1. Get Metadata (Keep Jikan for your UI layout)
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

    // 2. Fetch from ComicK directly (Bypassing Vercel completely)
    try {
        if (epList) epList.innerHTML = "<p style='color: var(--accent);'>Fetching complete database...</p>";

        // Search for the ComicK ID (hid)
        const searchUrl = `https://api.comick.app/v1.0/search?q=${encodeURIComponent(title)}&limit=1`;
        const searchRes = await fetch(searchUrl);
        if (!searchRes.ok) throw new Error("Could not find manga on ComicK");
        
        const searchData = await searchRes.json();
        if (!searchData || searchData.length === 0) {
            if (epList) epList.innerHTML = "<p style='color: gray;'>No chapters found.</p>";
            return;
        }

        const mangaHid = searchData[0].hid;

        // Fetch ALL chapters in one massive, fast request
        const feedUrl = `https://api.comick.app/comic/${mangaHid}/chapters?lang=en&limit=99999`;
        const feedRes = await fetch(feedUrl);
        if (!feedRes.ok) throw new Error("Failed to load chapter list");

        const feedData = await feedRes.json();
        const allChapters = feedData.chapters || [];

        if (epList && allChapters.length > 0) {
            epList.innerHTML = ""; 
            const chapterMap = new Map();

            // Filter out duplicates and bad data
            allChapters.forEach(chapter => {
                if (!chapter.chap) return; // Skip promo art or unnumbered extras

                const chapNumFloat = parseFloat(chapter.chap);
                if (isNaN(chapNumFloat)) return; 

                // If multiple groups upload Ch 1, keep the one that actually bothered to name it
                if (!chapterMap.has(chapNumFloat)) {
                    chapterMap.set(chapNumFloat, chapter);
                } else {
                    const existing = chapterMap.get(chapNumFloat);
                    if (!existing.title && chapter.title) {
                        chapterMap.set(chapNumFloat, chapter); 
                    }
                }
            });

            // Mathematical Sort
            const sortedChapters = Array.from(chapterMap.values()).sort((a, b) => {
                return parseFloat(a.chap) - parseFloat(b.chap);
            });

            // Render UI
            sortedChapters.forEach(chapter => {
                const chapNum = chapter.chap;
                const displayTitle = chapter.title ? ` - ${chapter.title}` : ''; 

                const btn = document.createElement('div');
                btn.className = 'ep-btn';
                btn.innerText = `Ch. ${chapNum}${displayTitle}`;
                btn.style.textAlign = "left"; 
                
                btn.onclick = () => {
                    // Send the ComicK HID to the reader
                    window.location.href = `watch.html?chapterId=${chapter.hid}&title=${encodeURIComponent(title)}&ep=${chapNum}`;
                };
                epList.appendChild(btn);
            });
        } else {
            if (epList) epList.innerHTML = "<p style='color: gray;'>No English chapters found.</p>";
        }

    } catch (err) {
        console.error("ComicK Error:", err);
        if (epList) epList.innerHTML = `<p style='color: #ff4757; font-weight: bold;'>Error: ${err.message}. Please refresh.</p>`;
    }
}
// --- 4. PRO MANGA READER ---
async function loadMangaReader() {
    const params = new URLSearchParams(window.location.search);
    const chapterId = params.get('chapterId');
    const title = params.get('title');
    const ep = params.get('ep');
    const wrapper = document.querySelector('.video-wrapper');
    const mainPlayer = document.getElementById('mainPlayer');
    
    if (!chapterId) return;

    // Clear video styling constraints
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
    mangaView.innerHTML = "<p style='color:white; text-align:center; padding:50px;'>Assembling high-quality pages...</p>";
    window.scrollTo(0, 0);

    try {
        // Fetch image data directly from ComicK
        const res = await fetch(`https://api.comick.app/chapter/${chapterId}`);
        if (!res.ok) throw new Error("Failed to connect to image server");
        
        const serverData = await res.json();
        const pageFiles = serverData.chapter.md_images; 

        mangaView.innerHTML = ""; 
        
        pageFiles.forEach(imgData => {
            const img = document.createElement('img');
            // ComicK's dedicated image server
            const fullUrl = `https://meo.comick.pictures/${imgData.b2key}`;
            
            // We still use wsrv.nl to ensure total stability and bypass any browser blocks
            img.src = `https://wsrv.nl/?url=${encodeURIComponent(fullUrl)}&default=${encodeURIComponent(fullUrl)}`;
            img.style.cssText = "width:100%; display:block; margin:0; border:none;";
            img.loading = "lazy";
            img.onerror = () => { img.src = fullUrl; }; // Fallback to direct link
            
            mangaView.appendChild(img);
        });

        // Add back button
        const endBtn = document.createElement('button');
        endBtn.innerText = "Back to Details";
        endBtn.className = "btn";
        endBtn.style.maxWidth = "200px";
        endBtn.style.margin = "40px auto";
        endBtn.style.display = "block";
        endBtn.onclick = () => window.location.href = `details.html?title=${encodeURIComponent(title)}`;
        mangaView.appendChild(endBtn);

    } catch (err) {
        console.error("Reader Error:", err);
        mangaView.innerHTML = "<p style='color:red; text-align:center; padding:50px;'>Image server failed. Please refresh.</p>";
    }
}

// --- 5. UTILS & INIT ---
async function loadTopManga() {
    const grid = document.getElementById('episodeGrid');
    if (grid) grid.innerHTML = "<p style='color: lightgray; padding-left: 20px;'>Loading trending...</p>";
    try {
        const response = await fetch('https://api.jikan.moe/v4/top/manga?limit=12');
        const jsonResponse = await response.json();
        const formattedResults = jsonResponse.data.map(manga => ({
            title: manga.title, 
            mainThumbnail: manga.images.jpg.large_image_url 
        }));
        renderGrid(formattedResults, "Top Trending Manga", "episodeGrid");
    } catch (error) { console.error("Startup fetch error:", error); }
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
