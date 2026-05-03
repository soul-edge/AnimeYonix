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

// --- AUTH & PROFILE LOGIC ---
function login() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(err => alert("Login failed: " + err.message));
}
function logout() { firebase.auth().signOut().then(() => { window.location.href = 'index.html'; }); }

function showProfile() {
    if(!document.getElementById('home-view')) return; // Prevents error on details page
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('profile-view').style.display = 'block';
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    document.getElementById('nav-profile').classList.add('active');
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
                // Only bind the onclick if we are actually on the homepage
                if(document.getElementById('home-view')) {
                    navProfile.onclick = (e) => { e.preventDefault(); showProfile(); };
                }
            }
        } else {
            currentUserUID = null;
            if(navLogin) navLogin.style.display = 'flex';
            if(navLogout) navLogout.style.display = 'none';
            if(navProfile) navProfile.style.display = 'none';
        }
    });
}

// --- WISHLIST ENGINE (FIRESTORE) ---
async function toggleWishlist(mangaId, title, thumb) {
    if (!currentUserUID) return alert("You must be logged in to save to your Wishlist!");
    
    // FIX: Firebase hates slashes in IDs. We change "/manga/123" to "_manga_123"
    const safeDocId = mangaId.replace(/\//g, '_');
    const docRef = db.collection('users').doc(currentUserUID).collection('wishlist').doc(safeDocId);
    
    const doc = await docRef.get();
    const btn = document.getElementById('wishlist-btn');
    
    if (doc.exists) {
        await docRef.delete();
        if(btn) btn.innerHTML = '<i class="far fa-bookmark"></i> Add to Wishlist';
        alert("Removed from Wishlist");
    } else {
        await docRef.set({ id: mangaId, title: title, thumbnail: thumb, addedAt: new Date() });
        if(btn) btn.innerHTML = '<i class="fas fa-bookmark"></i> Saved to Wishlist';
        alert("Saved to Wishlist!");
    }
}

async function loadWishlist() {
    if (!currentUserUID) return;
    const grid = document.getElementById('wishlistGrid');
    if(!grid) return;
    grid.innerHTML = "<p style='color: gray;'>Loading your manga...</p>";
    
    try {
        const snapshot = await db.collection('users').doc(currentUserUID).collection('wishlist').orderBy('addedAt', 'desc').get();
        if (snapshot.empty) return grid.innerHTML = "<p style='color: gray;'>Your wishlist is empty.</p>";
        
        const results = [];
        snapshot.forEach(doc => results.push(doc.data()));
        renderGrid(results, "My Wishlist", "wishlistGrid");
    } catch (err) { grid.innerHTML = "<p style='color: red;'>Error loading wishlist.</p>"; }
}

async function checkWishlistStatus(mangaId) {
    if (!currentUserUID) return;
    const safeDocId = mangaId.replace(/\//g, '_');
    const doc = await db.collection('users').doc(currentUserUID).collection('wishlist').doc(safeDocId).get();
    const btn = document.getElementById('wishlist-btn');
    if (doc.exists && btn) btn.innerHTML = '<i class="fas fa-bookmark"></i> Saved to Wishlist';
}

// --- HOMEPAGE LOGIC & CAROUSEL ---
function scrollCarousel(id, amount) { document.getElementById(id).scrollBy({ left: amount, behavior: 'smooth' }); }

async function fetchSection(query, targetID, title) {
    const grid = document.getElementById(targetID);
    if (!grid) return;
    grid.innerHTML = "<p style='color: lightgray; padding-left: 20px;'>Loading...</p>";
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        renderGrid(results.slice(0, 15), title, targetID);
    } catch (error) { console.error(error); }
}

async function searchAnimeAPI() { 
    const searchInput = document.getElementById('userSearch');
    if (!searchInput) return;
    const query = searchInput.value;
    
    // GLOBAL ROUTING FIX: If they search from the Details page, send them back to the Home page to see results!
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/' && !window.location.pathname.includes('vercel.app')) {
        window.location.href = `index.html?search=${encodeURIComponent(query)}`;
        return;
    }

    if (query.trim() === "") return window.location.reload();
    
    document.getElementById('home-view').innerHTML = `<section class="content-section"><h2>Search Results</h2><div id="searchGrid" class="grid-container"><p style='color: lightgray;'>Searching database...</p></div></section>`;
    
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        renderGrid(results, "Search Results", "searchGrid");
    } catch (error) { document.getElementById('searchGrid').innerHTML = `<p style='color: #ff4757;'>No manga found.</p>`; }
}

function renderGrid(mangaArray, sectionTitle, targetID) {
    const grid = document.getElementById(targetID);
    const header = grid.parentElement.querySelector('h2');
    if (header) header.innerText = sectionTitle;
    if(!grid) return;
    grid.innerHTML = ""; 

    mangaArray.forEach(manga => {
        const card = document.createElement('div');
        card.className = 'card';
        const safeImageUrl = manga.thumbnail.includes('/api/search') ? manga.thumbnail : `/api/search?proxyImage=${encodeURIComponent(manga.thumbnail)}`;
        
        card.innerHTML = `
            <div class="thumbnail-wrapper">
                <div class="thumbnail" style="background-image: url('${safeImageUrl}');"></div>
            </div>
            <div class="info"><h3 class="manga-title" title="${manga.title}">${manga.title}</h3></div>
        `;
        card.onclick = () => { window.location.href = `details.html?id=${encodeURIComponent(manga.id)}&title=${encodeURIComponent(manga.title)}&thumb=${encodeURIComponent(safeImageUrl)}`; };
        grid.appendChild(card);
    });
}

// --- DETAILS PAGE ---
async function loadDetails() {
    const params = new URLSearchParams(window.location.search);
    const mangaId = decodeURIComponent(params.get('id'));
    const title = decodeURIComponent(params.get('title'));
    const thumb = decodeURIComponent(params.get('thumb'));
    if(!mangaId || mangaId === "null") return;

    if (document.getElementById('det-title')) document.getElementById('det-title').innerText = title;
    if (document.getElementById('det-thumb')) document.getElementById('det-thumb').src = thumb;

    const infoCol = document.querySelector('.det-info');
    if (infoCol && !document.getElementById('wishlist-btn')) {
        const wBtn = document.createElement('button');
        wBtn.id = "wishlist-btn"; wBtn.className = "btn"; wBtn.innerHTML = '<i class="far fa-bookmark"></i> Add to Wishlist';
        wBtn.style.marginTop = "15px";
        wBtn.onclick = () => toggleWishlist(mangaId, title, thumb);
        infoCol.appendChild(wBtn);
        setTimeout(() => checkWishlistStatus(mangaId), 1000); 
    }

    const epList = document.getElementById('ep-list');
    if (!epList) return;
    epList.innerHTML = "<p style='color: var(--accent); padding: 20px 0;'>Extracting chapters...</p>";

    try {
        const response = await fetch(`/api/search?mangaId=${encodeURIComponent(mangaId)}`);
        const data = await response.json();
        if (document.getElementById('det-syn')) document.getElementById('det-syn').innerText = data.details.description;
        if (document.getElementById('det-genre')) document.getElementById('det-genre').innerText = "GENRE: " + data.details.genres;

        const chapters = data.chapters;
        if (chapters.length > 0) {
            epList.innerHTML = ""; epList.className = "ep-list"; 
            const sortedChapters = chapters.sort((a, b) => a.chap - b.chap);

            sortedChapters.forEach(chapter => {
                const btn = document.createElement('div');
                btn.className = 'ep-btn'; btn.innerText = chapter.title; 
                btn.onclick = () => { window.location.href = `watch.html?chapterId=${encodeURIComponent(chapter.id)}&mangaId=${encodeURIComponent(mangaId)}&title=${encodeURIComponent(title)}&ep=${chapter.chap}`; };
                epList.appendChild(btn);
            });
        }
    } catch (err) { epList.innerHTML = `<p style='color: red;'>Error loading.</p>`; }
}

// --- READER STATE MACHINE ---
let readerImages = [];
let currentReadMode = 'webtoon';
let currentSinglePage = 0;
let chapterListCache = [];
let currentChapterId = "";
let currentMangaId = "";

async function loadMangaReader() {
    const params = new URLSearchParams(window.location.search);
    currentChapterId = decodeURIComponent(params.get('chapterId'));
    currentMangaId = decodeURIComponent(params.get('mangaId'));
    const title = decodeURIComponent(params.get('title'));
    
    if (!currentChapterId) return;

    if (document.getElementById('playingTitle')) document.getElementById('playingTitle').innerText = title + " - Chapter " + params.get('ep');

    const mangaView = document.getElementById('mangaView');
    mangaView.innerHTML = "<p style='color:white; text-align:center; padding:50px;'>Loading high-quality pages...</p>";

    try {
        const res = await fetch(`/api/search?chapterId=${encodeURIComponent(currentChapterId)}`);
        const data = await res.json();
        readerImages = data.images; 
        renderReader();
    } catch (err) { mangaView.innerHTML = `<p style='color:red; text-align:center;'>Error loading images.</p>`; }

    if (currentMangaId && currentMangaId !== "null") {
        try {
            const chapRes = await fetch(`/api/search?mangaId=${encodeURIComponent(currentMangaId)}`);
            const chapData = await chapRes.json();
            chapterListCache = chapData.chapters.sort((a, b) => a.chap - b.chap);
            updateHUDNavigation();
        } catch (e) { console.error("Could not load chapter list"); }
    }
}

function renderReader() {
    const mangaView = document.getElementById('mangaView');
    mangaView.innerHTML = ""; 
    const zoneLeft = document.getElementById('zone-prev');
    const zoneRight = document.getElementById('zone-next');

    if (currentReadMode === 'webtoon') {
        if(zoneLeft) zoneLeft.style.display = 'none';
        if(zoneRight) zoneRight.style.display = 'none';
        mangaView.style.display = 'block';

        readerImages.forEach(imgUrl => {
            const img = document.createElement('img');
            img.src = `/api/search?proxyImage=${encodeURIComponent(imgUrl)}`; 
            img.style.cssText = "width:100%; max-width:900px; display:block; margin:0 auto 5px; background:var(--bg-panel);";
            img.loading = "lazy";
            mangaView.appendChild(img);
        });
    } else if (currentReadMode === 'single') {
        if(zoneLeft) zoneLeft.style.display = 'block';
        if(zoneRight) zoneRight.style.display = 'block';
        mangaView.style.display = 'flex';
        mangaView.style.justifyContent = 'center';
        mangaView.style.minHeight = '80vh';

        const img = document.createElement('img');
        img.src = `/api/search?proxyImage=${encodeURIComponent(readerImages[currentSinglePage])}`; 
        img.style.cssText = "max-width:100%; max-height:95vh; object-fit:contain; z-index: 950; position:relative;";
        
        const counter = document.createElement('div');
        counter.innerText = `${currentSinglePage + 1} / ${readerImages.length}`;
        counter.style.cssText = "position:fixed; top:20px; right:20px; background:rgba(0,0,0,0.8); color:white; padding:5px 15px; border-radius:20px; z-index:1000;";
        
        mangaView.appendChild(counter);
        mangaView.appendChild(img);
        window.scrollTo(0,0);
    }
}

function setReaderMode(mode) {
    currentReadMode = mode;
    document.getElementById('btn-webtoon').classList.toggle('active-mode', mode === 'webtoon');
    document.getElementById('btn-single').classList.toggle('active-mode', mode === 'single');
    renderReader();
}

function prevPage() { if (currentSinglePage > 0) { currentSinglePage--; renderReader(); } }
function nextPage() { 
    if (currentSinglePage < readerImages.length - 1) { currentSinglePage++; renderReader(); } 
    else { alert("End of chapter!"); }
}

function updateHUDNavigation() {
    const currentIndex = chapterListCache.findIndex(c => c.id === currentChapterId);
    const btnPrev = document.getElementById('btn-prev-chap');
    const btnNext = document.getElementById('btn-next-chap');
    
    if(btnPrev) btnPrev.disabled = currentIndex <= 0;
    if(btnNext) btnNext.disabled = currentIndex === -1 || currentIndex >= chapterListCache.length - 1;
}

function changeChapter(direction) {
    const currentIndex = chapterListCache.findIndex(c => c.id === currentChapterId);
    if (currentIndex === -1) return;
    
    const targetChapter = chapterListCache[currentIndex + direction];
    if (targetChapter) {
        const title = decodeURIComponent(new URLSearchParams(window.location.search).get('title'));
        window.location.href = `watch.html?chapterId=${encodeURIComponent(targetChapter.id)}&mangaId=${encodeURIComponent(currentMangaId)}&title=${encodeURIComponent(title)}&ep=${targetChapter.chap}`;
    }
}

// --- INIT APP ---
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if we were redirected here from a Details Page Search!
    if (urlParams.get('search') && document.getElementById('home-view')) {
        document.getElementById('userSearch').value = urlParams.get('search');
        searchAnimeAPI();
    } else if (urlParams.get('view') === 'wishlist' && document.getElementById('home-view')) {
        // Automatically open wishlist if returning from details page
        setTimeout(showProfile, 500); 
    } else if (document.getElementById('recentGrid')) {
        fetchSection('a', 'recentGrid', 'Recently Added'); 
        fetchSection('one piece', 'topRatedGrid', 'Top Rated Masterpieces');
        fetchSection('action', 'recommendedGrid', 'Recommended For You');
    }

    if (document.getElementById('det-title') || window.location.pathname.includes('details.html')) loadDetails();
    if (new URLSearchParams(window.location.search).get('chapterId')) loadMangaReader();
};
