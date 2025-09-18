import { auth } from './firebase-config.js';
import { getAuth, fetchSignInMethodsForEmail, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// --- Check for Redirect Instruction ---
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectToGame = urlParams.get('redirect') === 'game';

    // --- DOM ELEMENTS ---
    const authForm = document.getElementById('auth-form');
    const formTitle = document.getElementById('form-title');
    const formInstruction = document.getElementById('form-instruction');
    const emailInput = document.getElementById('email-input');
    const signupPasswordGroup = document.getElementById('signup-password-group');
    const confirmPasswordGroup = document.getElementById('confirm-password-group');
    const loginPasswordGroup = document.getElementById('login-password-group');
    const signupPasswordInput = document.getElementById('signup-password-input');
    const confirmPasswordInput = document.getElementById('confirm-password-input');
    const loginPasswordInput = document.getElementById('login-password-input');
    const actionBtn = document.getElementById('action-btn');
    const errorMessage = document.getElementById('error-message');

    // --- Game State ---
    let formStep = 'check-email'; // 'check-email', 'login', or 'signup'

    // --- Event Listener for the Form ---
    authForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevents the page from reloading
        errorMessage.textContent = ''; // Clear previous errors

        switch (formStep) {
            case 'check-email':
                handleCheckEmail();
                break;
            case 'login':
                handleLogin();
                break;
            case 'signup':
                handleSignup();
                break;
        }
    });

    async function handleAuthAction() {
        const email = emailInput.value;
        const password = passwordInput.value;
        // ... password validation ...

        try {
            if (emailExists) {
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                await createUserWithEmailAndPassword(auth, email, password);
            }
            
            // --- NEW REDIRECT LOGIC ---
            // On success, check if we need to redirect to the game or the homepage
            if (redirectToGame) {
                window.location.href = 'index.html#game'; // Go to the game page view
            } else {
                window.location.href = 'index.html'; // Go back to the homepage
            }

        } catch (error) {
            errorMessage.textContent = error.message;
        }
    }

    async function handleCheckEmail() {
        const email = emailInput.value;
        if (!email) {
            errorMessage.textContent = 'Please enter an email address.';
            return;
        }
        try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            emailInput.disabled = true; // Lock the email field

            if (methods.length > 0) {
                // Email EXISTS, so prepare for login
                formStep = 'login';
                formTitle.textContent = 'Log In';
                formInstruction.textContent = 'Welcome back! Enter your password.';
                loginPasswordGroup.classList.remove('hidden');
                actionBtn.textContent = 'Log In';
            } else {
                // Email DOES NOT exist, so prepare for signup
                formStep = 'signup';
                formTitle.textContent = 'Create an Account';
                formInstruction.textContent = 'This email is not registered. Create a password to sign up.';
                signupPasswordGroup.classList.remove('hidden');
                confirmPasswordGroup.classList.remove('hidden');
                actionBtn.textContent = 'Create Account';
            }
        } catch (error) {
            console.error("Error checking email:", error);
            errorMessage.textContent = 'Could not verify email. Please try again.';
        }
    }

    async function handleLogin() {
        const email = emailInput.value;
        const password = loginPasswordInput.value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // For login, respect the redirect parameter
            if (redirectToGame) {
                window.location.href = 'index.html#game';
            } else {
                window.location.href = 'index.html';
            }
        } catch (error) {
            errorMessage.textContent = "Incorrect password. Please try again.";
        }
    }

    async function handleSignup() {
        const email = emailInput.value;
        const password = signupPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password.length < 6) {
            errorMessage.textContent = 'Password must be at least 6 characters long.';
            return;
        }
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Passwords do not match.';
            return;
        }

        try {
            await createUserWithEmailAndPassword(auth, email, password);
            // **THE CHANGE:** After creating an account, ALWAYS redirect to the game.
            window.location.href = 'index.html#game';
        } catch (error) {
            errorMessage.textContent = error.message;
        }
    }

    async function successfulAuth() {
        if (redirectToGame) {
            window.location.href = 'index.html#game'; // Go to the game page view
        } else {
            window.location.href = 'index.html'; // Go back to the homepage
        }
    }
});



