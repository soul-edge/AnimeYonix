// Search Engine (Original)
function searchAnime() {
    let input = document.getElementById('searchInput').value.toLowerCase();
    let cards = document.getElementsByClassName('anime-card');
    for (let card of cards) {
        let title = card.getAttribute('data-title').toLowerCase();
        card.style.display = title.includes(input) ? "block" : "none";
    }
}

// Global Player (Original)
function openPlayer(videoSrc, subSrc) {
    const modal = document.getElementById('videoModal');
    const video = document.getElementById('mainVideo');
    if(videoSrc) video.src = videoSrc;
    modal.style.display = 'block';
    video.play();
}

function closePlayer() {
    document.getElementById('videoModal').style.display = 'none';
    document.getElementById('mainVideo').pause();
}

// Login Toggle (Original)
function toggleLogin() {
    const loginModal = document.getElementById('loginModal');
    loginModal.style.display = (loginModal.style.display === 'block') ? 'none' : 'block';
}

// Firebase Login Trigger
async function handleLogin() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    try {
        await window.signIn(window.auth, email, pass);
        toggleLogin();
    } catch (error) {
        alert("Login failed: " + error.message);
    }
}

// Outside click to close
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        closePlayer();
        document.getElementById('loginModal').style.display = 'none';
    }
}
