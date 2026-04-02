<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AnimeYonix | Stream Your Favorite Anime</title>
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">

    <script type="module">
      import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
      import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

      const firebaseConfig = {
        apiKey: "AIzaSyCVwL4UNX2o564IrcQJ9WZGNwkcxiyNArg",
        authDomain: "animeyonix-827c9.firebaseapp.com",
        projectId: "animeyonix-827c9",
        storageBucket: "animeyonix-827c9.firebasestorage.app",
        messagingSenderId: "225022514016",
        appId: "1:225022514016:web:7f39820371c719ae3a0405",
        measurementId: "G-M4ZVBW393M"
      };

      const app = initializeApp(firebaseConfig);
      const auth = getAuth(app);

      // Sharing functions with script.js
      window.auth = auth;
      window.signIn = signInWithEmailAndPassword;
      window.signUp = createUserWithEmailAndPassword;
      window.signOutUser = signOut;

      onAuthStateChanged(auth, (user) => {
          const loginBtn = document.querySelector('.login-btn');
          if (user) {
              loginBtn.innerHTML = `<i class="fas fa-user"></i> ${user.email.split('@')[0].toUpperCase()}`;
              loginBtn.style.background = "#28a745";
              loginBtn.onclick = () => { if(confirm("Logout?")) window.signOutUser(window.auth); };
          } else {
              loginBtn.innerHTML = "Login";
              loginBtn.style.background = "#00d2ff";
              loginBtn.onclick = () => toggleLogin();
          }
      });
    </script>
</head>
<body>

    <nav class="navbar">
        <div class="nav-container">
            <div class="logo">ANIME<span>YONIX</span></div>
            <ul class="nav-links">
                <li><a href="#" class="active">Home</a></li>
                <li><a href="#">Latest</a></li>
                <li><a href="#">Genres</a></li>
                <li><a href="#">Schedule</a></li>
            </ul>
            <div class="nav-actions">
                <div class="search-box">
                    <input type="text" id="searchInput" placeholder="Search anime..." onkeyup="searchAnime()">
                    <i class="fas fa-search"></i>
                </div>
                <button class="login-btn">Login</button>
            </div>
        </div>
    </nav>

    <header class="hero">
        <div class="hero-content">
            <span class="trending-tag">#1 Trending</span>
            <h1>Welcome to AnimeYonix</h1>
            <p>Experience high-quality anime streaming with custom subtitles and lightning-fast speeds.</p>
            <div class="hero-btns">
                <button class="play-btn"><i class="fas fa-play"></i> Start Watching</button>
                <button class="info-btn"><i class="fas fa-plus"></i> Add to List</button>
            </div>
        </div>
    </header>

    <main class="container">
        <h2 class="section-title">Popular Series</h2>
        <div class="anime-grid" id="animeGrid">
            <div class="anime-card" data-title="New Anime">
                <div class="card-img">
                    <img src="placeholder.jpg" alt="Poster">
                    <div class="overlay" onclick="openPlayer()">
                        <i class="fas fa-play-circle"></i>
                    </div>
                </div>
                <div class="card-info">
                    <h3>Anime Title</h3>
                    <span>2026 • Series</span>
                </div>
            </div>
        </div>
    </main>

    <div id="loginModal" class="modal">
        <div class="login-card">
            <h2>AnimeYonix Access</h2>
            <input type="email" id="userEmail" placeholder="Email Address">
            <input type="password" id="userPass" placeholder="Password (min 6 chars)">
            
            <div class="auth-buttons">
                <button class="submit-btn" onclick="handleLogin()">Login</button>
                <button class="signup-btn" onclick="handleSignUp()">Create Account</button>
            </div>
            <p class="cancel-link" onclick="toggleLogin()">Cancel</p>
        </div>
    </div>

    <div id="videoModal" class="modal">
        <div class="modal-content">
            <span class="close-modal" onclick="closePlayer()">&times;</span>
            <div class="video-wrapper">
                <video id="mainVideo" controls crossorigin="anonymous">
                    <source src="" type="video/mp4">
                </video>
            </div>
        </div>
    </div>

    <script src="script.js"></script>
</body>
</html>
