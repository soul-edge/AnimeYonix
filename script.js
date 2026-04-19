// --- 1. ADMIN LOGIC ---
function saveEpisode() {
    try {
        const title = document.getElementById('title').value.trim();
        const genre = document.getElementById('genre').value.trim() || "Unknown";
        const synopsis = document.getElementById('synopsis').value.trim() || "No description.";
        const epNum = document.getElementById('episodeNum').value.trim();
        const thumb = document.getElementById('thumbUrl').value.trim() || 'https://images.unsplash.com/photo-1541562232579-512a21360020?q=80&w=600&auto=format&fit=crop';
        
        // Extract URL from iframe if necessary
        let rawUrl = document.getElementById('videoUrl').value.trim();
        let finalUrl = rawUrl;
        if (rawUrl.includes('src=')) {
            const match = rawUrl.match(/src="([^"]+)"/);
            if (match) finalUrl = match[1];
        }

        if(!title || !finalUrl || !epNum) {
            return alert("Error: Title, Episode #, and URL are required!");
        }

        let animeLibrary = JSON.parse(localStorage.getItem('animeLibrary')) || {};

        if (!animeLibrary[title]) {
            animeLibrary[title] = { mainThumbnail: thumb, genre: genre, synopsis: synopsis, episodes: [] };
        }

        // Prevent duplicate episodes
        if (animeLibrary[title].episodes.find(e => e.number == epNum)) {
            return alert("Episode " + epNum + " already exists for this title!");
        }

        animeLibrary[title].episodes.push({ number: epNum, link: finalUrl });
        localStorage.setItem('animeLibrary', JSON.stringify(animeLibrary));
        
        alert("Anime Published Successfully!");
        location.reload(); 
    } catch (error) {
        console.error("Save Error:", error);
        alert("An error occurred. Check the console (F12) for details.");
    }
}

function displayAdminManager() {
    const managerDiv = document.getElementById('adminManageList');
    if(!managerDiv) return;

    let animeLibrary = JSON.parse(localStorage.getItem('animeLibrary')) || {};
    managerDiv.innerHTML = "";

    for (let title in animeLibrary) {
        const item = document.createElement('div');
        item.className = 'manage-item';
        item.innerHTML = `
            <span><strong>${title}</strong> (${animeLibrary[title].episodes.length} Eps)</span>
            <button class="delete-btn">Delete</button>
        `;
        item.querySelector('.delete-btn').addEventListener('click', () => deleteAnime(title));
        managerDiv.appendChild(item);
    }
}

function deleteAnime(title) {
    if(confirm("Delete " + title + " permanently?")) {
        let animeLibrary = JSON.parse(localStorage.getItem('animeLibrary')) || {};
        delete animeLibrary[title];
        localStorage.setItem('animeLibrary', JSON.stringify(animeLibrary));
        displayAdminManager();
    }
}

// --- 2. HOMEPAGE LOGIC ---
function displayEpisodes() {
    const grid = document.getElementById('episodeGrid');
    if(!grid) return;

    let animeLibrary = JSON.parse(localStorage.getItem('animeLibrary')) || {};
    grid.innerHTML = ""; 

    for (let title in animeLibrary) {
        const anime = animeLibrary[title];
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="thumbnail" style="background-image: url('${anime.mainThumbnail}');"></div>
            <div class="info">
                <h3>${title}</h3>
                <button class="btn" id="btn-${title.replace(/\s+/g, '-')}">Details</button>
            </div>
        `;
        grid.appendChild(card);
        
        // Secure event listener for Details button
        document.getElementById(`btn-${title.replace(/\s+/g, '-')}`).addEventListener('click', () => {
            window.location.href = `details.html?title=${encodeURIComponent(title)}`;
        });
    }
}

// --- 3. DETAILS PAGE LOGIC ---
function loadDetails() {
    const params = new URLSearchParams(window.location.search);
    const title = decodeURIComponent(params.get('title'));
    const library = JSON.parse(localStorage.getItem('animeLibrary')) || {};
    const anime = library[title];

    if(anime) {
        document.getElementById('det-title').innerText = title;
        document.getElementById('det-genre').innerText = "GENRE: " + anime.genre;
        document.getElementById('det-syn').innerText = anime.synopsis;
        document.getElementById('det-thumb').src = anime.mainThumbnail;

        const epList = document.getElementById('ep-list');
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

// --- 4. WATCH PAGE LOGIC ---
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

// --- 5. INITIALIZATION ROUTER ---
window.onload = function() {
    if (document.getElementById('episodeGrid')) displayEpisodes();
    if (document.getElementById('adminManageList')) displayAdminManager();
    if (document.getElementById('det-title')) loadDetails();
    if (document.getElementById('mainPlayer')) loadVideo();
};
