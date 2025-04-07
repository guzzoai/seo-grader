require('dotenv').config(); // Load environment variables from .env file
console.log('Attempting to load GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Found' : 'Not Found'); // Add this line
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- Helper Functions ---

// Helper function for case-insensitive keyword check
function includesKeyword(text, keyword) {
    if (!text || !keyword) return false;
    return text.toLowerCase().includes(keyword.toLowerCase());
}

// Helper function to get clean text content from Cheerio selection
function getCleanText($, selector) {
    let text = '';
    $(selector).each((i, elem) => {
        text += $(elem).text() + ' ';
    });
    // Remove extra whitespace and newlines
    return text.replace(/\s\s+/g, ' ').trim();
}

// Helper function to extract text safely from Gemini response
function extractGeminiText(response) {
    try {
        // Check for response structure based on Google AI SDK
        if (response && response.response && response.response.candidates && response.response.candidates.length > 0) {
            const candidate = response.response.candidates[0];
            if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                return candidate.content.parts[0].text.trim();
            }
        }
        // Fallback or older structure check (adjust if needed based on SDK version)
        if (response && response.response && typeof response.response.text === 'function') {
             return response.response.text().trim();
        }
        console.warn("Could not extract text from Gemini response:", JSON.stringify(response));
        return null; // Indicate failure to extract
    } catch (error) {
        console.error("Error extracting text from Gemini response:", error);
        return null;
    }
}

// --- App Setup ---
const app = express();
const port = process.env.PORT || 3000;

// --- Middleware ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json({ limit: '5mb' })); // Parse JSON request bodies (increase limit for large HTML)
app.use(express.static('public')); // Serve static files from the 'public' directory

// --- Gemini API Setup (Placeholder - Key needed in .env) ---
let genAI;
if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
} else {
    console.warn("GEMINI_API_KEY not found in .env file. Optimization features will be disabled.");
}

// --- API Endpoints ---

// POST /analyze
// Analyzes the provided HTML content and keyword
app.post('/analyze', (req, res) => {
    console.log("Received /analyze request");
    const { htmlContent, keyword } = req.body;

    if (!htmlContent || !keyword) {
        return res.status(400).json({ error: 'Missing htmlContent or keyword in request body' });
    }

    try {
        // --- Analysis Logic ---
        console.log(`Analyzing HTML (${htmlContent.length} chars) for keyword: "${keyword}"`);
        const $ = cheerio.load(htmlContent);

        const checks = [];
        const recommendations = [];
        let score = 0;
        const maxScore = 100; // Base score calculation on 100 points

        // --- Define Weights ---
        const weights = {
            doctype: 2,
            viewport: 2,
            titlePresence: 5,
            titleLength: 3,
            keywordInTitle: 8,
            metaDescriptionPresence: 5,
            metaDescriptionLength: 3,
            keywordInMetaDescription: 7,
            h1Presence: 6,
            keywordInH1: 7,
            headerHierarchy: 4,
            keywordInFirstParagraph: 6,
            contentLength: 5,
            imageAltTextPresence: 5,
            keywordInAltText: 4,
            linksInternal: 3, // Simplified check
            linksExternal: 3, // Simplified check
            keywordDensity: 5,
            canonical: 3,
            schemaMarkup: 4,
        };

        // **Technical Basics**
        const doctype = $.root().html().toLowerCase().startsWith('<!doctype html>');
        if (doctype) {
            checks.push({ factor: "DOCTYPE Presence", result: "Pass", details: "<!DOCTYPE html> found." });
            score += weights.doctype;
        } else {
            checks.push({ factor: "DOCTYPE Presence", result: "Fail", details: "<!DOCTYPE html> declaration missing or incorrect." });
            recommendations.push("Add the <!DOCTYPE html> declaration at the very beginning of your HTML document.");
        }

        const viewport = $('meta[name="viewport"]').length > 0;
        if (viewport) {
            checks.push({ factor: "Viewport Meta Tag", result: "Pass", details: '<meta name="viewport"> found.' });
            score += weights.viewport;
        } else {
            checks.push({ factor: "Viewport Meta Tag", result: "Fail", details: '<meta name="viewport"> tag is missing.' });
            recommendations.push('Add a <meta name="viewport" content="width=device-width, initial-scale=1.0"> tag to the <head> for mobile responsiveness.');
        }

        const canonical = $('link[rel="canonical"]').length > 0;
        if (canonical) {
            checks.push({ factor: "Canonical Tag", result: "Pass", details: '<link rel="canonical"> found.' });
            score += weights.canonical;
        } else {
            checks.push({ factor: "Canonical Tag", result: "Warning", details: '<link rel="canonical"> tag is missing.' });
            recommendations.push('Consider adding a <link rel="canonical" href="YOUR_PREFERRED_URL"> tag to the <head> to specify the preferred version of this page, especially if content might be duplicated.');
        }

        const schemaMarkup = $('script[type="application/ld+json"]').length > 0;
         if (schemaMarkup) {
            checks.push({ factor: "Schema Markup (JSON-LD)", result: "Pass", details: '<script type="application/ld+json"> found.' });
            score += weights.schemaMarkup;
        } else {
            checks.push({ factor: "Schema Markup (JSON-LD)", result: "Warning", details: 'No <script type="application/ld+json"> tags found.' });
            recommendations.push('Consider adding Schema.org markup using JSON-LD to help search engines understand your content structure (e.g., for articles, products, events).');
        }

        // **Title Tag**
        const titleTag = $('title');
        const titleText = titleTag.text().trim();
        if (titleTag.length > 0 && titleText) {
            checks.push({ factor: "Title Tag Presence", result: "Pass", details: `Title found: "${titleText}"` });
            score += weights.titlePresence;

            // Title Length
            if (titleText.length >= 50 && titleText.length <= 60) {
                checks.push({ factor: "Title Length", result: "Pass", details: `Length is ${titleText.length} characters (optimal).` });
                score += weights.titleLength;
            } else if (titleText.length > 60) {
                checks.push({ factor: "Title Length", result: "Warning", details: `Length is ${titleText.length} characters (too long, may be truncated). Aim for 50-60.` });
                recommendations.push(`Shorten your title tag to 50-60 characters. Current length: ${titleText.length}.`);
            } else { // < 50
                 checks.push({ factor: "Title Length", result: "Warning", details: `Length is ${titleText.length} characters (short). Aim for 50-60.` });
                 recommendations.push(`Consider lengthening your title tag to 50-60 characters for better visibility. Current length: ${titleText.length}.`);
            }

            // Keyword in Title
            if (includesKeyword(titleText, keyword)) {
                checks.push({ factor: "Keyword in Title", result: "Pass", details: `Keyword "${keyword}" found in title.` });
                score += weights.keywordInTitle;
            } else {
                checks.push({ factor: "Keyword in Title", result: "Fail", details: `Keyword "${keyword}" not found in title.` });
                recommendations.push(`Include your primary keyword "${keyword}" in the <title> tag.`);
            }
        } else {
            checks.push({ factor: "Title Tag Presence", result: "Fail", details: "No <title> tag found or it is empty." });
            recommendations.push("Add a descriptive <title> tag within the <head> section.");
            checks.push({ factor: "Title Length", result: "Fail", details: "Cannot assess length without a title." });
            checks.push({ factor: "Keyword in Title", result: "Fail", details: "Cannot assess keyword without a title." });
        }

        // **Meta Description**
        const metaDescriptionTag = $('meta[name="description"]');
        const metaDescriptionText = metaDescriptionTag.attr('content')?.trim() || '';
        if (metaDescriptionTag.length > 0 && metaDescriptionText) {
             checks.push({ factor: "Meta Description Presence", result: "Pass", details: `Meta description found.` });
             score += weights.metaDescriptionPresence;

             // Meta Description Length
             if (metaDescriptionText.length >= 150 && metaDescriptionText.length <= 160) {
                 checks.push({ factor: "Meta Description Length", result: "Pass", details: `Length is ${metaDescriptionText.length} characters (optimal).` });
                 score += weights.metaDescriptionLength;
             } else if (metaDescriptionText.length > 160) {
                 checks.push({ factor: "Meta Description Length", result: "Warning", details: `Length is ${metaDescriptionText.length} characters (too long, may be truncated). Aim for 150-160.` });
                 recommendations.push(`Shorten your meta description to 150-160 characters. Current length: ${metaDescriptionText.length}.`);
             } else { // < 150
                 checks.push({ factor: "Meta Description Length", result: "Warning", details: `Length is ${metaDescriptionText.length} characters (short). Aim for 150-160.` });
                 recommendations.push(`Consider lengthening your meta description to 150-160 characters. Current length: ${metaDescriptionText.length}.`);
             }

             // Keyword in Meta Description
             if (includesKeyword(metaDescriptionText, keyword)) {
                 checks.push({ factor: "Keyword in Meta Description", result: "Pass", details: `Keyword "${keyword}" found in meta description.` });
                 score += weights.keywordInMetaDescription;
             } else {
                 checks.push({ factor: "Keyword in Meta Description", result: "Fail", details: `Keyword "${keyword}" not found in meta description.` });
                 recommendations.push(`Include your primary keyword "${keyword}" in the meta description.`);
             }
        } else {
            checks.push({ factor: "Meta Description Presence", result: "Fail", details: 'No <meta name="description"> tag found or content is empty.' });
            recommendations.push('Add a compelling <meta name="description"> tag within the <head> section.');
            checks.push({ factor: "Meta Description Length", result: "Fail", details: "Cannot assess length without a meta description." });
            checks.push({ factor: "Keyword in Meta Description", result: "Fail", details: "Cannot assess keyword without a meta description." });
        }

        // **H1 Tag**
        const h1Tags = $('h1');
        if (h1Tags.length === 1) {
            const h1Text = h1Tags.first().text().trim();
            checks.push({ factor: "H1 Tag Presence", result: "Pass", details: `Exactly one H1 tag found: "${h1Text}"` });
            score += weights.h1Presence;

            // Keyword in H1
            if (includesKeyword(h1Text, keyword)) {
                checks.push({ factor: "Keyword in H1", result: "Pass", details: `Keyword "${keyword}" found in H1.` });
                score += weights.keywordInH1;
            } else {
                checks.push({ factor: "Keyword in H1", result: "Fail", details: `Keyword "${keyword}" not found in H1.` });
                recommendations.push(`Include your primary keyword "${keyword}" in the main H1 heading.`);
            }
        } else if (h1Tags.length === 0) {
            checks.push({ factor: "H1 Tag Presence", result: "Fail", details: "No H1 tag found." });
            recommendations.push("Add one (and only one) H1 tag to represent the main heading of your page.");
            checks.push({ factor: "Keyword in H1", result: "Fail", details: "Cannot assess keyword without an H1." });
        } else { // > 1
            checks.push({ factor: "H1 Tag Presence", result: "Fail", details: `Found ${h1Tags.length} H1 tags. Only one should be used.` });
            recommendations.push("Use only one H1 tag per page for the main heading. Convert other H1s to H2s or lower.");
             checks.push({ factor: "Keyword in H1", result: "Fail", details: "Cannot reliably assess keyword with multiple H1s." });
        }

        // **Header Hierarchy**
        let hierarchyValid = true;
        let lastLevel = 1; // Start assuming H1 exists or should exist
        $('h1, h2, h3, h4, h5, h6').each((i, el) => {
            const currentLevel = parseInt(el.tagName.substring(1));
            if (currentLevel > lastLevel + 1) {
                hierarchyValid = false;
                checks.push({ factor: "Header Hierarchy", result: "Fail", details: `Skipped header level: Found <${el.tagName}> after level H${lastLevel}.` });
                recommendations.push(`Ensure header tags follow a logical hierarchy (H1 > H2 > H3...). Avoid skipping levels, like using an H3 directly after an H1.`);
                return false; // Stop checking hierarchy on first error
            }
            lastLevel = currentLevel;
        });
        if (hierarchyValid && checks.findIndex(c => c.factor === "Header Hierarchy") === -1) { // Only add Pass if no Fail was added
             checks.push({ factor: "Header Hierarchy", result: "Pass", details: "Header tags follow a logical hierarchy." });
             score += weights.headerHierarchy;
        } else if (!hierarchyValid) {
             // Fail/recommendation already added in the loop
        } else { // hierarchyValid is true, but no headers found at all
             checks.push({ factor: "Header Hierarchy", result: "Warning", details: "No header tags (H1-H6) found to assess hierarchy." });
             recommendations.push("Use header tags (H1-H6) to structure your content logically.");
        }


        // **Content Analysis**
        const bodyText = getCleanText($, 'body'); // Consider refining selector if needed
        const words = bodyText.split(/\s+/).filter(Boolean); // Split by whitespace, remove empty strings
        const wordCount = words.length;

        // Content Length
        const minWordCount = 500;
        if (wordCount >= minWordCount) {
            checks.push({ factor: "Content Length", result: "Pass", details: `Word count is ${wordCount} (meets minimum of ${minWordCount}).` });
            score += weights.contentLength;
        } else {
            checks.push({ factor: "Content Length", result: "Warning", details: `Word count is ${wordCount} (below recommended minimum of ${minWordCount}).` });
            recommendations.push(`Consider expanding your content. Aim for at least ${minWordCount} words for better SEO potential. Current count: ${wordCount}.`);
        }

        // Keyword in First Paragraph (approx first 100 words)
        const first100Words = words.slice(0, 100).join(' ');
        if (includesKeyword(first100Words, keyword)) {
             checks.push({ factor: "Keyword in First ~100 Words", result: "Pass", details: `Keyword "${keyword}" found early in the content.` });
             score += weights.keywordInFirstParagraph;
        } else {
             checks.push({ factor: "Keyword in First ~100 Words", result: "Warning", details: `Keyword "${keyword}" not found in the first ~100 words.` });
             recommendations.push(`Try to include your primary keyword "${keyword}" naturally near the beginning of your main content.`);
        }

        // Keyword Density
        let keywordCount = 0;
        const keywordLower = keyword.toLowerCase();
        words.forEach(word => {
            // Basic check: exact match after lowercasing and removing basic punctuation
            if (word.toLowerCase().replace(/[.,!?;:]$/, '') === keywordLower) {
                keywordCount++;
            }
        });
        const density = wordCount > 0 ? (keywordCount / wordCount) * 100 : 0;
        if (density >= 1 && density <= 3) {
             checks.push({ factor: "Keyword Density", result: "Pass", details: `Density is ${density.toFixed(2)}% (within 1-3% range).` });
             score += weights.keywordDensity;
        } else if (density > 3) {
             checks.push({ factor: "Keyword Density", result: "Warning", details: `Density is ${density.toFixed(2)}% (potentially high, risk of stuffing). Aim for 1-3%.` });
             recommendations.push(`Keyword density is high (${density.toFixed(2)}%). Ensure the keyword usage sounds natural and avoid "keyword stuffing".`);
        } else { // < 1
             checks.push({ factor: "Keyword Density", result: "Warning", details: `Density is ${density.toFixed(2)}% (low). Aim for 1-3%.` });
             recommendations.push(`Keyword density is low (${density.toFixed(2)}%). Consider naturally incorporating "${keyword}" a few more times if appropriate.`);
        }


        // **Images**
        const images = $('img');
        let allAltsPresent = true;
        let keywordInAlt = false;
        if (images.length > 0) {
            images.each((i, img) => {
                const altText = $(img).attr('alt')?.trim();
                if (!altText) {
                    allAltsPresent = false;
                    const imgSrc = $(img).attr('src') || '[unknown source]';
                    checks.push({ factor: "Image Alt Text", result: "Fail", details: `Image missing alt text: src="${imgSrc.substring(0, 50)}..."` });
                    recommendations.push(`Add descriptive alt text to all images. Missing for: ${imgSrc.substring(0, 50)}...`);
                    // Don't stop checking other images, but mark overall as fail
                } else {
                    if (includesKeyword(altText, keyword)) {
                        keywordInAlt = true;
                    }
                }
            });

            if (allAltsPresent && checks.findIndex(c => c.factor === "Image Alt Text" && c.result === "Fail") === -1) {
                 checks.push({ factor: "Image Alt Text Presence", result: "Pass", details: "All images have alt text." });
                 score += weights.imageAltTextPresence;
            } else if (!allAltsPresent) {
                 // Fail message already added
                 checks.push({ factor: "Image Alt Text Presence", result: "Fail", details: "One or more images are missing alt text." }); // Summary check
            }

            // Keyword in Alt Text (Check only if all alts were present)
             if (keywordInAlt) {
                 checks.push({ factor: "Keyword in Alt Text", result: "Pass", details: `Keyword "${keyword}" found in at least one alt text.` });
                 score += weights.keywordInAltText;
             } else {
                 checks.push({ factor: "Keyword in Alt Text", result: "Warning", details: `Keyword "${keyword}" not found in any alt text.` });
                 recommendations.push(`Consider including the keyword "${keyword}" in the alt text of relevant images, if it accurately describes the image.`);
             }

        } else {
            checks.push({ factor: "Image Alt Text Presence", result: "Pass", details: "No images found on page." }); // Or N/A? Pass seems ok.
             score += weights.imageAltTextPresence; // Give points if no images
             checks.push({ factor: "Keyword in Alt Text", result: "Pass", details: "No images to check for keyword." });
             score += weights.keywordInAltText; // Give points if no images
        }


        // **Links** (Simplified for HTML input only)
        const links = $('a');
        let hasAbsoluteLink = false;
        if (links.length > 0) {
            checks.push({ factor: "Links Presence", result: "Pass", details: `Found ${links.length} link(s) (<a> tags).` });
            score += weights.linksInternal; // Use internal weight for general presence

            links.each((i, link) => {
                const href = $(link).attr('href');
                if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
                    hasAbsoluteLink = true;
                    return false; // Stop checking once one absolute link is found
                }
            });

            if (hasAbsoluteLink) {
                 checks.push({ factor: "External Links", result: "Pass", details: "At least one absolute link (likely external) found." });
                 score += weights.linksExternal;
            } else {
                 checks.push({ factor: "External Links", result: "Warning", details: "No absolute links (starting with http/https) found." });
                 recommendations.push("Consider adding links to relevant, authoritative external resources where appropriate.");
            }
        } else {
            checks.push({ factor: "Links Presence", result: "Warning", details: "No links (<a> tags) found." });
            recommendations.push("Consider adding relevant internal and external links to your content.");
            checks.push({ factor: "External Links", result: "Warning", details: "No links found to check for external ones." });
        }


        // --- Final Score Calculation ---
        // Normalize score to 0-100 range based on weights achieved vs total possible
        let totalPossibleWeight = 0;
        for (const key in weights) {
            totalPossibleWeight += weights[key];
        }
        const finalScore = Math.round((score / totalPossibleWeight) * 100);


        const analysisResults = {
            score: finalScore,
            checks: checks,
            recommendations: recommendations
        };

        console.log("Analysis complete");
        res.json(analysisResults);

    } catch (error) {
        console.error("Error during analysis:", error);
        // Ensure $ is not leaked in error message if parsing failed early
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.status(500).json({ error: 'Failed to analyze HTML content.', details: errorMessage });
        res.status(500).json({ error: 'Failed to analyze HTML content.', details: error.message });
    }
});

// POST /optimize
// Generates optimization suggestions using Gemini
app.post('/optimize', async (req, res) => {
    console.log("Received /optimize request");
    const { htmlContent, keyword } = req.body;

    if (!genAI) {
        return res.status(503).json({ error: 'Gemini API not configured. Missing API key.' });
    }
    if (!htmlContent || !keyword) {
        return res.status(400).json({ error: 'Missing htmlContent or keyword in request body' });
    }

    try {
        // --- Gemini Interaction ---
        console.log(`Optimizing for keyword: "${keyword}" using Gemini...`);
        const $ = cheerio.load(htmlContent);
        const currentTitle = $('title').text().trim();
        const currentMetaDescription = $('meta[name="description"]').attr('content')?.trim() || '';
        const h1Text = $('h1').first().text().trim(); // Get H1 for context
        // Optional: Get first paragraph for more context
        const firstParagraph = $('p').first().text().trim().substring(0, 200); // Limit context size

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-latest" }); // Use latest recommended model

        // --- Prompts for Gemini ---
        const titlePrompt = `Generate an SEO-optimized title tag for a web page.
        - Primary Keyword: "${keyword}"
        - Current Title: "${currentTitle}"
        - Main Heading (H1): "${h1Text}"
        - Constraints: Include the keyword naturally. Aim for 50-60 characters. Be compelling and relevant.
        - Output only the suggested title text, nothing else.`;

        const metaDescriptionPrompt = `Generate an SEO-optimized meta description for a web page.
        - Primary Keyword: "${keyword}"
        - Current Title: "${currentTitle}"
        - Current Meta Description: "${currentMetaDescription}"
        - Main Heading (H1): "${h1Text}"
        - First Paragraph Snippet: "${firstParagraph}..."
        - Constraints: Include the keyword naturally. Aim for 150-160 characters. Write compelling text that encourages clicks.
        - Output only the suggested meta description text, nothing else.`;

        // --- Call Gemini API Concurrently ---
        console.log("Sending requests to Gemini API...");
        const [titleResult, metaDescriptionResult] = await Promise.all([
            model.generateContent(titlePrompt),
            model.generateContent(metaDescriptionPrompt)
        ]);
        console.log("Received responses from Gemini API.");

        // --- Extract Suggestions ---
        const suggestedTitle = extractGeminiText(titleResult);
        const suggestedMetaDescription = extractGeminiText(metaDescriptionResult);

        // Check if either suggestion failed
        if (!suggestedTitle || !suggestedMetaDescription) {
             console.error("Failed to extract text from one or both Gemini responses.");
             // Provide partial results if possible, or a general error
             const suggestions = {
                 suggestedTitle: suggestedTitle || "Error generating title suggestion.",
                 suggestedMetaDescription: suggestedMetaDescription || "Error generating meta description suggestion."
             };
             // Decide if this should be a 500 error or just return error messages in the suggestions
             return res.status(500).json({ error: 'Failed to generate one or more suggestions from Gemini.', suggestions });
        }


        const suggestions = {
            suggestedTitle: suggestedTitle,
            suggestedMetaDescription: suggestedMetaDescription
        };

        console.log("Optimization suggestions generated successfully.");
        res.json(suggestions);

    } catch (error) {
        console.error("Error during optimization with Gemini:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        // Check for specific API errors if needed
        res.status(500).json({ error: 'Failed to generate optimization suggestions via Gemini.', details: errorMessage });
    }
});

// --- Server Start ---
app.listen(port, () => {
    console.log(`SEO Grader backend listening at http://localhost:${port}`);
});

// --- Basic Error Handling ---
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});