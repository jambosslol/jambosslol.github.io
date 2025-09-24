import { auth } from './firebase-config.js';
import { getAuth, fetchSignInMethodsForEmail, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    // Check if the user was redirected from the play button
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

    // --- State to manage the form flow ---
    let formStep = 'check-email'; // Can be 'check-email', 'login', or 'signup'

    // --- Main Form Event Listener ---
    authForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        errorMessage.textContent = ''; 

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
     * Step 1: Check if the entered email is already registered in Firebase.
     */
    async function handleCheckEmail() {
        const email = emailInput.value;
        if (!email) {
            errorMessage.textContent = 'Please enter an email address.';
            return;
        }
        try {
            // This is the key Firebase function to check for an existing user.
            const methods = await fetchSignInMethodsForEmail(auth, email);
            emailInput.disabled = true; // Lock the email field

            if (methods.length > 0) {
                // --- EMAIL EXISTS ---
                // The user has an account, so prepare the form for login.
                formStep = 'login';
                formTitle.textContent = 'Log In';
                formInstruction.textContent = 'Welcome back! Enter your password.';
                loginPasswordGroup.classList.remove('hidden');
                actionBtn.textContent = 'Log In';
                loginPasswordInput.focus(); // Focus on the password field
            } else {
                // --- EMAIL DOES NOT EXIST ---
                // The user is new, so prepare the form for signup.
                formStep = 'signup';
                formTitle.textContent = 'Create an Account';
                formInstruction.textContent = 'This email is not registered. Create a password to sign up.';
                signupPasswordGroup.classList.remove('hidden');
                confirmPasswordGroup.classList.remove('hidden');
                actionBtn.textContent = 'Create Account';
                signupPasswordInput.focus();
            }
        } catch (error) {
            console.error("Error checking email:", error);
            errorMessage.textContent = 'Could not verify email. Please try again.';
        }
    }

    /**
     * Step 2 (Login): Authenticate the existing user.
     */
    async function handleLogin() {
        const email = emailInput.value;
        const password = loginPasswordInput.value;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // On successful login, redirect to the game.
            window.location.href = 'index.html#game';
        } catch (error) {
            // Provide more specific error feedback
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                errorMessage.textContent = "Incorrect password. Please try again.";
            } else {
                errorMessage.textContent = "An error occurred during login.";
                console.error("Login Error:", error);
            }
        }
    }

    /**
     * Step 2 (Signup): Create a new user account.
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
            // On successful signup, redirect to the game.
            window.location.href = 'index.html#game';
        } catch (error) {
            errorMessage.textContent = error.message;
        }
    }
});