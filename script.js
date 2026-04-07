// Database of our Anime
const animeData = {
    "dragonball": {
        title: "Dragon Ball",
        episodes: 70,
        image: "db.jpg",
        desc: "The legendary quest for the seven mystical orbs."
    },
    "sololeveling": {
        title: "Solo Leveling",
        episodes: 12,
        image: "solo.jpg",
        desc: "Sung Jinwoo evolves from the weakest hunter to the strongest."
    }
};

// --- SEARCH LOGIC ---
const searchInput = document.getElementById('searchInput');
const dropdown = document.getElementById('searchDropdown');

if(searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        dropdown.innerHTML = "";
        
        if (query.length > 0) {
            dropdown.style.display = "block";
            Object.keys(animeData).forEach(key => {
                const anime = animeData[key];
                if (anime.title.toLowerCase().includes(query)) {
                    const item = document.createElement('div');
                    item.className = "search-item";
                    item.innerHTML = `<img src="${anime.image}"> <div><b>${anime.title}</b><br><small>TV Series</small></div>`;
                    item.onclick = () => location.href = `episodes.html?anime=${key}`;
                    dropdown.appendChild(item);
                }
            });
        } else {
            dropdown.style.display = "none";
        }
    });
}

// --- EPISODE GENERATION LOGIC ---
function initEpisodePage() {
    const params = new URLSearchParams(window.location.search);
    const animeKey = params.get('anime');
    const data = animeData[animeKey];

    if (data) {
        document.getElementById('mainTitle').innerText = data.title;
        document.getElementById('mainDesc').innerText = data.desc;
        document.getElementById('animeHero').style.backgroundImage = `url(${data.image})`;
        
        const grid = document.getElementById('episodeList');
        for (let i = 1; i <= data.episodes; i++) {
            const btn = document.createElement('div');
            btn.className = "ep-btn";
            btn.innerText = `EP ${i}`;
            btn.onclick = () => alert(`Playing ${data.title} Episode ${i}`);
            grid.appendChild(btn);
        }
    }
}
