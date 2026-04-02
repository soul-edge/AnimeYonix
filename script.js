function toggleLogin() {
    const modal = document.getElementById('loginModal');
    if (modal.style.display === "flex") {
        modal.style.display = "none";
    } else {
        modal.style.display = "flex";
    }
}

async function handleLogin() {
    const email = document.getElementById('userEmail').value;
    const pass = document.getElementById('userPass').value;
    try {
        await window.signIn(window.auth, email, pass);
        toggleLogin();
    } catch (error) {
        alert(error.message);
    }
}
