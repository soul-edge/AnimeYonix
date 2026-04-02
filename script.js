// Toggle Function
function toggleLogin() {
    const modal = document.getElementById('loginModal');
    modal.classList.toggle('show');
}

// Login Logic
async function handleLogin() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    if(!email || !pass) return alert("Fill all fields");

    try {
        await window.signIn(window.auth, email, pass);
        toggleLogin();
    } catch (err) { alert(err.message); }
}

// Sign Up Logic
async function handleSignUp() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    if(pass.length < 6) return alert("Password too short!");

    try {
        await window.signUp(window.auth, email, pass);
        alert("Welcome to AnimeYonix!");
        toggleLogin();
    } catch (err) { alert(err.message); }
}
