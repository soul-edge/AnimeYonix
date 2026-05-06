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

// --- AUTH & PROFILE ---
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
        } else {
            currentUserUID = null;
            if(navLogin) navLogin.style.display = 'flex';
            if(navLogout) navLogout.style.display = 'none';
            if(navProfile) navProfile.style.display = 'none';
        }
    });
}

// --- WISHLIST ENGINE ---
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
        } else {
            await docRef.set({ id: mangaId, title: title, thumbnail: thumb, addedAt: new Date() });
            if(btn) btn.innerHTML = '<i class="fas fa-bookmark"></i> Saved to Wishlist';
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
        if (doc.exists && btn) btn.innerHTML = '<i class="fas fa-bookmark"></i> Saved to Wishlist';
    } catch(e) { console.error(e); }
}

// --- HOMEPAGE LOADER ---
function scrollCarousel(id, amount) { document.getElementById(id).scrollBy({ left: amount, behavior: 'smooth' }); }

async function loadLiveHomepage() {
    const recentGrid = document.getElementById('recentGrid');
    const topRatedGrid = document.getElementById('topRatedGrid');
    const historyGrid = document.getElementById('historyGrid');
    const historySection = document.getElementById('history-section');
    
    // 1. CONTINUE READING (Read History)
    const history = JSON.parse(localStorage.getItem('mangaHistory') || '[]');
    if (history.length > 0 && historyGrid && historySection) {
        historySection.style.display = 'block';
        renderGrid(history, "Continue Reading", "historyGrid");
    } else if (historySection) {
        historySection.style.display = 'none';
    }
    
    // 2. RECENTLY UPDATED (Live from API instead of Firebase)
    if (recentGrid) recentGrid.innerHTML = "<p style='color: var(--accent); padding-left: 20px;'>Loading latest chapters...</p>";
    try {
        const response = await fetch('/api/search?q=recent');
        const recentData = await response.json();
        renderGrid(recentData, "Recently Updated", "recentGrid");
    } catch (err) { if (recentGrid) recentGrid.innerHTML = `<p style='color: red;'>Failed to load recent updates.</p>`; }

    // 3. TOP RATED MASTERPIECES (Live API Search)
    if (topRatedGrid) topRatedGrid.innerHTML = "<p style='color: gray; padding-left: 20px;'>Loading Masterpieces...</p>";
    try {
        const response = await fetch('/api/search?q=trending');
        const trendingData = await response.json();
        renderGrid(trendingData, "Top Rated Masterpieces", "topRatedGrid");
    } catch (err) { if (topRatedGrid) topRatedGrid.innerHTML = `<p style='color: red;'>Failed to load popular manga.</p>`; }
}

function renderGrid(mangaArray, sectionTitle, targetID) {
    const grid = document.getElementById(targetID);
    if(!grid) return;
    grid.innerHTML = ""; 
    if (!mangaArray || mangaArray.length === 0) return grid.innerHTML = "<p style='color: gray; padding-left: 20px;'>No manga found.</p>";

    mangaArray.forEach(manga => {
        const card = document.createElement('div');
        card.className = 'card';
        const safeImageUrl = manga.thumbnail.includes('/api/search') ? manga.thumbnail : `/api/search?proxyImage=${encodeURIComponent(manga.thumbnail)}`;
        card.innerHTML = `<div class="thumbnail-wrapper"><div class="thumbnail" style="background-image: url('${safeImageUrl}');"></div></div><div class="info"><h3 class="manga-title" title="${manga.title}">${manga.title}</h3></div>`;
        card.onclick = () => { window.location.href = `details.html?id=${encodeURIComponent(manga.id)}&title=${encodeURIComponent(manga.title)}&thumb=${encodeURIComponent(safeImageUrl)}`; };
        grid.appendChild(card);
    });
}

// --- SEARCH ENGINE ---
async function searchAnimeAPI() { 
    const searchInput = document.getElementById('userSearch');
    if (!searchInput || searchInput.value.trim() === "") return;
    const query = searchInput.value;
    
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/' && !window.location.pathname.includes('vercel.app')) {
        window.location.href = `index.html?search=${encodeURIComponent(query)}`;
        return;
    }
    
    document.getElementById('home-view').innerHTML = `<section class="content-section"><h2>Search Results</h2><div id="searchGrid" class="grid-container"><p style='color: lightgray;'>Searching database...</p></div></section>`;
    try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const results = await response.json();
        renderGrid(results, "Search Results", "searchGrid");
    } catch (error) { document.getElementById('searchGrid').innerHTML = `<p style='color: #ff4757;'>No manga found.</p>`; }
}

// --- DETAILS PAGE ---
async function loadDetails() {
    const params = new URLSearchParams(window.location.search);
    const mangaId = params.get('id');
    const title = params.get('title');
    const thumb = params.get('thumb');
    
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
                btn.onclick = () => { window.location.href = `watch.html?chapterId=${encodeURIComponent(chapter.id)}&mangaId=${encodeURIComponent(mangaId)}&title=${encodeURIComponent(title)}&ep=${chapter.chap}&thumb=${encodeURIComponent(thumb)}`; };
                epList.appendChild(btn);
            });
        }
    } catch (err) { epList.innerHTML = `<p style='color: red;'>Error loading chapters.</p>`; }
}

// --- READER LOGIC ---
let readerImages = [];
let currentReadMode = 'single'; 
let currentSinglePage = 0;
let chapterListCache = [];
let currentChapterId = "";
let currentMangaId = "";

async function loadMangaReader() {
    const params = new URLSearchParams(window.location.search);
    currentChapterId = params.get('chapterId');
    currentMangaId = params.get('mangaId');
    const title = params.get('title');
    const ep = params.get('ep');
    const thumb = params.get('thumb') || "";
    
    if (!currentChapterId) { window.location.href = 'index.html'; return; }

    if (document.getElementById('playingTitle')) {
        document.getElementById('playingTitle').innerText = title;
        document.getElementById('playingEp').innerText = "Chapter " + ep;
    }

    // --- READ HISTORY ENGINE ---
    if (currentMangaId && title) {
        let history = JSON.parse(localStorage.getItem('mangaHistory') || '[]');
        const currentMangaData = { id: currentMangaId, title: title, thumbnail: thumb, latestChapter: ep };
        history = history.filter(m => m.id !== currentMangaId);
        history.unshift(currentMangaData);
        localStorage.setItem('mangaHistory', JSON.stringify(history.slice(0, 15)));
    }

    const mangaView = document.getElementById('mangaView');
    if (mangaView) mangaView.innerHTML = "<p style='color:white; text-align:center; padding:50px;'>Loading high-quality pages...</p>";

    try {
        const res = await fetch(`/api/search?chapterId=${encodeURIComponent(currentChapterId)}`);
        const data = await res.json();
        readerImages = data.images; 
        renderReader();
    } catch (err) { if (mangaView) mangaView.innerHTML = `<p style='color:red; text-align:center;'>Error loading images.</p>`; }

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
    if (!mangaView) return;
    mangaView.innerHTML = ""; 
    if (currentReadMode === 'webtoon') {
        const slider = document.getElementById('pageSlider');
        if (slider) slider.disabled = true;
        readerImages.forEach(imgUrl => {
            const img = document.createElement('img');
            img.src = `/api/search?proxyImage=${encodeURIComponent(imgUrl)}`; 
            img.style.cssText = "width:100%; max-width:900px; display:block; margin:0 auto; background:#000;";
            img.loading = "lazy";
            img.onclick = toggleReaderUI; 
            mangaView.appendChild(img);
        });
    } else if (currentReadMode === 'single') {
        const slider = document.getElementById('pageSlider');
        if (slider) slider.disabled = false;
        const img = document.createElement('img');
        img.src = `/api/search?proxyImage=${encodeURIComponent(readerImages[currentSinglePage])}`; 
        img.style.cssText = "width:100%; height:100vh; object-fit:contain; background:#000;";
        img.onclick = (e) => {
            const clickX = e.clientX;
            if (clickX < window.innerWidth * 0.3) prevPage(); 
            else if (clickX > window.innerWidth * 0.7) nextPage(); 
            else toggleReaderUI(); 
        };
        mangaView.appendChild(img);
        updateSlider();
        window.scrollTo(0,0);
    }
}

function updateSlider() {
    const slider = document.getElementById('pageSlider');
    if (slider) {
        slider.max = readerImages.length - 1;
        slider.value = currentSinglePage;
        document.getElementById('page-current').innerText = currentSinglePage + 1;
        document.getElementById('page-max').innerText = readerImages.length;
    }
}

function jumpToPage(val) { currentSinglePage = parseInt(val); renderReader(); }
function setReaderMode(mode) {
    currentReadMode = mode;
    const btnW = document.getElementById('btn-webtoon');
    const btnS = document.getElementById('btn-single');
    if (btnW) btnW.classList.toggle('active-mode', mode === 'webtoon');
    if (btnS) btnS.classList.toggle('active-mode', mode === 'single');
    renderReader();
}
function toggleReaderUI() { document.body.classList.toggle('ui-hidden'); }
function prevPage() { if (currentSinglePage > 0) { currentSinglePage--; renderReader(); } }
function nextPage() { if (currentSinglePage < readerImages.length - 1) { currentSinglePage++; renderReader(); } }

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
        const thumb = new URLSearchParams(window.location.search).get('thumb');
        window.location.href = `watch.html?chapterId=${encodeURIComponent(targetChapter.id)}&mangaId=${encodeURIComponent(currentMangaId)}&title=${encodeURIComponent(title)}&ep=${targetChapter.chap}&thumb=${encodeURIComponent(thumb)}`;
    }
}

// --- SIDEBAR AUTO-CLOSE LOGIC ---
document.addEventListener('click', (e) => {
    const sidebar = document.querySelector('.sidebar');
    const menuBtn = document.querySelector('.menu-btn');
    if (sidebar && sidebar.classList.contains('mobile-active')) {
        if (!sidebar.contains(e.target) && (!menuBtn || !menuBtn.contains(e.target))) {
            sidebar.classList.remove('mobile-active'); 
        }
    }
});

// --- INIT APP ---
window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('search') && document.getElementById('home-view')) {
        document.getElementById('userSearch').value = urlParams.get('search');
        searchAnimeAPI();
    } else if (document.getElementById('recentGrid')) {
        loadLiveHomepage();
    }
    if (window.location.pathname.includes('details.html')) loadDetails();
    if (window.location.pathname.includes('watch.html')) loadMangaReader();
};
