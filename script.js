// Database of your anime for the search to look through
const animeDatabase = [
    { title: "Solo Leveling", slug: "solo-leveling", img: "./solo.jpg", year: "2024" },
    { title: "Dragon Ball", slug: "dragon-ball", img: "./db.jpg", year: "1986" },
];

// Professional Dropdown Search
function searchAnime() {
    const input = document.getElementById('searchInput').value.toLowerCase();
    const dropdown = document.getElementById('searchResults');
    
    // If search is empty, hide the dropdown
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

// Login Toggle
function toggleLogin() {
    const loginModal = document.getElementById('loginModal');
    loginModal.style.display = (loginModal.style.display === 'block') ? 'none' : 'block';
}

// Close modals or dropdowns if user clicks outside
window.onclick = function(event) {
    // Close dropdown
    if (!event.target.closest('.search-box')) {
        const dropdown = document.getElementById('searchResults');
        if (dropdown) dropdown.style.display = "none";
    }
    
    // Close Login Modal
    if (event.target.classList.contains('modal')) {
        document.getElementById('loginModal').style.display = 'none';
    }
}
