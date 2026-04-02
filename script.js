const modal = document.getElementById('videoModal');
const video = document.getElementById('mainVideo');

function openPlayer() {
    modal.style.display = 'block';
    video.play();
}

function closePlayer() {
    modal.style.display = 'none';
    video.pause();
}

// Close if clicking outside the video
window.onclick = function(event) {
    if (event.target == modal) {
        closePlayer();
    }
}
