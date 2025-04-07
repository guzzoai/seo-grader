document.addEventListener('DOMContentLoaded', () => {
    const seoForm = document.getElementById('seo-form');
    const analyzeButton = document.getElementById('analyze-button');
    const resultsSection = document.getElementById('results-section');
    const loadingIndicator = document.getElementById('loading-indicator');
    const errorMessage = document.getElementById('error-message');
    const errorDetails = document.getElementById('error-details');

    const scoreSpan = document.getElementById('score');
    const scoreBar = document.getElementById('score-bar');
    const checksList = document.getElementById('checks-list');
    const recommendationsList = document.getElementById('recommendations-list');

    const optimizeButton = document.getElementById('optimize-button');
    const optimizationSuggestionsDiv = document.getElementById('optimization-suggestions');
    const suggestedTitleTextarea = document.getElementById('suggested-title');
    const suggestedMetaDescriptionTextarea = document.getElementById('suggested-meta-description');
    const copyButtons = document.querySelectorAll('.copy-button');

    let currentHtmlContent = '';
    let currentKeyword = '';

    // --- Analyze SEO ---
    seoForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent default form submission

        // Hide previous results/errors
        resultsSection.classList.add('hidden');
        errorMessage.classList.add('hidden');
        optimizationSuggestionsDiv.classList.add('hidden');
        optimizeButton.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        analyzeButton.disabled = true;

        currentHtmlContent = document.getElementById('htmlContent').value;
        currentKeyword = document.getElementById('keyword').value;

        try {
            const response = await fetch('/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ htmlContent: currentHtmlContent, keyword: currentKeyword }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const results = await response.json();
            displayResults(results);
            resultsSection.classList.remove('hidden');
            // Show optimize button only if analysis was successful
            optimizeButton.classList.remove('hidden');

        } catch (error) {
            console.error('Error fetching analysis:', error);
            displayError(error.message);
        } finally {
            loadingIndicator.classList.add('hidden');
            analyzeButton.disabled = false;
        }
    });

    // --- Suggest Optimizations ---
    optimizeButton.addEventListener('click', async () => {
        // Hide previous suggestions/errors
        optimizationSuggestionsDiv.classList.add('hidden');
        errorMessage.classList.add('hidden');
        loadingIndicator.classList.remove('hidden');
        optimizeButton.disabled = true;

        try {
            const response = await fetch('/optimize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // Send the same HTML and keyword used for the analysis
                body: JSON.stringify({ htmlContent: currentHtmlContent, keyword: currentKeyword }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const suggestions = await response.json();
            displayOptimizationSuggestions(suggestions);
            optimizationSuggestionsDiv.classList.remove('hidden');

        } catch (error) {
            console.error('Error fetching optimizations:', error);
            displayError(error.message);
        } finally {
            loadingIndicator.classList.add('hidden');
            optimizeButton.disabled = false;
        }
    });

    // --- Display Functions ---
    function displayResults(results) {
        // Score
        scoreSpan.textContent = results.score;
        const scorePercentage = Math.max(0, Math.min(100, results.score)); // Clamp score 0-100
        scoreBar.style.width = `${scorePercentage}%`;
        // Adjust score bar color based on score
        if (scorePercentage < 50) {
            scoreBar.style.backgroundColor = '#d9534f'; // Red
        } else if (scorePercentage < 80) {
            scoreBar.style.backgroundColor = '#f0ad4e'; // Orange
        } else {
            scoreBar.style.backgroundColor = '#5cb85c'; // Green
        }


        // Checks
        checksList.innerHTML = ''; // Clear previous checks
        results.checks.forEach(check => {
            const li = document.createElement('li');
            li.innerHTML = `<span class="result-${check.result}">${check.result}</span>: ${check.factor} - ${check.details}`;
            checksList.appendChild(li);
        });

        // Recommendations
        recommendationsList.innerHTML = ''; // Clear previous recommendations
        if (results.recommendations && results.recommendations.length > 0) {
            results.recommendations.forEach(rec => {
                const li = document.createElement('li');
                li.textContent = rec;
                recommendationsList.appendChild(li);
            });
            document.getElementById('recommendations-container').classList.remove('hidden');
        } else {
             document.getElementById('recommendations-container').classList.add('hidden');
        }
    }

    function displayOptimizationSuggestions(suggestions) {
        suggestedTitleTextarea.value = suggestions.suggestedTitle || 'No suggestion available.';
        suggestedMetaDescriptionTextarea.value = suggestions.suggestedMetaDescription || 'No suggestion available.';
    }

    function displayError(message) {
        errorDetails.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    // --- Copy Button Functionality ---
    copyButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetId = button.getAttribute('data-target');
            const textarea = document.getElementById(targetId);
            textarea.select();
            try {
                document.execCommand('copy');
                // Optional: Provide visual feedback
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                setTimeout(() => { button.textContent = originalText; }, 1500);
            } catch (err) {
                console.error('Failed to copy text: ', err);
                // Optional: Notify user of failure
            }
            textarea.blur(); // Deselect the text
        });
    });

});