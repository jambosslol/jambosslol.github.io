import { auth } from './firebase-config.js';
// MODIFICATION: Import Firestore functions
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

// MODIFICATION: Initialize Firestore
const db = getFirestore();

let puzzles = [];
let currentUser = null;
let appInitialized = false; // NEW: Flag to prevent re-initialization

// Game State - Now initialized with defaults
let lives = 3;
let currentPuzzleIndex = 0;
let selectedTokenIndex = null;
let isGameBeaten = false;
let inReviewMode = false;

// --- UPDATED: Functions to save and load game state from Firestore ---

/**
 * Saves the current game progress.
 * - If the user is logged in, saves to their Firestore document.
 * - If anonymous, saves to localStorage for that device.
 */
async function saveGameState() {
    const today = new Date().toISOString().slice(0, 10); // Get date as 'YYYY-MM-DD'
    const gameState = {
        date: today,
        lives: lives,
        puzzles: puzzles,
        currentPuzzleIndex: currentPuzzleIndex,
        isGameBeaten: isGameBeaten,
        inReviewMode: inReviewMode
    };

    if (currentUser) {
        // User is logged in, save to Firestore
        const userProgressRef = doc(db, "user_progress", currentUser.uid);
        await setDoc(userProgressRef, { [today]: gameState }, { merge: true });
    } else {
        // User is anonymous, save to localStorage
        localStorage.setItem('outlierGameState', JSON.stringify(gameState));
    }
}

/**
 * Loads game progress for the current day.
 * - If logged in, loads from Firestore.
 * - If anonymous, loads from localStorage.
 */
async function loadGameState() {
    const today = new Date().toISOString().slice(0, 10);
    let loadedState = null;

    if (currentUser) {
        // User is logged in, try to load from Firestore
        const userProgressRef = doc(db, "user_progress", currentUser.uid);
        const docSnap = await getDoc(userProgressRef);
        if (docSnap.exists() && docSnap.data()[today]) {
            loadedState = docSnap.data()[today];
        }
    } else {
        // User is anonymous, try to load from localStorage
        const savedStateJSON = localStorage.getItem('outlierGameState');
        if (savedStateJSON) {
            const savedState = JSON.parse(savedStateJSON);
            if (savedState.date === today) {
                loadedState = savedState;
            }
        }
    }
    
    // If state was loaded, update the game variables
    if (loadedState) {
        lives = loadedState.lives;
        puzzles = loadedState.puzzles;
        currentPuzzleIndex = loadedState.currentPuzzleIndex;
        isGameBeaten = loadedState.isGameBeaten;
        inReviewMode = loadedState.inReviewMode;
        return true; // Indicate that state was loaded
    }
    return false; // Indicate no state was loaded
}

/**
 * Resets the game state variables to their default values.
 * This is used when a user logs out to ensure a fresh start for the next user.
 */
function resetGameState() {
    puzzles = [];
    lives = 3;
    currentPuzzleIndex = 0;
    selectedTokenIndex = null;
    isGameBeaten = false;
    inReviewMode = false;
}

/**
 * NEW: Updates the header buttons based on the user's login status.
 */
function updateHeaderUI(user) {
    const authActionBtn = document.getElementById('auth-action-btn');
    const createAccountHeaderBtn = document.getElementById('create-account-header-btn');

    if (user) {
        authActionBtn.textContent = 'Sign Out';
        authActionBtn.classList.remove('hidden');
        createAccountHeaderBtn.classList.add('hidden');
        authActionBtn.onclick = () => {
            signOut(auth).then(() => { window.location.href = 'index.html'; });
        };
    } else {
        authActionBtn.textContent = 'Create Account';
        createAccountHeaderBtn.textContent = 'Log In';
        authActionBtn.classList.remove('hidden');
        createAccountHeaderBtn.classList.remove('hidden');
        authActionBtn.onclick = () => { window.location.href = 'signup.html'; };
        createAccountHeaderBtn.onclick = () => { window.location.href = 'login.html'; };
    }
}


document.addEventListener('DOMContentLoaded', () => {
    // MODIFICATION: The onAuthStateChanged listener is now the main entry point for the app.
    onAuthStateChanged(auth, async (user) => {
        const oldUser = currentUser;
        currentUser = user;

        // Handle user state changes (like migrating anonymous data on login)
        if (user && !oldUser) {
            const localData = localStorage.getItem('outlierGameState');
            const today = new Date().toISOString().slice(0, 10);
            if (localData) {
                const savedState = JSON.parse(localData);
                if (savedState.date === today && !savedState.isGameBeaten && savedState.lives > 0) {
                    // --- THE FIX ---
                    // Before saving, we must load the anonymous progress into the main game state variables.
                    // This ensures the correct data (especially the puzzles array) is saved to the new account.
                    lives = savedState.lives;
                    puzzles = savedState.puzzles;
                    currentPuzzleIndex = savedState.currentPuzzleIndex;
                    isGameBeaten = savedState.isGameBeaten;
                    inReviewMode = savedState.inReviewMode;
                    
                    await saveGameState(); // This will now save the correct, complete game state.
                }
                localStorage.removeItem('outlierGameState');
            }
        } else if (!user && oldUser) {
            resetGameState();
        }

        // Update the header UI based on the new auth state
        updateHeaderUI(user);

        // The main app initialization now runs only ONCE, after the first auth check is complete.
        if (!appInitialized) {
            appInitialized = true;
            await initializeApp();
        }
    });

    const homepage = document.getElementById('homepage');
    const gamePage = document.getElementById('game-page');
    const playBtn = document.getElementById('play-btn');

    function showGamePage() {
        if (!gamePage.classList.contains('hidden')) return;
        homepage.classList.add('hidden');
        gamePage.classList.remove('hidden');
        
        // Use a brief timeout to ensure the DOM is ready for the game to be rendered.
        setTimeout(() => {
            if (isGameBeaten || lives <= 0 || inReviewMode) {
                enterReviewMode();
            } else if (puzzles.length > 0 && !document.getElementById('tokens-container').hasChildNodes()) {
                startGame();
            }
        }, 0);
    }

    if (playBtn) {
        playBtn.addEventListener('click', () => {
            window.location.hash = 'game';
            showGamePage();
        });
    }
    
    async function initializeApp() {
        try {
            const stateLoaded = await loadGameState();

            if (!stateLoaded) {
                const response = await fetch('puzzles.json', { cache: 'no-cache' });
                puzzles = await response.json();
            }

            setupHomepage();

            if (window.location.hash === '#game') {
                showGamePage();
            }

        } catch (error) {
            console.error("Failed to load puzzles:", error);
        }
    }
    
    const headerDateSpan = document.getElementById('header-date'), mistakesCounter = document.getElementById('mistakes-counter');
    const tokensContainer = document.getElementById('tokens-container'), shuffleBtn = document.getElementById('shuffle-btn'), submitBtn = document.getElementById('submit-btn');
    const progressTracker = document.getElementById('progress-tracker'), resultModal = document.getElementById('result-modal');
    const resultTitle = document.getElementById('result-title'), finalScore = document.getElementById('final-score');
    const resultCategory = document.getElementById('result-category'), resultExplanation = document.getElementById('result-explanation');
    const continueBtn = document.getElementById('continue-btn'), prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn'), reviewExplanation = document.getElementById('review-explanation');

    function setupHomepage() {
        const today = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        headerDateSpan.textContent = today.toLocaleDateString('en-US', options);
    }

    function startGame() {
        homepage.classList.add('hidden');
        gamePage.classList.remove('hidden');
        updateLivesDisplay();
        drawProgressTracker();
        loadPuzzle(currentPuzzleIndex);
    }

    function loadPuzzle(puzzleIndex) {
        if(puzzles.length === 0) return;
        if(puzzleIndex >= puzzles.length) {
            currentPuzzleIndex = puzzles.length - 1;
            puzzleIndex = currentPuzzleIndex;
        }

        const puzzle = puzzles[puzzleIndex];
        selectedTokenIndex = null;
        tokensContainer.innerHTML = '';
        submitBtn.disabled = true;
        
        puzzle.tokens.forEach((token, index) => {
            const button = document.createElement('button');
            button.className = 'token-btn';
            button.dataset.index = index;
            const span = document.createElement('span');
            span.textContent = token;
            button.appendChild(span);
            button.addEventListener('click', handleTokenSelect);
            tokensContainer.appendChild(button);
        });

        if (puzzles[currentPuzzleIndex] && puzzles[currentPuzzleIndex].completed) {
            tokensContainer.querySelectorAll('.token-btn').forEach(btn => btn.disabled = true);
        }
    }
    
    function updateLivesDisplay() {
        mistakesCounter.innerHTML = "Mistakes Remaining: " + '<span>● </span>'.repeat(lives);
    }

    function drawProgressTracker() {
        if (!puzzles) return;
        progressTracker.innerHTML = '';
        let completedCount = 0;
        puzzles.forEach(puzzle => {
            const dot = document.createElement('div');
            dot.className = 'progress-dot';
            if (puzzle.completed) {
                completedCount++;
                dot.classList.add(`completed-${completedCount}`);
            }
            progressTracker.appendChild(dot);
        });
    }

    function handleTokenSelect(event) {
        if (inReviewMode || event.currentTarget.disabled) return;
        const clickedIndex = parseInt(event.currentTarget.dataset.index, 10);
        if (selectedTokenIndex === clickedIndex) {
            event.currentTarget.classList.remove('selected');
            selectedTokenIndex = null;
            submitBtn.disabled = true;
        } else {
            tokensContainer.querySelectorAll('.token-btn').forEach(btn => btn.classList.remove('selected'));
            event.currentTarget.classList.add('selected');
            selectedTokenIndex = clickedIndex;
            submitBtn.disabled = false;
        }
    }

    async function handleSubmit() {
        if (selectedTokenIndex === null) return;
        const currentPuzzle = puzzles[currentPuzzleIndex];
        const selectedButton = tokensContainer.querySelector(`[data-index='${selectedTokenIndex}']`);
        if (selectedTokenIndex === currentPuzzle.answer_index) {
            submitBtn.disabled = true;
            tokensContainer.querySelectorAll('.token-btn').forEach(btn => { if(btn !== selectedButton) btn.disabled = true; });
            selectedButton.classList.add('correct-reveal');
            puzzles[currentPuzzleIndex].completed = true;
            if (puzzles.every(p => p.completed)) isGameBeaten = true;
            drawProgressTracker();
            setTimeout(() => showResultModal(true, isGameBeaten ? "You Win!" : null), 1200);
        } else {
            lives--;
            updateLivesDisplay();
            selectedButton.classList.add('incorrect-shake', 'flash-red');
            setTimeout(() => selectedButton.classList.remove('flash-red'), 500);
            selectedButton.disabled = true;
            selectedButton.classList.remove('selected');
            selectedTokenIndex = null;
            submitBtn.disabled = true;
            if (lives <= 0) {
                showResultModal(false, "Game Over");
            }
        }
        await saveGameState();
    }

    function handleShuffle() {
        if (inReviewMode) return;
        const tokenButtons = Array.from(tokensContainer.querySelectorAll('.token-btn'));
        const selectedButton = tokensContainer.querySelector('.token-btn.selected');
        const selectedText = selectedButton ? selectedButton.querySelector('span').textContent : null;
        const tokenData = tokenButtons.map(btn => ({ text: btn.querySelector('span').textContent, originalIndex: btn.dataset.index, isDisabled: btn.disabled }));
        tokenButtons.forEach(btn => btn.querySelector('span').classList.add('fading-out'));
        setTimeout(() => {
            for (let i = tokenData.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [tokenData[i], tokenData[j]] = [tokenData[j], tokenData[i]];
            }
            tokenButtons.forEach((button, i) => {
                button.querySelector('span').textContent = tokenData[i].text;
                button.dataset.index = tokenData[i].originalIndex;
                button.disabled = tokenData[i].isDisabled;
                button.classList.remove('selected');
                button.querySelector('span').classList.remove('fading-out');
            });
            if (selectedText) {
                const newButtonToSelect = Array.from(tokenButtons).find(btn => btn.querySelector('span').textContent === selectedText);
                if (newButtonToSelect && !newButtonToSelect.disabled) {
                    newButtonToSelect.classList.add('selected');
                }
            }
        }, 300);
    }

    function showResultModal(isSuccess, titleOverride = null) {
        const currentPuzzle = puzzles[currentPuzzleIndex];
        resultTitle.textContent = titleOverride || (isSuccess ? "Correct!" : "Nice Try!");
        resultCategory.textContent = currentPuzzle.category;
        resultExplanation.textContent = currentPuzzle.explanation;
        finalScore.classList.add('hidden');
        if (titleOverride === "Game Over") {
            const score = puzzles.filter(p => p.completed).length;
            finalScore.textContent = `You answered ${score}/${puzzles.length} correctly.`;
            finalScore.classList.remove('hidden');
            continueBtn.textContent = "View Puzzle";
            continueBtn.classList.add('view-puzzle-btn');
        } else {
            continueBtn.textContent = "Continue →";
            continueBtn.classList.remove('view-puzzle-btn');
        }
        resultModal.classList.add('visible');
    }

    async function hideResultModalAndContinue() {
        resultModal.classList.remove('visible');
        if (isGameBeaten || lives <= 0) {
            setTimeout(enterReviewMode, 300);
            return;
        }
        setTimeout(async () => {
            currentPuzzleIndex++;
            loadPuzzle(currentPuzzleIndex);
            await saveGameState();
        }, 300);
    }
    
    async function enterReviewMode() {
        inReviewMode = true;
        await saveGameState();

        shuffleBtn.classList.add('hidden');
        submitBtn.classList.add('hidden');
        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
        mistakesCounter.classList.add('hidden');
        updateNavButtonsState();
        displayPuzzleInReview(currentPuzzleIndex);
    }
    
    function displayPuzzleInReview(index) {
        loadPuzzle(index);
        const puzzle = puzzles[index];
        tokensContainer.querySelectorAll('.token-btn').forEach((button) => {
            button.disabled = true;
            const buttonIndex = parseInt(button.dataset.index);
            if (buttonIndex === puzzle.answer_index) {
                button.classList.add('review-correct');
            }
        });
        reviewExplanation.textContent = puzzle.explanation;
        reviewExplanation.classList.remove('hidden');
    }

    function updateNavButtonsState() {
        prevBtn.disabled = (currentPuzzleIndex === 0);
        nextBtn.disabled = (currentPuzzleIndex === puzzles.length - 1);
    }

    async function navigateReview(direction) {
        const newIndex = currentPuzzleIndex + direction;
        if (newIndex >= 0 && newIndex < puzzles.length) {
            currentPuzzleIndex = newIndex;
            updateNavButtonsState();
            reviewExplanation.classList.add('hidden');
            displayPuzzleInReview(currentPuzzleIndex);
            await saveGameState();
        }
    }
    
    submitBtn.addEventListener('click', handleSubmit);
    shuffleBtn.addEventListener('click', handleShuffle);
    continueBtn.addEventListener('click', hideResultModalAndContinue);
    prevBtn.addEventListener('click', () => navigateReview(-1));
    nextBtn.addEventListener('click', () => navigateReview(1));
});

