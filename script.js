// Search Functionality
function searchAnime() {
    let input = document.getElementById('searchInput').value.toLowerCase();
    let cards = document.getElementsByClassName('anime-card');

    for (let i = 0; i < cards.length; i++) {
        let title = cards[i].getAttribute('data-title').toLowerCase();
        if (title.includes(input)) {
            cards[i].style.display = "";
        } else {
            cards[i].style.display = "none";
        }
    }
}

// Player Logic
function openPlayer() {
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('mainVideo');
    // For now, it stays empty until you get your Debrid link
    video.src = "https://drive.google.com/uc?export=download&id=19le1jpKcASknjXK-iTrJB45RZRvQvCc7&confirm=t";
    modal.style.display = 'block';
}

function closePlayer() {
    document.getElementById('videoModal').style.display = 'none';
    document.getElementById('mainVideo').pause();
}

// Login Toggle
function toggleLogin() {
    const loginModal = document.getElementById('loginModal');
    if (loginModal.style.display === 'block') {
        loginModal.style.display = 'none';
    } else {
        loginModal.style.display = 'block';
    }
}

// Close modals when clicking outside
window.onclick = function(event) {
    if (event.target.className === 'modal') {
        event.target.style.display = "none";
        document.getElementById('mainVideo').pause();
    }
}
