// Import the functions you'll need from the Firebase SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, fetchSignInMethodsForEmail, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// Your web app's Firebase configuration (copy from your HTML)
const firebaseConfig = {
    apiKey: "AIzaSyBNCE1U6rZ4mymmFuKCXMHEpkEYPEzx2O4",
    authDomain: "odd1out-eecdd.firebaseapp.com",
    projectId: "odd1out-eecdd",
    storageBucket: "odd1out-eecdd.firebasestorage.app",
    messagingSenderId: "1014717037898",
    appId: "1:1014717037898:web:9fecf922f4f4e343a015b3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- DOM Elements & State ---
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email-input');
const passwordGroup = document.getElementById('password-group');
const passwordInput = document.getElementById('password-input');
const actionBtn = document.getElementById('action-btn');
const errorMessage = document.getElementById('error-message');
let emailChecked = false;
let emailExists = false;

// --- Event Listener ---
authForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.textContent = '';
    if (!emailChecked) {
        await checkEmail();
    } else {
        await handleAuthAction();
    }
});

// --- Functions ---
async function checkEmail() {
    try {
        const methods = await fetchSignInMethodsForEmail(auth, emailInput.value);
        emailExists = methods.length > 0;
        passwordGroup.classList.remove('hidden');
        actionBtn.textContent = emailExists ? 'Log In' : 'Create Account';
        emailChecked = true;
        emailInput.disabled = true;
    } catch (error) {
        errorMessage.textContent = 'Could not verify email. Please try again.';
    }
}

async function handleAuthAction() {
    const email = emailInput.value;
    const password = passwordInput.value;
    if (password.length < 6) {
        errorMessage.textContent = 'Password must be at least 6 characters long.';
        return;
    }
    try {
        if (emailExists) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
        window.location.href = 'index.html'; // Redirect to game on success
    } catch (error) {
        errorMessage.textContent = error.message;
    }
}