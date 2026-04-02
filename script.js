function toggleLogin() {
    const modal = document.getElementById('loginModal');
    modal.classList.toggle('show');
}

async function handleLogin() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    if(!email || !pass) return alert("Enter details");

    try {
        await window.signIn(window.auth, email, pass);
        toggleLogin();
    } catch (e) { alert(e.message); }
}

async function handleSignUp() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    if(pass.length < 6) return alert("Password too short");

    try {
        await window.signUp(window.auth, email, pass);
        alert("Account Created!");
        toggleLogin();
    } catch (e) { alert(e.message); }
}
