// Search Engine
function searchAnime() {
    let input = document.getElementById('searchInput').value.toLowerCase();
    let cards = document.getElementsByClassName('anime-card');

    for (let card of cards) {
        let title = card.getAttribute('data-title').toLowerCase();
        card.style.display = title.includes(input) ? "block" : "none";
    }
}

// Global Player
function openPlayer(videoSrc, subSrc) {
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('mainVideo');
    const track = video.querySelector('track');

    if(videoSrc) video.src = videoSrc;
    if(subSrc) track.src = subSrc;

    modal.style.display = 'block';
    video.play();
}

function closePlayer() {
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('mainVideo');
    modal.style.display = 'none';
    video.pause();
}

// Login Toggle
function toggleLogin() {
    const loginModal = document.getElementById('loginModal');
    loginModal.style.display = (loginModal.style.display === 'block') ? 'none' : 'block';
}

// Close on outside click
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closePlayer();
        document.getElementById('loginModal').style.display = 'none';
    }
}
// Database of your anime for the search to look through
const animeDatabase = [
    { title: "Solo Leveling", slug: "solo-leveling", img: "./solo.jpg", year: "2024" },
    { title: "Dragon Ball", slug: "dragon-ball", img: "./db.jpg", year: "1986" },
    { title: "Lies of P", slug: "lies-of-p", img: "./liesofp.jpg", year: "2024" }
];

function searchAnime() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const dropdown = document.getElementById('searchResults');
    
    if (input.length === 0) {
        dropdown.style.display = "none";
        return;
    }

    // Filter the database
    const results = animeDatabase.filter(anime => 
        anime.title.toLowerCase().includes(input)
    );

    if (results.length > 0) {
        dropdown.style.display = "block";
        dropdown.innerHTML = results.map(anime => `
            <a href="player.html?anime=${anime.slug}" class="search-result-item">
                <img src="${anime.img}" alt="${anime.title}">
                <div class="search-result-info">
                    <h4>${anime.title}</h4>
                    <span>${anime.year} • TV</span>
                </div>
            </a>
        `).join('') + '<div style="padding: 10px; text-align: center; background: var(--primary); color: black; font-weight: bold; font-size: 0.8rem;">View all results</div>';
    } else {
        dropdown.innerHTML = '<div style="padding: 20px; color: grey; text-align: center;">No results found</div>';
        dropdown.style.display = "block";
    }
}

// Close dropdown if user clicks outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-box')) {
        document.getElementById('searchResults').style.display = "none";
    }
});
