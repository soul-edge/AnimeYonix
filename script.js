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
async function handleLogin() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    const btn = document.querySelector('.submit-btn');

    if(!email || !pass) {
        alert("Please enter both email and password.");
        return;
    }

    btn.innerHTML = "Connecting...";
    btn.disabled = true;

    try {
        // Use the bridge we built in index.html
        await window.signIn(window.auth, email, pass);
        toggleLogin(); // Close modal on success
    } catch (error) {
        alert("Login Error: " + error.message);
    } finally {
        btn.innerHTML = "Login";
        btn.disabled = false;
    }
}

// Ensure toggleLogin exists in your script.js
function toggleLogin() {
    const modal = document.getElementById('loginModal');
    modal.style.display = (modal.style.display === 'block') ? 'none' : 'block';
}
