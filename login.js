import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const errorMessage = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.textContent = '';
        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.href = 'index.html#game'; // Success
        } catch (error) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                errorMessage.textContent = 'Email not found. Do you want to create an account?';
            } else if (error.code === 'auth/wrong-password') {
                errorMessage.textContent = 'Incorrect password. Please try again.';
            } else {
                errorMessage.textContent = 'An unexpected error occurred. Please try again.';
                console.error("Login Error:", error);
            }
        }
    });
});
