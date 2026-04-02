const animeData = [
    {
        id: "hxh-1",
        title: "Hunter x Hunter (2011)",
        thumbnail: "https://m.media-amazon.com/images/M/MV5BNGMwNzY3MzYtMDE0ZS00NWVmLWExYmQtMzQ0NzQ5MTcwN2EwXkEyXkFqcGdeQXVyNjAwNDUxODI@._V1_.jpg",
        // PASTE YOUR 127.0.0.1 LINK HERE
        videoUrl: "http://127.0.0.1:11470/1/...", 
        subsUrl: "subs/hxh_ep1.vtt" // Path to your local .vtt file
    }
];

const grid = document.getElementById('animeGrid');
const modal = document.getElementById('videoModal');
const player = document.getElementById('mainPlayer');
const subsTrack = document.getElementById('playerSubs');
const epBar = document.getElementById('episodeBar');

function displayAnime(list) {
    grid.innerHTML = '';
    list.forEach(anime => {
        const card = document.createElement('div');
        card.className = 'anime-card';
        card.innerHTML = `
            <img src="${anime.thumbnail}">
            <p>${anime.title}</p>
        `;
        card.onclick = () => openPlayer(anime);
        grid.appendChild(card);
    });
}

function openPlayer(anime) {
    player.src = anime.videoUrl;
    subsTrack.src = anime.subsUrl;
    modal.style.display = "block";
    
    // Create the episode button
    epBar.innerHTML = `<button class="ep-btn active">Episode 1</button>`;
    
    player.play();
}

document.querySelector('.close-modal').onclick = () => {
    modal.style.display = "none";
    player.pause();
    player.src = "";
};

// Initial Load
displayAnime(animeData);