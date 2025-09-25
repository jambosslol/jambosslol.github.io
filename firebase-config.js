// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-analytics.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBNCE1U6rZ4mymmFuKCXMHEpkEYPEzx2O4",
  authDomain: "odd1out-eecdd.firebaseapp.com",
  projectId: "odd1out-eecdd",
  storageBucket: "odd1out-eecdd.firebasestorage.app",
  messagingSenderId: "1014717037898",
  appId: "1:1014717037898:web:9fecf922f4f4e343a015b3",
  measurementId: "G-MLY80D9SGW"
};

// Initialize Firebase ONCE
const app = initializeApp(firebaseConfig);  

// Export the auth instance to be used in other files
export const auth = getAuth(app);

const analytics = getAnalytics(app);