// Sample Data for the search dropdown
const animeList = [
    { name: "Dragon Ball Z", img: "db.jpg", url: "db-episodes.html" },
    { name: "Solo Leveling", img: "solo.jpg", url: "solo-episodes.html" },
    { name: "One Piece", img: "op.jpg", url: "#" }
];

const searchInput = document.getElementById('searchInput');
const dropdown = document.getElementById('searchDropdown');

searchInput.addEventListener('input', (e) => {
    const value = e.target.value.toLowerCase();
    dropdown.innerHTML = "";
    
    if (value.length > 0) {
        const filtered = animeList.filter(anime => anime.name.toLowerCase().includes(value));
        
        if (filtered.length > 0) {
            dropdown.style.display = "block";
            filtered.forEach(anime => {
                const item = document.createElement('div');
                item.className = "search-item";
                item.innerHTML = `
                    <img src="${anime.img}">
                    <div>
                        <div style="font-weight:bold;">${anime.name}</div>
                        <div style="font-size:12px; color:gray;">TV Series</div>
                    </div>
                `;
                item.onclick = () => location.href = anime.url;
                dropdown.appendChild(item);
            });
        } else {
            dropdown.style.display = "none";
        }
    } else {
        dropdown.style.display = "none";
    }
});

// Close dropdown when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-wrapper')) {
        dropdown.style.display = "none";
    }
});
