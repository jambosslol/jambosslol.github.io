import { auth } from './firebase-config.js';
import { getAuth, fetchSignInMethodsForEmail, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
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

    // This variable tracks which step the user is on.
    let formStep = 'check-email'; // 'check-email', 'login', or 'signup'

    /**
     * This is the main function that runs when the user clicks the "Continue" or "Log In" button.
     */
    authForm.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevents the page from reloading
        errorMessage.textContent = ''; // Clear any old error messages

        // We decide what to do based on the current formStep
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

    /**
     * Step 1: Check if the entered email is already registered.
     */
    async function handleCheckEmail() {
        const email = emailInput.value;
        if (!email) {
            errorMessage.textContent = 'Please enter an email address.';
            return;
        }
        try {
            // This Firebase function checks if an account with the email exists.
            const methods = await fetchSignInMethodsForEmail(auth, email);
            emailInput.disabled = true; // Lock the email field after checking

            // If the 'methods' array is not empty, the user exists.
            if (methods.length > 0) {
                // --- USER EXISTS: Prepare for LOGIN ---
                formStep = 'login';
                formTitle.textContent = 'Log In';
                formInstruction.textContent = 'Welcome back! Please enter your password.';
                loginPasswordGroup.classList.remove('hidden');
                actionBtn.textContent = 'Log In';
                loginPasswordInput.focus(); // Automatically focus the password input
            } else {
                // --- USER DOES NOT EXIST: Prepare for SIGN UP ---
                formStep = 'signup';
                formTitle.textContent = 'Create an Account';
                formInstruction.textContent = 'This email isn\'t registered. Create a password to sign up.';
                signupPasswordGroup.classList.remove('hidden');
                confirmPasswordGroup.classList.remove('hidden');
                actionBtn.textContent = 'Create Account & Sign In';
                signupPasswordInput.focus(); // Automatically focus the create password input
            }
        } catch (error) {
            console.error("Error checking email:", error);
            errorMessage.textContent = 'Could not verify email. Please try again.';
        }
    }

    /**
     * Step 2a: The user exists, so we log them in.
     */
    async function handleLogin() {
        const email = emailInput.value;
        const password = loginPasswordInput.value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // After successful login, send the user to the game.
            window.location.href = 'index.html#game';
        } catch (error) {
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorMessage.textContent = "That password doesn't look right. Please try again.";
            } else {
                errorMessage.textContent = "An unexpected error occurred during login.";
                console.error("Login Error:", error);
            }
        }
    }

    /**
     * Step 2b: The user is new, so we create an account.
     */
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
            // After successful account creation, send the user to the game.
            window.location.href = 'index.html#game';
        } catch (error) {
            errorMessage.textContent = error.message;
            console.error("Signup Error:", error);
        }
    }
});