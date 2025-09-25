import { auth } from './firebase-config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signup-form');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const confirmPasswordInput = document.getElementById('confirm-password-input');
    const errorMessage = document.getElementById('error-message');

    signupForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        errorMessage.textContent = '';
        const email = emailInput.value;
        const password = passwordInput.value;
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
            window.location.href = 'index.html#game'; // Success
        } catch (error) {
            if (error.code === 'auth/email-already-in-use') {
                errorMessage.textContent = 'This email is already in use. Please log in instead.';
            } else {
                errorMessage.textContent = 'An unexpected error occurred. Please try again.';
                console.error("Signup Error:", error);
            }
        }
    });
});
