
document.addEventListener('DOMContentLoaded', () => {

    // At the top of your script.js, outside any function
    let puzzles = [];

    // Replace the old setupHomepage() with this async function to load data first
    async function initializeApp() {
        try {
            const response = await fetch('puzzles.json');
            puzzles = await response.json();
            setupHomepage(); // Now run the original setup
        } catch (error) {
            console.error("Failed to load puzzles:", error);
            // You could display an error message to the user here
        }
    }

    // Call the new initializer at the end of the script
    initializeApp(); 
    /*
    const puzzles = [
        { tokens: ["LEVEL", "RADAR", "REFER", "KAYAK", "LASER"], answer_index: 4, category: "Palindromes", explanation: "These words read the same forwards and back.", completed: false },
        { tokens: ["VENUS", "CERES", "MERCURY", "MARS", "PLUTO"], answer_index: 1, category: "Planets", explanation: "These are all planets or former planets.", completed: false },
        { tokens: ["THEATER", "LITER", "FIBER", "CENTER", "METER"], answer_index: 1, category: "US Spellings with -ER", explanation: "These words have UK counterparts ending in -re.", completed: false }
    ];
    */
    // DOM Elements
    const homepage = document.getElementById('homepage'), gamePage = document.getElementById('game-page'), playBtn = document.getElementById('play-btn');
    const headerDateSpan = document.getElementById('header-date'), mistakesCounter = document.getElementById('mistakes-counter');
    const tokensContainer = document.getElementById('tokens-container'), shuffleBtn = document.getElementById('shuffle-btn'), submitBtn = document.getElementById('submit-btn');
    const progressTracker = document.getElementById('progress-tracker'), resultModal = document.getElementById('result-modal');
    const resultTitle = document.getElementById('result-title'), finalScore = document.getElementById('final-score');
    const resultCategory = document.getElementById('result-category'), resultExplanation = document.getElementById('result-explanation');
    const continueBtn = document.getElementById('continue-btn'), prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn'), reviewExplanation = document.getElementById('review-explanation');

    // Game State
    let lives = 3, currentPuzzleIndex = 0, selectedTokenIndex = null;
    let isGameBeaten = false, inReviewMode = false;

    function setupHomepage() {
        const today = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        headerDateSpan.textContent = today.toLocaleDateString('en-US', options);
        playBtn.addEventListener('click', startGame);
    }

    function startGame() {
        homepage.classList.add('hidden');
        gamePage.classList.remove('hidden');
        updateLivesDisplay();
        drawProgressTracker();
        loadPuzzle(currentPuzzleIndex);
    }

    function loadPuzzle(puzzleIndex) {
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
    }
    
    function updateLivesDisplay() {
        mistakesCounter.innerHTML = "Mistakes Remaining: " + '<span>● </span>'.repeat(lives);
    }

    function drawProgressTracker() {
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

    function handleSubmit() {
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
    }

    function handleShuffle() {
        if (inReviewMode) return;
        
        const tokenButtons = Array.from(tokensContainer.querySelectorAll('.token-btn'));
        const selectedButton = tokensContainer.querySelector('.token-btn.selected');
        const selectedText = selectedButton ? selectedButton.querySelector('span').textContent : null;

        const tokenData = tokenButtons.map(btn => ({
            text: btn.querySelector('span').textContent,
            originalIndex: btn.dataset.index,
            isDisabled: btn.disabled
        }));

        tokenButtons.forEach(btn => btn.querySelector('span').classList.add('fading-out'));
        
        setTimeout(() => {
            // Fisher-Yates shuffle algorithm
            for (let i = tokenData.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [tokenData[i], tokenData[j]] = [tokenData[j], tokenData[i]];
            }
            
            // Re-assign data and text to the existing buttons
            tokenButtons.forEach((button, i) => {
                button.querySelector('span').textContent = tokenData[i].text;
                button.dataset.index = tokenData[i].originalIndex;
                button.disabled = tokenData[i].isDisabled;
                button.classList.remove('selected'); // Clear all selections before re-applying
                button.querySelector('span').classList.remove('fading-out');
            });

            // Re-select the button that now holds the originally selected text
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

    function hideResultModalAndContinue() {
        resultModal.classList.remove('visible');
        if (isGameBeaten || lives <= 0) {
            setTimeout(enterReviewMode, 300);
            return;
        }
        setTimeout(() => {
            currentPuzzleIndex++;
            loadPuzzle(currentPuzzleIndex);
        }, 300);
    }
    
    function enterReviewMode() {
        inReviewMode = true;
        // Hide center controls (Shuffle and Submit)
        // document.getElementById('center-controls').classList.add('hidden');
        shuffleBtn.classList.add('hidden');
        // shuffleBtn.parentElement.classList.add('hidden');
        submitBtn.classList.add('hidden');
        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
        mistakesCounter.classList.add('hidden');
        updateNavButtonsState();
        displayPuzzleInReview(currentPuzzleIndex);
    }
    
    function displayPuzzleInReview(index) {
        loadPuzzle(index); // Renders the neutral state buttons
        const puzzle = puzzles[index];
        
        // This now happens synchronously, before the next browser paint
        tokensContainer.querySelectorAll('.token-btn').forEach((button) => {
            button.disabled = true;
            const buttonIndex = parseInt(button.dataset.index);
            if (buttonIndex === puzzle.answer_index) {
                button.classList.add('review-correct'); // Use static highlight class
            }
        });
        reviewExplanation.textContent = puzzle.explanation;
        reviewExplanation.classList.remove('hidden');
    }

    function updateNavButtonsState() {
        prevBtn.disabled = (currentPuzzleIndex === 0);
        nextBtn.disabled = (currentPuzzleIndex === puzzles.length - 1);
    }

    function navigateReview(direction) {
        const newIndex = currentPuzzleIndex + direction;
        if (newIndex >= 0 && newIndex < puzzles.length) {
            currentPuzzleIndex = newIndex;
            updateNavButtonsState();
            reviewExplanation.classList.add('hidden');
// Hide old explanation before loading new one
            displayPuzzleInReview(currentPuzzleIndex);
        }
    }
    
    // Event listeners
    submitBtn.addEventListener('click', handleSubmit);
    shuffleBtn.addEventListener('click', handleShuffle);
    continueBtn.addEventListener('click', hideResultModalAndContinue);
    prevBtn.addEventListener('click', () => navigateReview(-1));
    nextBtn.addEventListener('click', () => navigateReview(1));
    
    setupHomepage();
});

