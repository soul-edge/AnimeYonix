function toggleLogin() {
    const modal = document.getElementById('loginModal');
    // This toggles the 'show' class we made in CSS
    modal.classList.toggle('show');
}

async function handleLogin() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    try {
        await window.signIn(window.auth, email, pass);
        toggleLogin();
    } catch (e) { alert(e.message); }
}

async function handleSignUp() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    try {
        await window.signUp(window.auth, email, pass);
        toggleLogin();
    } catch (e) { alert(e.message); }
}
