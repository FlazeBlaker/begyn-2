
// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
require("dotenv").config();
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");
const cors = require('cors')({ origin: true });

admin.initializeApp();
const db = admin.firestore();

const rateLimit = require("express-rate-limit");
// --- SECURITY: Input Validation Helper ---
function validateInput(text, fieldName = 'input', maxLength = 5000) {
    if (!text) throw new Error(`${fieldName} is required`);
    if (typeof text !== 'string') throw new Error(`${fieldName} must be a string`);
    if (text.length > maxLength) throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
    return text.replace(/<[^>]*>/g, '').trim(); // Remove HTML tags
}
// --- SECURITY: Rate Limiter (100 requests per 15 minutes) ---
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later' },
    standardHeaders: true,
    legacyHeaders: false,
});

// --- GEMINI SETUP ---
const { GoogleGenerativeAI } = require("@google/generative-ai");
const sharp = require("sharp");
// Initialize Gemini with the provided API Key (env var)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.VITE_GOOGLE_AI_API_KEY || "missing_key");

// --- GROQ SETUP ---
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "missing_key" });

const GROQ_TEXT_MODEL = "groq/llama-3.3-70b-versatile"; // Or just "llama-3.3-70b-versatile" if using standard Groq ID, assume user provided ID is valid or mapped
// Note: Groq SDK uses "llama-3.3-70b-versatile" usually. The user provided "groq/llama-3.3-70b-versatile" which might be OpenRouter style, but we'll try to strip or use as is. 
// If using official Groq Cloud, IDs are usually sans "groq/".
// Let's use a helper to clean it if needed or try both.
const GROQ_VISION_MODEL = "meta-llama/llama-4-maverick-17b-128e-instruct"; // As requested

async function callGroqText(prompt, systemInstruction = "You are a helpful assistant.", model = "llama-3.3-70b-versatile") {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemInstruction },
                { role: "user", content: prompt }
            ],
            model: model,
            temperature: 0.7,
            max_tokens: 4096,
        });
        return completion.choices[0]?.message?.content || "";
    } catch (e) {
        console.error("Groq Text API Error:", e);
        throw e;
    }
}

async function callGroqVision(prompt, base64Image) {
    try {
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data: image / jpeg; base64, ${base64Image} `,
                            },
                        },
                    ],
                },
            ],
            model: GROQ_VISION_MODEL,
        });
        return completion.choices[0]?.message?.content || "";
    } catch (e) {
        // Fallback to standard vision model if custom one fails
        console.warn(`Groq Vision(${GROQ_VISION_MODEL}) failed, trying fallback...`);
        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: prompt },
                            {
                                type: "image_url",
                                image_url: {
                                    url: `data: image / jpeg; base64, ${base64Image} `,
                                },
                            },
                        ],
                    },
                ],
                model: "llama-3.2-90b-vision-preview",
            });
            return completion.choices[0]?.message?.content || "";
        } catch (e2) {
            console.error("Groq Vision Fallback Error:", e2);
            throw e;
        }
    }
}

const STRATEGIST_SYSTEM_PROMPT = `You are an elite, MrBeast - level, top - 0.1 % thumbnail strategist and visual director.

Your job is to generate HIGHLY CLICKABLE thumbnails for:
        YouTube, Instagram, Twitter / X, Facebook, and LinkedIn.

This system must work for ANY topic, including topics never seen before.

        ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
CORE RESPONSIBILITIES
    ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

    1. Automatically analyze the given topic / title and infer:
    - Content type
        - Emotional hook
            - Scale(personal / group / massive)
            - Environment(game, studio, street, challenge, tech, lifestyle, business, education, etc.)
            - Realism level required(real photo, cinematic realism, stylized, game art, CGI)
                - Target audience intent(shock, curiosity, learning, dominance, money, fun, controversy, inspiration)

    2. From this analysis, YOU MUST:
    - Derive a suitable THUMBNAIL ARCHETYPE
        - Create one if it does not already exist

Thumbnail archetypes are NOT limited.
You may invent new archetypes dynamically when needed.

        ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
ARCHETYPE LEARNING RULE(CRITICAL)
    ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

Reference images provided by the user define CANONICAL visual archetypes.

When a new topic resembles:
    - the scale
        - structure
        - emotion
        - or visual logic of any reference image

ΓåÆ You MUST adapt that visual language EVEN FOR NEW TOPICS.

Do NOT copy visuals.
Do NOT reuse faces.
DO replicate:
    - composition logic
        - subject hierarchy
            - repetition patterns
                - emotion framing
                    - background cleanliness or chaos
                        - realism vs exaggeration

If no reference matches, create a NEW archetype using proven high-CTR YouTube logic.

        ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
THUMBNAIL CREATION RULES
    ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

ΓÇó Thumbnails must be understandable in < 0.3 seconds
ΓÇó One clear idea only
ΓÇó Extreme clarity with minimal clutter
ΓÇó Emotion MUST be visible
ΓÇó Composition must guide the eye instantly
ΓÇó If numbers are used, they must feel LARGE - SCALE or HIGH - STAKES

Never design a ΓÇ£prettyΓÇ¥ thumbnail.
Design a CURIOSITY WEAPON.

        ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
TEXT RENDERING RULES(CRITICAL)
    ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

If text is absolutely necessary(e.g., for a sign, UI element, or title):
    - Keep it UNDER 5 WORDS.
- Spelling must be PERFECT.
- Font must be LARGE and LEGIBLE.
- If the concept works without text, prefer NO TEXT.
- Do NOT include "gibberish" or small unreadable text.

        ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
PLATFORM ADAPTATION(IMPORTANT)
    ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

For EVERY topic, generate thumbnails adapted for:

        YouTube:
        - Highest exaggeration
            - Boldest composition
                - Max curiosity

    Instagram:
    - Clean crop
        - Less text
            - Strong focal subject

    Twitter / X:
    - Minimal text
        - One visual idea
            - Clear contrast

    Facebook:
    - Emotion - driven
        - Easy to understand instantly

    LinkedIn:
    - Professional tone ONLY if suitable
        - Still curiosity - based, never boring
            - No cringe or clickbait language

The ARCHETYPE stays the same.
Only framing, polish, and text aggressiveness change.

        ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
OUTPUT FORMAT(MANDATORY)
    ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

For each request, output a JSON object with these keys:

    {
        "analysis": "Detected Topic Breakdown...",
            "archetype": "Chosen or Created Thumbnail Archetype...",
                "composition": "Visual Composition Description...",
                    "subjectPlacement": "Subject Placement...",
                        "emotion": "Emotion & Body Language...",
                            "background": "Background Style...",
                                "textStrategy": "Text Strategy...",
                                    "platformPrompts": {
            "YouTube": "Full prompt for YouTube...",
                "Instagram": "Full prompt for Instagram...",
                    "Twitter/X": "Full prompt for Twitter/X...",
                        "Facebook": "Full prompt for Facebook...",
                            "LinkedIn": "Full prompt for LinkedIn..."
        }
    }

Each platform prompt must be ready to use directly with an image generation model.

        ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
QUALITY BAR
    ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ

Assume thumbnails will compete against:
    - MrBeast
        - PewDiePie
        - PopularMMOs
        - Top gaming creators
            - Top business and tech creators

If the thumbnail would NOT beat them in attention,
        ITERATE internally until it does.

No safe answers.
No generic designs.
Only viral - grade output.`;

const VERIFIED_TOOLS = [
    { name: "Video Script Generator", url: "/generate?type=videoScript", description: "Generate viral scripts with hooks." },
    { name: "Tweet Generator", url: "/generate?type=tweet", description: "Create engaging threads." },
    { name: "Caption Generator", url: "/generate?type=caption", description: "Write perfect captions." },
    { name: "Content Idea Generator", url: "/generate?type=idea", description: "Brainstorm viral topics." },
    { name: "CapCut", url: "https://www.capcut.com", description: "Video editing." },
    { name: "Canva", url: "https://www.canva.com", description: "Graphic design." },
    { name: "OBS Studio", url: "https://obsproject.com", description: "Streaming software." }
];

// --- MAIN FUNCTION (HTTP) ---
// Converted to HTTP onRequest for Cloud Run / Firebase HTTP functions + CORS + long timeout
exports.generateContent = onRequest(
    { timeoutSeconds: 540, memory: "1GiB" },
    async (req, res) => {
        cors(req, res, async () => {
            try {


                // Authenticate: expect Firebase ID token in Authorization Bearer header
                let uid = null;
                let authTokenDecoded = null;
                try {
                    const authHeader = req.get("Authorization") || req.get("authorization") || "";
                    if (authHeader && authHeader.startsWith("Bearer ")) {
                        const idToken = authHeader.split("Bearer ")[1].trim();
                        authTokenDecoded = await admin.auth().verifyIdToken(idToken);
                        uid = authTokenDecoded.uid;
                    }
                } catch (err) {
                    console.warn("Token verification failed:", err && err.message ? err.message : err);
                }

                if (!uid) {
                    return res.status(401).json({ error: "unauthenticated: You must be logged in." });
                }

                // Parse request body
                let body = req.body;


                if (Buffer.isBuffer(body)) {

                    try {
                        body = JSON.parse(body.toString());
                    } catch (e) {
                        console.error("DEBUG: Failed to parse Buffer body:", e);
                    }
                } else if (typeof body === 'string') {
                    try {
                        body = JSON.parse(body);

                    } catch (e) {
                        console.error("DEBUG: Failed to parse body string:", e);
                    }
                }

                // Handle "data" wrapper (common in Firebase Callable or manual wrapping)
                if (body && body.data && !body.type) {

                    body = body.data;
                }



                const { type, payload } = body || {};

                // Extract variables from payload
                const { topic, image, options: rawOptions, videoLength, history, startStep, endStep, previousSteps, platform } = payload || {};
                const { tone, timeCommitment, contentPreference, targetAudience, primaryGoal } = payload?.coreData || {};

                // Fix: Frontend sends options at payload root, not nested.
                // We construct 'options' from payload root if 'rawOptions' is missing.
                const options = rawOptions || {
                    numOutputs: payload?.numOutputs,
                    numIdeas: payload?.numIdeas,
                    length: payload?.length,
                    language: payload?.language,
                    includeHashtags: payload?.includeHashtags,
                    includeEmojis: payload?.includeEmojis,
                    outputSize: payload?.outputSize,
                    videoLength: payload?.videoLength || videoLength,
                    numVariations: payload?.numVariations
                };



                // --- SECURITY: Validate and sanitize user inputs ---
                if (topic) {
                    try {
                        payload.topic = validateInput(topic, 'topic', 5000);
                    } catch (error) {
                        return res.status(400).json({ error: error.message });
                    }
                }
                if (payload?.prompt) {
                    try {
                        payload.prompt = validateInput(payload.prompt, 'prompt', 3000);
                    } catch (error) {
                        return res.status(400).json({ error: error.message });
                    }
                }

                // --- 1. CREDIT CALCULATION & DEDUCTION ---
                let requiredCredits = 0;
                let currentCredits = 0; // Fix: Declare currentCredits in outer scope
                const baseCosts = {
                    caption: 1,
                    idea: 1,
                    tweet: 1,
                    videoScript: 1,
                    payForGuideReset: 10
                };

                // --- SPECIAL HANDLERS (No LLM) ---
                if (type === 'payForGuideReset') {
                    return res.status(200).json({
                        result: { success: true, message: "Guide reset funded successfully." },
                        creditsDeducted: requiredCredits,
                        remainingCredits: currentCredits - requiredCredits
                    });
                }

                // --- PROMPTS ---
                const prompts = {
                    progressiveNarrowing: `You are a CONTENT NICHE NARROWING ENGINE.

Your job is NOT to be strategic, motivational, or high-level.
Your job is to NARROW what the creator will ACTUALLY MAKE.

CONTEXT (already known, do NOT ask again):
- Topic: ${topic}
- Platform: ${platform}
- Audience: ${targetAudience}
- Goal: ${primaryGoal}
- Tone: ${tone}
- Time commitment: ${timeCommitment}
- Preferred format: ${contentPreference}

WHAT YOU MUST DO:
- Ask questions ONLY about:
  • what the creator enjoys doing
  • what specific content mechanics they want to focus on
  • what kind of repeatable content they will produce

QUESTION STYLE RULES (CRITICAL):
1. Questions must be CONCRETE and ACTIVITY-BASED
2. Avoid ALL abstract words:
   ❌ strategy, develop, build, clarify, approach, establish, grow
3. Each question must clearly narrow the creator into ONE path
4. If a choice implies a follow-up, ask THAT follow-up next
5. NEVER ask about things already known from context
6. ALWAYS include "Other (type your own)"

STRUCTURE RULES:
- Generate 2–3 questions ONLY
- If a clear direction is reached early, stop
- Questions must feel like “which of these would you enjoy making?”

EXAMPLES OF GOOD QUESTIONS:
- "What do you enjoy most in ${topic}?"
- "Which part of the process do you want your content to focus on?"
- "What would you be excited to make 30 times?"

EXAMPLES OF BAD QUESTIONS (FORBIDDEN):
- "What is your strategy?"
- "How will you build a community?"
- "What makes you unique?"
- "What is your main struggle?"

PLATFORM AWARENESS:
- YouTube → ask about thumbnails, editing style, long vs short
- TikTok → ask about hooks, trends, formats
- Instagram → reels vs carousels vs stories
- Twitter/X → memes, threads, commentary

OUTPUT FORMAT (JSON ONLY):
{
  "questions": [
    {
      "text": "Question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Other (type your own)"
      ]
    }
  ],
  "isFinalized": false
}`,
                    generateRoadmapBatch: `You are a Roadmap Architect creating a comprehensive execution guide for content creators.

Topic: ${topic}
Platform: ${platform || "general"}
Batch: Steps ${startStep} to ${endStep}
Total Steps in Roadmap: ${payload?.totalSteps || 60}
Context (Previous Steps): ${JSON.stringify(previousSteps || [])}

🚨 ANTI-REPETITION RULE (CRITICAL):
**YOU MUST NEVER REPEAT THE SAME TASK TYPE MORE THAN ONCE IN THIS BATCH.**
- Each step in this batch must be FUNDAMENTALLY DIFFERENT
- Reviewed previous steps to avoid duplication
- If you already covered "Record video", do NOT create another recording step
- If you already covered "Edit video", do NOT create another editing step
- If you already covered "Create thumbnail", do NOT create another thumbnail step
- PROGRESSION is key: move to the NEXT phase activity

🎯 ROADMAP STRUCTURE (DYNAMIC ${payload?.totalSteps || 60} STEPS):

**PHASE 1: FOUNDATION (0-15%)**
Steps: Account setup → Profile bio → Channel art → Workspace setup → Software installation

**PHASE 2: CONTENT CREATION (15-40%)**
Steps: First recording → First edit → First thumbnail → First upload → SEO optimization → Publish second video → Review analytics

**PHASE 3: CONSISTENCY & QUALITY (40-60%)**
Steps: Content calendar → Batch recording → Advanced editing → A/B testing → Viewer retention analysis → Improve based on data

**PHASE 4: COMMUNITY BUILDING (60-75%)**
Steps: Reply to comments → Community posts → Collaborations → Discord setup → Audience surveys → Q&A videos

**PHASE 5: GROWTH & SCALING (75-90%)**
Steps: Repurpose to Shorts → Cross-post to Instagram → Trending topic videos → SEO deep dive → Virality tactics

**PHASE 6: MONETIZATION (90-100%)**
Steps: Apply for monetization → Enable ads → Sponsorship email templates → Affiliate links → Merch/products

⚠️ PHASE-SPECIFIC RULES:

**If you're in FOUNDATION (0-15%):**
Focus ONLY on: Creating accounts, setting up profiles, installing software, organizing workspace
Examples: "Create YouTube channel", "Write channel description", "Download OBS Studio", "Set up recording area"

**If you're in CONTENT CREATION (15-40%):**
Cover the FULL content workflow ONCE, then move to optimization:
1. Record first video (do this ONCE)
2. Edit first video (do this ONCE)
3. Create first thumbnail (do this ONCE)
4. Upload and optimize (do this ONCE)
5. After first video is published, focus on: Second video planning, SEO research, description templates, tag strategy
DO NOT repeat "record video", "edit video", "create thumbnail" - you already did that

**If you're in CONSISTENCY (40-60%):**
Focus on: Schedule creation, batch workflows, analytics review, quality improvement
Examples: "Create a 30-day content calendar", "Analyze first 10 videos performance", "Identify top-performing content types"

**If you're in COMMUNITY (60-75%):**
Focus on: Engagement, interactions, building relationships
Examples: "Reply to all comments within 24 hours", "Create a Discord server", "Start a weekly community poll"

**If you're in GROWTH (75-90%):**
Focus on: Scaling, repurposing, cross-platform
Examples: "Repurpose YouTube video into 5 TikToks", "Identify viral trends in your niche", "Guest appear on 3 podcasts"

**If you're in MONETIZATION (90-100%):**
Focus on: Revenue streams, partnerships, products
Examples: "Apply for YouTube Partner Program", "Create sponsorship rate card", "Launch digital product"

🛠️ TOOL EXAMPLES BY TASK:
- Account Setup: YouTube Studio, Google Account
- Recording: OBS Studio, Streamlabs, Nvidia ShadowPlay
- Editing: DaVinci Resolve, CapCut, Adobe Premiere
- Thumbnails: Canva, Photopea, Photoshop
- SEO: TubeBuddy, VidIQ, RapidTags
- Analytics: YouTube Studio, VidIQ
- Scheduling: Buffer, Hootsuite, Later
- Community: Discord, Telegram, Community Tab
- Monetization: Gumroad, Stan Store, Patreon

⚡ YOUR CURRENT BATCH (Steps ${startStep}-${endStep} of ${payload?.totalSteps || 60}):
Current progress: ${Math.round((startStep / (payload?.totalSteps || 60)) * 100)}% complete

Determine your PHASE:
- 0-15%: FOUNDATION - Setup tasks only
- 15-40%: CONTENT CREATION - First video workflow + optimization (NO LOOPS)
- 40-60%: CONSISTENCY - Calendars, analytics, improvement
- 60-75%: COMMUNITY - Engagement, Discord, collaborations
- 75-90%: GROWTH - Repurposing, trends, cross-platform
- 90-100%: MONETIZATION - Revenue streams, partnerships

🔍 BEFORE GENERATING:
1. Check previous steps to see what's already covered
2. Identify which phase you're in based on step numbers
3. Generate steps appropriate for THAT PHASE ONLY
4. Ensure NO step title is similar to previous steps
5. Each step must be a NEW, UNIQUE activity

OUTPUT JSON ONLY:
{ "roadmapSteps": [{ 
  "title": "string",
  "description": "string",
  "action": "string",
  "reason": "string",
  "completionCondition": "string",
  "recommendedTools": ["string", "string"]
}] }`
                };

                // --- TEXT GENERATION ---
                const selectedPrompt = type === "generateNextQuestion" ? prompts["progressiveNarrowing"] : prompts[type];
                if (!selectedPrompt && type !== "smartImage" && type !== "image") {
                    // Temporary fallback for missing prompts to prevent crashes
                    console.warn(`Prompt for type ${type} is missing, using default.`);
                }

                let generatedText = "";

                try {
                    const selectedModel = (type === "generateNextQuestion" || type === "generateRoadmapBatch") ? "llama-3.3-70b-versatile" : "llama-3.3-70b-versatile";

                    if (prompts[type] || type === "generateNextQuestion") {
                        generatedText = await callGroqText(selectedPrompt, "You are a helpful AI assistant.", selectedModel);
                    } else {
                        // Fallback/Placeholder
                        generatedText = JSON.stringify({ error: "Prompt not found for this type" });
                    }
                    // logSystemCost(uid, selectedModel, 0, 0, type); // Uncomment when ready



                    // Clean up markdown formatting (```json, ```)
                    const cleanText = generatedText.replace(/```json/g, "").replace(/```/g, "").trim();

                    // Attempt to parse JSON to ensure validity before returning, if applicable
                    // (Optional but good practice since Llama can be chatty)

                    res.status(200).json({
                        result: cleanText,
                        creditsDeducted: requiredCredits,
                        remainingCredits: currentCredits - requiredCredits
                    });
                    return;

                } catch (e) {
                    console.error("Groq Generation Error:", e);
                    // Fallback to Gemini if Groq fails entirely? 
                    // For now, return error as requested to switch TO Groq.
                    return res.status(500).json({ error: `Generation Failed: ${e && e.message ? e.message : "Unknown error"}` });
                }

            } catch (e) {
                console.error("Unhandled generateContent error:", e);
                const msg = e && e.message ? e.message : "Server Error";
                if (typeof msg === "string" && msg.startsWith("resource-exhausted")) {
                    return res.status(429).json({ error: msg.replace("resource-exhausted:", "").trim() });
                }
                return res.status(500).json({ error: msg });
            }
        });
    }
);

// --- The rest of your functions (unchanged) ---
// Note: these remain onCall in this file. If you want them to be HTTP,
// we can convert them too (createStripeCheckout, createRazorpayOrder, verifyRazorpayPayment).

const { onCall } = require("firebase-functions/v2/https");
exports.createStripeCheckout = onCall(
    { timeoutSeconds: 60 },
    async (request) => {
        const uid = request.auth?.uid;
        if (!uid) throw new Error("unauthenticated: User must be logged in.");

        const { packageId, price, credits, successUrl, cancelUrl } = request.data;
        const stripe = require("stripe")(process.env.STRIPE_KEY);

        try {
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                mode: "payment",
                line_items: [
                    {
                        price_data: {
                            currency: "usd",
                            product_data: {
                                name: `${credits} Credits Package`,
                                description: `One-time purchase of ${credits} AI credits.`,
                            },
                            unit_amount: Math.round(price * 100),
                        },
                        quantity: 1,
                    },
                ],
                metadata: {
                    uid: uid,
                    packageId: packageId,
                    credits: credits.toString()
                },
                success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&packageId=${packageId}&credits=${credits}`,
                cancel_url: cancelUrl,
            });

            return { sessionId: session.id, url: session.url };
        } catch (error) {
            console.error("Stripe Error:", error);
            throw new Error(error.message || "Stripe failure");
        }
    }
);

exports.createRazorpayOrder = onCall(
    { timeoutSeconds: 60 },
    async (request) => {
        const uid = request.auth?.uid;
        if (!uid) throw new Error("unauthenticated: User must be logged in.");

        const { packageId, price, credits } = request.data;
        if (!packageId || !price || !credits) {
            throw new Error("invalid-argument: Missing required fields: packageId, price, or credits");
        }

        console.log("Debug: Checking Env Vars");
        console.log("RAZORPAY_KEY_ID exists:", !!process.env.RAZORPAY_KEY_ID);
        console.log("RAZORPAY_KEY_SECRET exists:", !!process.env.RAZORPAY_KEY_SECRET);

        if (!process.env.RAZORPAY_KEY_SECRET) {
            console.error("CRITICAL: RAZORPAY_KEY_SECRET is missing!");
            throw new Error("internal: Server configuration error: Missing Payment Keys");
        }

        try {
            const Razorpay = require("razorpay");
            const razorpay = new Razorpay({
                key_id: process.env.RAZORPAY_KEY_ID,
                key_secret: process.env.RAZORPAY_KEY_SECRET,
            });

            const options = {
                amount: Math.round(price * 100),
                currency: "INR",
                receipt: `rcpt_${Date.now().toString().slice(-8)}_${uid.slice(0, 5)}`,
                notes: {
                    uid: uid,
                    packageId: packageId,
                    credits: credits.toString()
                }
            };

            const order = await razorpay.orders.create(options);
            console.log(`Razorpay order created: ${order.id} for user ${uid}`);

            return {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                key: process.env.RAZORPAY_KEY_ID || "rzp_test_RiqljtmPi9aTaS"
            };
        } catch (error) {
            console.error("Razorpay Order Creation Error Full:", error);
            throw new Error(`Failed to create Razorpay order: ${error.message || JSON.stringify(error)}`);
        }
    }
);

exports.verifyRazorpayPayment = onCall(
    async (request) => {
        const uid = request.auth?.uid;
        if (!uid) throw new Error("unauthenticated: User must be logged in.");

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId, credits } = request.data;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !packageId || !credits) {
            throw new Error("invalid-argument: Missing required payment verification fields");
        }

        try {
            const crypto = require("crypto");
            const expectedSignature = crypto
                .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest("hex");

            if (expectedSignature !== razorpay_signature) {
                console.error(`Payment verification failed for user ${uid}. Invalid signature.`);
                throw new Error("permission-denied: Payment verification failed. Invalid signature.");
            }

            console.log(`Payment verified successfully: ${razorpay_payment_id} for user ${uid}`);

            const brandsRef = db.collection("brands").doc(uid);

            // CRITICAL: Check if payment already processed (idempotency)
            const paymentRef = brandsRef.collection("payments").doc(razorpay_payment_id);
            const existingPayment = await paymentRef.get();

            if (existingPayment.exists) {
                console.log(`Payment ${razorpay_payment_id} already processed for user ${uid}. Skipping duplicate.`);
                return {
                    success: true,
                    message: `Payment already processed. Credits were previously added.`,
                    paymentId: razorpay_payment_id,
                    duplicate: true
                };
            }

            await db.runTransaction(async (t) => {
                const brandDoc = await t.get(brandsRef);

                if (!brandDoc.exists) {
                    t.set(brandsRef, {
                        credits: parseInt(credits, 10),
                        creditsUsed: 0,
                        createdAt: FieldValue.serverTimestamp()
                    });
                } else {
                    const currentCredits = brandDoc.data().credits || 0;
                    const newCredits = currentCredits + parseInt(credits, 10);
                    t.update(brandsRef, { credits: newCredits });
                }

                // Store payment record to prevent future duplicates
                t.set(paymentRef, {
                    orderId: razorpay_order_id,
                    paymentId: razorpay_payment_id,
                    signature: razorpay_signature,
                    packageId: packageId,
                    credits: parseInt(credits, 10),
                    status: "success",
                    timestamp: FieldValue.serverTimestamp()
                });
            });

            console.log(`Credits added successfully: ${credits} credits for user ${uid}`);

            return {
                success: true,
                message: `Successfully added ${credits} credits to your account.`,
                paymentId: razorpay_payment_id
            };
        } catch (error) {
            console.error("Payment Verification Error:", error);
            throw new Error(`Failed to verify payment: ${error.message}`);
        }
    }
);
// 4. User Creation Trigger - Initialize Credits
exports.onUserSignup = require("firebase-functions/v1").auth.user().onCreate(async (user) => {
    const uid = user.uid;
    const email = user.email;
    const displayName = user.displayName || "New Creator";

    console.log(`New user signed up: ${uid}, initializing brand...`);

    try {
        const brandRef = db.collection("brands").doc(uid);
        const userRef = db.collection("users").doc(uid);

        const docSnap = await brandRef.get();
        if (docSnap.exists) {
            console.log(`Brand already exists for ${uid}, skipping.`);
            return;
        }

        const initialData = {
            uid: uid,
            email: email,
            brandName: displayName,
            credits: 10,
            creditsUsed: 0,
            plan: "free",
            onboarded: false,
            createdAt: FieldValue.serverTimestamp()
        };

        await brandRef.set(initialData);
        await userRef.set(initialData);

        console.log(`Initialized brand for ${uid} with 10 credits.`);
    } catch (error) {
        console.error(`Error initializing user ${uid}:`, error);
    }
});

// --- HELPER FUNCTIONS ---
function createToneInstruction(tones) {
    if (!tones) return "Use a professional and engaging tone.";
    if (typeof tones === 'string') return `Use the following tone: ${tones}.`;
    if (Array.isArray(tones) && tones.length === 0) return "Use a professional and engaging tone.";
    return `Use the following tones: ${tones.join(", ")}.`;
}

function createCaptionAdvancedInstructions(options) {
    return "Make it engaging and encourage interaction.";
}

function createIdeaAdvancedInstructions(options) {
    let instructions = [];
    if (options.includeReels) instructions.push("Focus on video/Reel ideas.");
    if (options.includeCarousels) instructions.push("Focus on Carousel post ideas.");
    if (options.includeStatic) instructions.push("Focus on static image post ideas.");
    return instructions.join(" ");
}

function getJsonFormat(options) {
    return `[{"caption": "Caption text here", "hashtags": ["#tag1", "#tag2"]}]`;
}

// --- HELPER FUNCTIONS ---

async function generateThumbnailStrategy(topic, platform, image, aspectRatio) {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: STRATEGIST_SYSTEM_PROMPT
        });

        let prompt = `Analyze this request and generate a thumbnail strategy.
Topic: "${topic}"
Target Platform: "${platform}"
Aspect Ratio: "${aspectRatio}"

${image ? "REFERENCE IMAGE PROVIDED: Analyze the style, composition, and subject of the attached image. Adapt this archetype for the new topic." : "NO REFERENCE IMAGE: Create a new high-CTR archetype."}

OUTPUT JSON ONLY.`;

        let parts = [{ text: prompt }];
        if (image) {
            const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
            parts.push({ inlineData: { data: base64Data, mimeType: "image/jpeg" } });
        }

        const result = await model.generateContent(parts);
        const response = await result.response;
        let text = response.text();

        // Clean JSON
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(text);
    } catch (e) {
        console.error("Strategist Error:", e);
        return null;
    }
}
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getStorage } = require("firebase-admin/storage");

exports.cleanupOldImages = onSchedule("every 24 hours", async (event) => {
    const bucket = getStorage().bucket();
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    try {
        console.log("Starting cleanup of images older than 30 days...");

        const [files] = await bucket.getFiles({ prefix: 'users/' });
        let deletedCount = 0;
        const deletePromises = [];

        for (const file of files) {
            const [metadata] = await file.getMetadata();
            const createdTime = new Date(metadata.timeCreated).getTime();

            if (createdTime < thirtyDaysAgo && file.name.includes('generated_images/')) {
                console.log(`Deleting old image: ${file.name}`);
                deletePromises.push(file.delete());
                deletedCount++;
            }
        }

        await Promise.all(deletePromises);

        console.log(`Cleanup completed. Deleted ${deletedCount} images.`);
        return { success: true, deletedCount };
    } catch (error) {
        console.error("Error during cleanup:", error);
        throw error;
    }
});

// --- HELPER: Cost Calculation & Logging ---
async function logSystemCost(userId, model, inputTokens, outputTokens, featureType) {
    // Pricing (Estimated per 1M tokens)
    // Gemini 1.5 Flash: $0.075 Input / $0.30 Output
    // Gemini 1.5 Pro: $3.50 Input / $10.50 Output
    // Gemini 2.5 Flash: Assuming similar to 1.5 Flash for now (safe estimate)

    const pricing = {
        "gemini-1.5-flash": { input: 0.075, output: 0.30 },
        "gemini-2.5-flash": { input: 0.075, output: 0.30 }, // Placeholder
        "gemini-2.5-flash-image": { input: 0.075, output: 0.30 }, // Placeholder
        "gemini-1.5-pro": { input: 3.50, output: 10.50 },
        "gemini-2.5-pro": { input: 3.50, output: 10.50 } // Placeholder
    };

    const rates = pricing[model] || pricing["gemini-1.5-flash"]; // Default to Flash

    const inputCost = (inputTokens / 1000000) * rates.input;
    const outputCost = (outputTokens / 1000000) * rates.output;
    const totalCost = inputCost + outputCost;

    await db.collection("system_logs").add({
        userId: userId,
        timestamp: FieldValue.serverTimestamp(),
        type: "api_cost",
        featureType: featureType,
        model: model,
        inputTokens: inputTokens,
        outputTokens: outputTokens,
        costUSD: totalCost,
        details: `Input: ${inputTokens} ($${inputCost.toFixed(6)}) | Output: ${outputCost.toFixed(6)})`
    });

    console.log(`[COST] User: ${userId} | Model: ${model} | Cost: $${totalCost.toFixed(6)}`);
}
