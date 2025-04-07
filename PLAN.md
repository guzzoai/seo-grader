# SEO Grader & Optimizer: Design & Implementation Plan (Revised - HTML Input Only)

**1. Project Goal:**
Develop a web application for developers to analyze and optimize the on-page SEO of their blog posts/web content by **pasting raw HTML code**. The app will provide a score, detailed feedback, and AI-powered suggestions for title and meta description optimization.

**2. Target User:**
Developers seeking quick, reliable SEO checks and improvements for technical content via HTML input.

**3. Core Functionality (MVP Scope):**

*   **Input:**
    *   Text area for **raw HTML input**.
    *   **Mandatory** input field for the primary keyword focus.
*   **Content Parsing & Extraction:**
    *   Use the provided raw HTML directly.
    *   Parse HTML using a robust library (e.g., Cheerio for Node.js, BeautifulSoup for Python). Handle potential parsing errors gracefully.
    *   Extract: `<!DOCTYPE>`, `<title>`, `<meta name="description">`, `<h1>` (count & content), `<h2>`-`<h6>` (hierarchy check), body text (for length, keyword presence), `<img>` (alt attributes), `<a>` (internal/external count), `<link rel="canonical">`.
*   **SEO Analysis Engine:** (Checks remain the same as previous plan, applied to the parsed HTML)
    *   **Keyword Focus (User-provided Primary Keyword):**
        *   Presence in `<title>`.
        *   Presence in `<meta name="description">`.
        *   Presence in `<h1>`.
        *   Presence in first ~100 words of body content.
        *   Presence in any `<img>` alt text.
        *   *Keyword Density:* Basic check (e.g., 1-3%).
    *   **Content Structure & Readability:**
        *   *Title Tag:* Presence, length (50-60 chars).
        *   *Meta Description:* Presence, length (150-160 chars).
        *   *H1 Tag:* Exactly one present.
        *   *Header Hierarchy:* Logical sequence check.
        *   *Content Length:* Minimum threshold (e.g., 500 words).
        *   *Readability:* Basic score (e.g., Flesch-Kincaid).
        *   *Paragraph/Sentence Length:* Basic checks.
    *   **Links:**
        *   *Internal Links:* Presence (>0). (Note: Distinction requires base URL context, which isn't available. Might simplify to just check for *any* `<a>` tags or relative vs absolute paths). *Let's simplify to checking for presence of `<a>` tags for MVP.*
        *   *External Links:* Presence (>0). *Simplified to checking for `<a>` tags with absolute URLs (http/https) for MVP.*
    *   **Images:**
        *   *Alt Text:* Check all `<img>` for non-empty `alt`.
    *   **Technical Basics:**
        *   `<!DOCTYPE html>` presence.
        *   `<meta name="viewport" ...>` presence.
        *   *Canonical Tag:* Check for presence.
        *   *Schema Markup:* Basic check for `<script type="application/ld+json">` presence.
*   **Scoring Mechanism:**
    *   Weighted system (0-100). Document weights.
*   **Feedback & Recommendations:**
    *   Display overall score.
    *   Detailed checklist (Pass/Fail/Warning).
    *   Actionable advice.
*   **Auto-Optimization Feature (Gemini - MVP Focus):**
    *   "Suggest Optimizations" button.
    *   **Gemini API Integration:** Generate improved `<title>` and `<meta name="description">` suggestions based on HTML content and keyword.
    *   **Presentation:** Display original vs. suggested. Allow copying. Emphasize review.

**4. Architecture Overview (Simplified):**

```mermaid
graph LR
    A[User Browser (Frontend)] -- Input (HTML, Keyword) --> B(Backend API);
    B -- Parse HTML --> D[SEO Analysis Engine];
    D -- Analysis Results --> B;
    B -- Generate Feedback & Score --> A;
    A -- Request Optimization --> B;
    B -- Content Snippets + Keyword --> E[Gemini API Service];
    E -- Title/Meta Suggestions --> B;
    B -- Optimization Suggestions --> A;

    subgraph Backend
        B
        D
        E
    end
```
*(Removed Target Website and Fetch Request)*

**5. Proposed Technology Stack:** (Remains the same, but no HTTP Client needed for fetching external URLs)
*   **Frontend:** React, Vue, Svelte, or vanilla JS.
*   **Backend:** Node.js (Express/Fastify) or Python (Flask/Django).
*   **HTML Parsing:** Cheerio (Node.js) or BeautifulSoup (Python).
*   **Gemini API:** Google AI SDK.
*   **Readability Score:** Relevant library.

**6. Data Flow (Simplified):**

1.  User enters HTML and Keyword in Frontend.
2.  Frontend sends data to Backend API (`/analyze` endpoint).
3.  Backend parses HTML.
4.  Backend runs SEO Analysis Engine rules.
5.  Backend calculates score.
6.  Backend formats results and sends back to Frontend.
7.  Frontend displays results.
8.  User clicks "Suggest Optimizations".
9.  Frontend sends relevant content snippets and keyword to Backend API (`/optimize` endpoint).
10. Backend constructs prompts for Gemini API.
11. Backend calls Gemini API.
12. Backend receives suggestions and sends them to Frontend.
13. Frontend displays suggestions.

**7. Key Considerations & Challenges:** (URL Fetching challenges removed)
*   **HTML Parsing Edge Cases:** Handling malformed HTML.
*   **Gemini API:** Prompt Engineering, Key Management, Rate Limits/Costs, Latency.
*   **Scoring Logic:** Balancing weights, transparency.
*   **Security:** Sanitize user-provided HTML if ever processed in an unsafe way (though direct rendering is unlikely). Protect API endpoints.
*   **Link Analysis Limitation:** Without a base URL, distinguishing internal/external links is heuristic (relative vs absolute path). *Decision: Check for any `<a>` and absolute `<a>`.*

**8. Future Enhancements (Post-MVP):** (URL input could be added back here)
*   Adding URL input functionality.
*   Advanced Keyword Analysis.
*   JS Rendering support (if URL input added).
*   Schema analysis/generation.
*   Alt Text generation.
*   Readability suggestions.
*   User accounts/history.