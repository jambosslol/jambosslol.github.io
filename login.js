const auth = firebase.auth();
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const actionButton = document.getElementById('action-button');

let emailExists = false;

// This function runs when the user clicks a "Check Email" button
async function checkEmail() {
    const email = emailInput.value;
    try {
        // This is the Firebase function to check if an account exists
        const methods = await auth.fetchSignInMethodsForEmail(email);

        if (methods.length > 0) {
            // Email exists, prompt for login
            emailExists = true;
            passwordInput.classList.remove('hidden');
            actionButton.textContent = 'Log In';
        } else {
            // Email does not exist, prompt for signup
            emailExists = false;
            passwordInput.classList.remove('hidden');
            actionButton.textContent = 'Create Account';
        }
    } catch (error) {
        console.error("Error checking email:", error);
    }
}

// This function runs when the user clicks the "Log In" or "Create Account" button
async function handleAuthAction() {
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
        if (emailExists) {
            // Log the user in
            await auth.signInWithEmailAndPassword(email, password);
            console.log("Successfully logged in!");
        } else {
            // Create a new account
            await auth.createUserWithEmailAndPassword(email, password);
            console.log("Successfully created account!");
        }
        // On success, redirect back to the game
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Authentication failed:", error.message);
        alert("Error: " + error.message);
    }
}