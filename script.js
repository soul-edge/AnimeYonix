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

// --- AUTH LOGIC ---
function login() {
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(err => alert("Login failed: " + err.message));
}
function logout() { firebase.auth().signOut().then(() => { window.location.href = 'index.html'; }); }

function showProfile() {
    if(!document.getElementById('home-view')) return; 
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('profile-view').style.display = 'block';
    document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
    document.getElementById('nav-profile').classList.add('active');
    
    if(document.querySelector('.sidebar')) document.querySelector('.sidebar').classList.remove('mobile-active');
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
                if(document.getElementById('home-view')) navProfile.onclick = (e) => { e.preventDefault(); showProfile(); };
            }
            
            const params = new URLSearchParams(window.location.search);
            if (params.get('id')) checkWishlistStatus(params.get('id'));
            if (params.get('mangaId') && document.getElementById('wishlist-btn')) checkWishlistStatus(params.get('mangaId'));

        } else {
            currentUserUID = null;
            if(navLogin) navLogin.style.display = 'flex';
            if(navLogout) navLogout.style.display = 'none';
            if(navProfile) navProfile.style.display = 'none';
        }
    });
}

// --- BULLETPROOF WISHLIST ENGINE ---
async function toggleWishlist(mangaId, title, thumb) {
    if (!currentUserUID) return alert("You must be logged in to save to your Wishlist!");
    try {
        const safeDocId = mangaId.replace(/[^a-zA-Z0-9]/g, '_');
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
    } catch (error) { alert("Wishlist Error: " + error.message); }
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
    try {
        const safeDocId = mangaId.replace(/[^a-zA-Z0-9]/g, '_');
        const doc = await db.collection('users').doc(currentUserUID).collection('wishlist').doc(safeDocId).get();
        const btn = document.getElementById('wishlist-btn');
        if (doc.exists && btn) {
            btn.innerHTML = '<i class="fas fa-bookmark"></i>';
            if (btn.innerText.includes('Add')) btn.innerHTML = '<i class="fas fa-bookmark"></i> Saved to Wishlist';
        }
    } catch(e) { console.error(e); }
}

// --- HOMEPAGE (LIVE SYNC) & SEARCH ---
function scrollCarousel(id, amount) { document.getElementById(id).scrollBy({ left: amount, behavior: 'smooth' }); }

// NEW: Fetches the live data from your Vercel backend!
async function loadLiveHomepage() {
    const recentGrid = document.getElementById('recentGrid');
    if (!recentGrid) return;
    
    recentGrid.innerHTML = "<p style='color: var(--accent); padding-left: 20px;'>Syncing live database...</p>";
    document.getElementById('topRatedGrid').innerHTML = "<p style='color: gray; padding-left: 20px;'>Loading...</p>";
    document.getElementById('recommendedGrid').innerHTML = "<p style='color: gray; padding-left: 20px;'>Loading...</p>";
    
    try {
        const response = await fetch('/api/search?live=true');
        const liveData = await response.json();
        
        renderGrid(liveData.recent, "Recently Added (Live)", "recentGrid");
        renderGrid(liveData.trending, "Top Trending Right Now", "topRatedGrid");
        renderGrid(liveData.recommended, "MangaYonix Recommendations", "recommendedGrid");
        
    } catch (err) {
        console.error("Live fetch failed", err);
        recentGrid.innerHTML = `<p style='color: red;'>Failed to connect to live server. Try refreshing.</p>`;
    }
}

async function searchAnimeAPI() { 
    const searchInput = document.getElementById('userSearch');
    if (!searchInput) return;
    const query = searchInput.value;
    
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
        
        card.innerHTML = `<div class="thumbnail-wrapper"><div class="thumbnail" style="background-image: url('${safeImageUrl}');"></div></div><div class="info"><h3 class="manga-title" title="${manga.title}">${manga.title}</h3></div>`;
        card.onclick = () => { window.location.href = `details.html?id=${encodeURIComponent(manga.id)}&title=${encodeURIComponent(manga.title)}&thumb=${encodeURIComponent(safeImageUrl)}`; };
        grid.appendChild(card);
    });
}

// --- DETAILS PAGE ---
async function loadDetails() {
    const params = new URLSearchParams(window.location.search);
    const mangaId = params.get('id');
    const title = params.get('title');
    const thumb = params.get('thumb');
    
    if(!mangaId || mangaId === "null") {
        if (document.getElementById('det-title')) document.getElementById('det-title').innerText = "Error: Manga Not Found";
        return;
    }

    if (document.getElementById('det-title')) document.getElementById('det-title').innerText = title;
    if (document.getElementById('det-thumb')) document.getElementById('det-thumb').src = thumb;

    const infoCol = document.querySelector('.det-info');
    if (infoCol && !document.getElementById('wishlist-btn')) {
        const wBtn = document.createElement('button');
        wBtn.id = "wishlist-btn"; wBtn.className = "btn"; wBtn.innerHTML = '<i class="far fa-bookmark"></i> Add to Wishlist';
        wBtn.style.marginTop = "15px";
        wBtn.onclick = () => toggleWishlist(mangaId, title, thumb);
        infoCol.appendChild(wBtn);
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
    } catch (err) { epList.innerHTML = `<p style='color: red;'>Error loading chapters.</p>`; }
}


// ==========================================
// THE NATIVE APP READER STATE MACHINE
// ==========================================
let readerImages = [];
let currentReadMode = 'single'; 
let currentSinglePage = 0;
let chapterListCache = [];
let currentChapterId = "";
let currentMangaId = "";

// Touch Swap Variables
let touchstartX = 0;
let touchendX = 0;

async function loadMangaReader() {
    const params = new URLSearchParams(window.location.search);
    currentChapterId = params.get('chapterId');
    currentMangaId = params.get('mangaId');
    const title = params.get('title');
    const ep = params.get('ep');
    
    if (!currentChapterId) { window.location.href = 'index.html'; return; }
    
    if (document.getElementById('playingTitle')) {
        document.getElementById('playingTitle').innerText = title;
        document.getElementById('playingEp').innerText = "Chapter " + ep;
    }

    const mangaView = document.getElementById('mangaView');
    mangaView.innerHTML = "<p style='color:white; text-align:center; padding:50px;'>Loading high-quality pages...</p>";

    // Initialize Swipe Listener for Mobile
    mangaView.addEventListener('touchstart', e => { touchstartX = e.changedTouches[0].screenX; }, {passive: true});
    mangaView.addEventListener('touchend', e => {
        touchendX = e.changedTouches[0].screenX;
        if (currentReadMode === 'single') {
            if (touchendX < touchstartX - 50) nextPage(); // Swipe Left
            if (touchendX > touchstartX + 50) prevPage(); // Swipe Right
        }
    }, {passive: true});

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

    if (currentReadMode === 'webtoon') {
        document.getElementById('pageSlider').disabled = true;
        readerImages.forEach(imgUrl => {
            const img = document.createElement('img');
            img.src = `/api/search?proxyImage=${encodeURIComponent(imgUrl)}`; 
            img.style.cssText = "width:100%; max-width:900px; display:block; margin:0 auto; background:#000;";
            img.loading = "lazy";
            img.onclick = toggleReaderUI; // Tap to hide toolbars
            mangaView.appendChild(img);
        });
    } else if (currentReadMode === 'single') {
        document.getElementById('pageSlider').disabled = false;
        
        const img = document.createElement('img');
        img.src = `/api/search?proxyImage=${encodeURIComponent(readerImages[currentSinglePage])}`; 
        img.style.cssText = "width:100%; height:100vh; object-fit:contain; background:#000;";
        
        // --- SMART CLICK ZONES FOR PC & MOBILE ---
        img.onclick = (e) => {
            const screenWidth = window.innerWidth;
            const clickX = e.clientX;
            
            if (clickX < screenWidth * 0.3) {
                prevPage(); 
            } else if (clickX > screenWidth * 0.7) {
                nextPage(); 
            } else {
                toggleReaderUI(); 
            }
        };
        
        mangaView.appendChild(img);
        updateSlider();
        window.scrollTo(0,0);
    }
}

// --- DESKTOP KEYBOARD CONTROLS ---
document.addEventListener('keydown', (e) => {
    if (!document.getElementById('mangaView') || currentReadMode !== 'single') return;
    
    if (e.key === 'ArrowRight' || e.key === 'd') nextPage();
    if (e.key === 'ArrowLeft' || e.key === 'a') prevPage();
    if (e.key === ' ') { 
        e.preventDefault(); 
        toggleReaderUI(); // Spacebar toggles UI
    }
});

function updateSlider() {
    const slider = document.getElementById('pageSlider');
    if (slider) {
        slider.max = readerImages.length - 1;
        slider.value = currentSinglePage;
        document.getElementById('page-current').innerText = currentSinglePage + 1;
        document.getElementById('page-max').innerText = readerImages.length;
    }
}

function jumpToPage(val) {
    currentSinglePage = parseInt(val);
    renderReader();
}

function setReaderMode(mode) {
    currentReadMode = mode;
    document.getElementById('btn-webtoon').classList.toggle('active-mode', mode === 'webtoon');
    document.getElementById('btn-single').classList.toggle('active-mode', mode === 'single');
    renderReader();
}

function toggleReaderUI() { document.body.classList.toggle('ui-hidden'); }
function prevPage() { if (currentSinglePage > 0) { currentSinglePage--; renderReader(); } }
function nextPage() { 
    if (currentSinglePage < readerImages.length - 1) { currentSinglePage++; renderReader(); } 
    else { alert("End of chapter!"); }
}

function updateHUDNavigation() {
    const currentIndex = chapterListCache.findIndex(c => c.id === currentChapterId);
    const btnPrev = document.getElementById('btn-prev-chap');
    const btnNext = document.getElementById('btn-next-chap');
    if(btnPrev) btnPrev.style.opacity = currentIndex <= 0 ? '0.3' : '1';
    if(btnNext) btnNext.style.opacity = (currentIndex === -1 || currentIndex >= chapterListCache.length - 1) ? '0.3' : '1';
}

function changeChapter(direction) {
    const currentIndex = chapterListCache.findIndex(c => c.id === currentChapterId);
    if (currentIndex === -1) return;
    const targetChapter = chapterListCache[currentIndex + direction];
    if (targetChapter) {
        const title = new URLSearchParams(window.location.search).get('title');
        window.location.href = `watch.html?chapterId=${encodeURIComponent(targetChapter.id)}&mangaId=${encodeURIComponent(currentMangaId)}&title=${encodeURIComponent(title)}&ep=${targetChapter.chap}`;
    }
}

function toggleReaderWishlist() {
    const title = new URLSearchParams(window.location.search).get('title');
    toggleWishlist(currentMangaId, title, "");
}

// --- INIT APP ---
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('search') && document.getElementById('home-view')) {
        document.getElementById('userSearch').value = urlParams.get('search');
        searchAnimeAPI();
    } else if (urlParams.get('view') === 'wishlist' && document.getElementById('home-view')) {
        setTimeout(showProfile, 500); 
    } else if (document.getElementById('recentGrid')) {
        // Trigger the Live Synchronized Fetcher
        loadLiveHomepage();
    }

    if (document.getElementById('det-title') || window.location.pathname.includes('details.html')) loadDetails();
    if (new URLSearchParams(window.location.search).get('chapterId')) loadMangaReader();
};
