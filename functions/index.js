// functions/index.js
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

admin.initializeApp();
const db = admin.firestore();

// --- GEMINI SETUP ---
const { GoogleGenerativeAI } = require("@google/generative-ai");
const sharp = require("sharp");
// Initialize Gemini with the provided API Key (env var)
// Initialize Gemini with the provided API Key (env var)
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "AIzaSyBTE9GkRl051i6WVOUp3IzMU0uHn23pwgQ");

// --- MAIN FUNCTION (HTTP) ---
// --- MAIN FUNCTION (HTTP) ---
// Converted to HTTP onRequest for Cloud Run / Firebase HTTP functions + CORS + long timeout
exports.generateContent = onRequest(
    { timeoutSeconds: 540, memory: "1GiB" },
    async (req, res) => {
        // ---------- CORS ----------
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");

        if (req.method === "OPTIONS") {
            return res.status(204).send("");
        }
        // ---------- end CORS ----------

        try {
            console.log("DEBUG: generateContent function started");

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
            console.log("DEBUG: Raw req.body type:", typeof body);
            console.log("DEBUG: Content-Type:", req.get('content-type'));

            if (Buffer.isBuffer(body)) {
                console.log("DEBUG: Body is Buffer, converting to string");
                try {
                    body = JSON.parse(body.toString());
                } catch (e) {
                    console.error("DEBUG: Failed to parse Buffer body:", e);
                }
            } else if (typeof body === 'string') {
                try {
                    body = JSON.parse(body);
                    console.log("DEBUG: Parsed body string successfully");
                } catch (e) {
                    console.error("DEBUG: Failed to parse body string:", e);
                }
            }

            // Handle "data" wrapper (common in Firebase Callable or manual wrapping)
            if (body && body.data && !body.type) {
                console.log("DEBUG: unwrapping 'data' property");
                body = body.data;
            }

            console.log("DEBUG: Full Body:", JSON.stringify(body));

            const { type, payload } = body || {};
            const topic = payload?.topic;
            const tones = payload?.tones || [];
            const options = payload?.options || {};
            const image = payload?.image; // Base64 image string
            const aspectRatio = payload?.aspectRatio || "1:1";
            const faceOverlay = payload?.faceOverlay || false;
            const facePosition = payload?.facePosition || "bottom-left";

            console.log("DEBUG: generateContent called");
            console.log("DEBUG: type =", type);
            console.log("DEBUG: topic =", topic);
            console.log("DEBUG: image present =", !!image);
            console.log("DEBUG: payload keys =", Object.keys(payload || {}));

            // --- 1. CREDIT CALCULATION & DEDUCTION ---
            let requiredCredits = 0;
            const baseCosts = {
                caption: 1,
                idea: 1,
                tweet: 1,
                videoScript: 1,
                post: 1,        // Base cost for 1 variation
                image: 2,       // Standalone image generation
                smartImage: 1,  // Reduced from 2 to 1
                dynamicGuide: 0,
                dynamicGuideIterative: 0,
                finalGuide: 0
            };

            if (type && baseCosts.hasOwnProperty(type)) {
                requiredCredits = baseCosts[type];
            }

            // Dynamic cost for 'post' type based on variations
            if (type === "post") {
                const vars = options?.numVariations || 1;
                requiredCredits = vars * 1; // 1 credit per text variation
            }

            // Additional credit for vision API (when image is uploaded as input)
            if (image) {
                requiredCredits += 1;
            }

            // Hashtags and CTA are now FREE (removed additional cost logic)

            // Transaction for credit deduction
            if (requiredCredits > 0) {
                // Use 'brands' collection as the primary source of truth for credits
                const brandRef = db.collection("brands").doc(uid);

                try {
                    await db.runTransaction(async (transaction) => {
                        const brandSnap = await transaction.get(brandRef);

                        let currentCredits = 0;

                        if (!brandSnap.exists) {
                            console.log(`Brand profile missing for ${uid}, creating default...`);
                            const initialData = {
                                uid: uid,
                                email: authTokenDecoded?.email || "",
                                brandName: authTokenDecoded?.name || "New Creator",
                                credits: 10,
                                creditsUsed: 0,
                                plan: "free",
                                onboarded: false,
                                createdAt: FieldValue.serverTimestamp()
                            };
                            transaction.set(brandRef, initialData);
                            currentCredits = 10;
                        } else {
                            const brandData = brandSnap.data();
                            currentCredits = brandData.credits || 0;
                        }

                        if (currentCredits < requiredCredits) {
                            throw new Error(`resource-exhausted: Insufficient credits. You need ${requiredCredits} credits but have ${currentCredits}.`);
                        }

                        transaction.update(brandRef, {
                            credits: currentCredits - requiredCredits,
                            creditsUsed: FieldValue.increment(requiredCredits)
                        });
                    });
                } catch (err) {
                    const m = err && err.message ? err.message : String(err);
                    if (m.includes("resource-exhausted")) {
                        return res.status(429).json({ error: m.replace("resource-exhausted: ", "") });
                    }
                    console.error("Transaction error:", err);
                    return res.status(500).json({ error: "Credit deduction failed." });
                }
            }

            // Validation: Most types need a topic or image, but guides use other payload data
            if (!topic && !image &&
                type !== "dynamicGuide" &&
                type !== "finalGuide" &&
                type !== "dynamicGuideIterative" &&
                type !== "generateRoadmapSteps" &&
                type !== "generateChecklist" &&
                type !== "generatePillars"
            ) {
                return res.status(400).json({
                    error: "invalid-argument: The function must be called with a 'topic' or an 'image'.",
                    debug: {
                        receivedType: type,
                        receivedBody: body,
                        contentType: req.get('content-type')
                    }
                });
            }

            let brand = {};
            const useBrandData = payload?.useBrandData !== false;
            if (useBrandData) {
                try {
                    const brandSnap = await db.collection("brands").doc(uid).get();
                    if (brandSnap.exists) brand = brandSnap.data();
                } catch (e) {
                    console.error("Could not fetch brand data:", e);
                }
            }

            // --- HELPER: Construct Prompts ---
            const toneInstruction = createToneInstruction(tones);
            const captionAdvancedInstruction = createCaptionAdvancedInstructions(options || {});
            const ideaAdvancedInstruction = createIdeaAdvancedInstructions(options || {});
            const jsonOutputFormat = getJsonFormat(options || {});
            const imageInstruction = image ? "**CRITICAL:** Analyze the attached image. Use the visual details, mood, and context of the image as the PRIMARY source for your content generation." : "";

            const prompts = {
                caption: `
          You are an expert social media strategist. Generate 3 unique, high-energy Instagram captions.
          **Brand Details:** ${brand.brandName || 'Generic Brand'}, ${brand.industry || 'General'}, ${brand.tone || 'Professional'}, ${brand.audience || 'Everyone'}
          **Post Topic:** ${topic || "See attached image"}
          ${imageInstruction}
          **Tone Instructions:** ${toneInstruction}
          **Advanced Instructions:** ${captionAdvancedInstruction}
          **Format Instructions:**
          - DO NOT include any introductory text.
          - You MUST return ONLY a valid JSON array matching this exact structure: ${jsonOutputFormat}
        `,
                idea: `
          You are an expert social media strategist. Give ${options?.numIdeas || 10} unique, "viral-style" content ideas.
          **Brand Details:** ${brand.brandName || 'Generic Brand'}, ${brand.industry || 'General'}, ${brand.tone || 'Professional'}, ${brand.audience || 'Everyone'}
          **Topic:** ${topic || "See attached image"}
          ${imageInstruction}
          **Tone Instructions:** ${toneInstruction}
          **Advanced Instructions:** ${ideaAdvancedInstruction}
          **Instructions:**
          - Format each idea EXACTLY as follows:
            Video Title: [Catchy Title]
            Length: [Approximate time, e.g., 30-60 seconds]
            Idea: [One sentence summary]
            Explanation:
            - [Point 1]
            - [Point 2]
            - [Point 3]
          - Separate each idea with a blank line.
          - DO NOT include any introductory text.
        `,
                post: `
          You are an expert social media copywriter. Write a full, engaging social media post.
          **Brand Details:** ${brand.brandName || 'Generic Brand'}, ${brand.industry || 'General'}, ${brand.tone || 'Professional'}, ${brand.audience || 'Everyone'}
          **Post Topic:** ${topic || "See attached image"}
          ${imageInstruction}
          **Tone Instructions:** ${toneInstruction}
          **Advanced Instructions:**
          - Approx 100-150 words. Strong hook, valuable content, clear CTA.
          - Include 5-7 relevant hashtags.
          - DO NOT include any introductory text.
        `,
                videoScript: `
          You are a professional YouTube and TikTok scriptwriter. Write a script for a short video (1-2 mins).
          **Brand Details:** ${brand.brandName || 'Generic Brand'}, ${brand.industry || 'General'}, ${brand.tone || 'Professional'}, ${brand.audience || 'Everyone'}
          **Video Topic:** ${topic || "See attached image"}
          ${imageInstruction}
          **Tone Instructions:** ${toneInstruction}
          **Instructions:**
          - Format with sections: "Hook:", "Intro:", "Main Content:", "CTA:".
          - Natural, spoken-word style.
          - DO NOT include any introductory text.
        `,
                tweet: `
          You are a witty and viral-style Twitter/X copywriter. Generate 3 short, punchy tweets.
          **Brand Details:** ${brand.brandName || 'Generic Brand'}, ${brand.tone || 'Professional'}
          **Topic:** ${topic || "See attached image"}
          ${imageInstruction}
          **Tone Instructions:** ${toneInstruction}
          **Instructions:**
          - Under 280 characters. 1-2 hashtags. Numbered list.
          - DO NOT include any introductory text.
        `,
                dynamicGuide: `
          You are an expert brand strategist. Create a dynamic onboarding flow for a new creator.
          **Niche:** ${payload?.coreData?.niche || 'General'}
          **Tone:** ${(payload?.coreData?.tone || []).join(', ')}
          **Commitment:** ${payload?.coreData?.commitment || 'Unknown'}
          
          **Goal:** Generate 3-5 follow-up questions to refine their strategy.
          **Schema:** You MUST return a valid JSON object matching this schema: ${JSON.stringify(payload?.schema || {})}
          **Instructions:**
          - Questions should be specific to their niche.
          - Return ONLY the JSON object. No markdown formatting.
        `,
                dynamicGuideIterative: `
          You are an expert brand strategist. Conduct a deep-dive interview to build a perfect social media strategy.
          **Core Context:**
          - Niche: ${payload?.coreData?.niche || 'General'}
          - Goal: ${payload?.coreData?.goal || 'Growth'}
          - Tone: ${(payload?.coreData?.tone || []).join(', ')}
          
          **Conversation History:**
          ${(payload?.history || []).map((h, i) => `Q${i + 1}: ${h.question}\nA: ${h.answer}`).join('\n\n')}
          
          **Goal:** Ask ONE single follow-up question to clarify their strategy, audience, or resources.
          **Constraint:** 
          - Stop asking questions when you have a clear picture (usually 3-5 questions total).
          - **Minimalist Style:** Keep questions short, simple, and easy to understand. Avoid jargon.
          - **Simple Options:** If providing options, keep them short (1-3 words).
          
          **Schema:** Return a JSON object:
          {
            "ready": boolean, // true if you have enough info
            "question": { // Required if ready is false
               "text": "Short, simple question string",
               "type": "text" | "radio" | "select",
               "options": ["Short Opt 1", "Short Opt 2"] // Only for radio/select
            }
          }
        `,
                generateRoadmapSteps: `
          You are an expert social media manager. Create a "Zero to Hero" roadmap timeline.
          **Core Data:** ${JSON.stringify(payload?.formData || {})}
          **Dynamic Answers:** ${JSON.stringify(payload?.dynamicAnswers || [])}
          
          **Instructions:**
          - Generate **30-50 high-impact steps** from "Day 1" to "Day 30+".
          - **Schema:** Return a JSON object with ONLY "roadmapSteps":
            "roadmapSteps": [
              {
                "title": "Short Action Title",
                "description": "Brief 1-sentence summary",
                "detailedDescription": "Specific instructions on WHAT and HOW.",
                "subNodes": [
                  { "title": "Sub-Task 1", "steps": ["Step 1.1", "Step 1.2"] },
                  { "title": "Sub-Task 2", "steps": ["Step 2.1", "Step 2.2"] }
                ],
                "phase": "Foundation" | "Content Creation" | "Growth" | "Monetization",
                "timeEstimate": "e.g., 15 mins",
                "suggestions": ["Suggestion 1", "Suggestion 2"],
                "resources": [{ "name": "Tool Name", "url": "https://..." }],
                "generatorLink": "/video-script-generator" | "/post-generator" | "/idea-generator" | null
              }
            ]
          - Return ONLY the JSON object.
        `,
                generateChecklist: `
          You are an expert social media manager. Create a 7-Day Launchpad Checklist.
          **Core Data:** ${JSON.stringify(payload?.formData || {})}
          
          **Instructions:**
          - Generate exactly 7 actionable tasks for the first week.
          - **Schema:** Return a JSON object with ONLY "sevenDayChecklist":
            "sevenDayChecklist": ["Day 1 Task", "Day 2 Task", ..., "Day 7 Task"]
          - Return ONLY the JSON object.
        `,
                generatePillars: `
          You are an expert social media manager. Define Core Content Pillars.
          **Core Data:** ${JSON.stringify(payload?.formData || {})}
          
          **Instructions:**
          - Generate 3-5 core content themes/pillars.
          - **Schema:** Return a JSON object with ONLY "contentPillars":
            "contentPillars": ["Pillar 1", "Pillar 2", "Pillar 3"]
          - Return ONLY the JSON object.
        `,
                finalGuide: `
          You are an expert social media manager. Create a comprehensive "Zero to Hero" action plan.
          **Core Data:** ${JSON.stringify(payload?.formData || {})}
          **Dynamic Answers:** ${JSON.stringify(payload?.dynamicAnswers || [])}
          
          **Instructions:**
          - Analyze the user's goal and generate **30-50 high-impact steps**. Focus on quality over quantity.
          - The steps should take the user from "Day 1" (Setup) to "Day 30+" (Monetization/Growth).
          - **Schema:** You MUST return a JSON object with the following keys:
            1. "roadmapSteps": An array of objects (as defined below).
            2. "sevenDayChecklist": An array of 7 strings, representing a specific actionable checklist for the first week.
            3. "contentPillars": An array of 3-5 strings, representing the core content themes.

          - "roadmapSteps" must be an array of objects, each with:
            - "title": Short action title (e.g., "Create Instagram Bio").
            - "description": Brief 1-sentence summary.
            - "detailedDescription": A detailed explanation of WHAT to do and HOW to do it. Be specific.
            - "subNodes": An array of 2-4 sub-nodes. Each sub-node object must have:
              - "title": Title of the sub-task.
              - "steps": An array of 2-3 very short, easy strings explaining how to do it.
            - "phase": One of ["Foundation", "Content Creation", "Growth", "Monetization"].
            - "timeEstimate": ACCURATE and PRECISE time estimate (e.g., "15 mins", "2 hours", "45 mins"). Do NOT use ranges like "1-2 days". Be specific.
            - "suggestions": An array of **3-5 specific suggestions** (e.g., video ideas, hook examples, tools to try) where applicable.
            - "resources": An array of objects { "name": "Tool Name", "url": "https://..." } for relevant tools/software.
            - "generatorLink": IF the step can be done by our AI tools, return one of: ["/video-script-generator", "/post-generator", "/idea-generator", "/caption-generator", "/tweet-generator", "/image-generator"].Otherwise null.
          - Return ONLY the JSON object.No markdown formatting.
        `
            };

            // --- HELPER: Composite Face on Thumbnail (YouTube Style) ---
            async function compositeFaceOnThumbnail(baseImageBase64, faceImageBase64, position = "bottom-left") {
                try {
                    // Remove base64 prefix if present
                    const baseData = baseImageBase64.replace(/^data:image\/\w+;base64,/, "");
                    const faceData = faceImageBase64.replace(/^data:image\/\w+;base64,/, "");

                    // Convert base64 to buffers
                    const baseBuffer = Buffer.from(baseData, "base64");
                    const faceBuffer = Buffer.from(faceData, "base64");

                    // Get base image dimensions
                    const base = sharp(baseBuffer);
                    const baseMetadata = await base.metadata();
                    const baseWidth = baseMetadata.width;
                    const baseHeight = baseMetadata.height;

                    // Calculate face overlay size (20% of base image height for MrBeast style)
                    const faceSize = Math.round(baseHeight * 0.35); // Larger for impact

                    // Process face: circular crop with border
                    const processedFace = await sharp(faceBuffer)
                        .resize(faceSize, faceSize, { fit: 'cover' })
                        .composite([
                            {
                                input: Buffer.from(
                                    `<svg width="${faceSize}" height="${faceSize}">
                                        <circle cx="${faceSize / 2}" cy="${faceSize / 2}" r="${faceSize / 2}" fill="white"/>
                                    </svg>`
                                ),
                                blend: 'dest-in'
                            }
                        ])
                        .extend({
                            top: 8,
                            bottom: 8,
                            left: 8,
                            right: 8,
                            background: { r: 255, g: 255, b: 255, alpha: 1 } // White border
                        })
                        .toBuffer();

                    // Calculate position
                    let left, top;
                    const margin = 30; // Margin from edges

                    if (position === "bottom-left") {
                        left = margin;
                        top = baseHeight - faceSize - margin - 16; // -16 for border
                    } else if (position === "bottom-right") {
                        left = baseWidth - faceSize - margin - 16;
                        top = baseHeight - faceSize - margin - 16;
                    } else if (position === "top-left") {
                        left = margin;
                        top = margin;
                    } else { // top-right
                        left = baseWidth - faceSize - margin - 16;
                        top = margin;
                    }

                    // Composite face onto base image
                    const result = await base
                        .composite([{
                            input: processedFace,
                            left: left,
                            top: top
                        }])
                        .toBuffer();

                    // Convert back to base64
                    return `data:image/png;base64,${result.toString('base64')}`;
                } catch (e) {
                    console.error("Face compositing error:", e);
                    throw e;
                }
            }

            // --- SMART IMAGE GENERATION (With User Image Integration) ---
            if (type === "smartImage") {
                console.log("=== SMART IMAGE: Starting generation ===");

                try {
                    const userPlatform = payload?.platform || "Social Media";
                    const userIdea = payload?.topic || "Content";
                    const userTones = (payload?.tones || []).join(", ") || "professional";
                    const userImage = payload?.image; // Base64 image uploaded by user

                    console.log("Inputs:", { userPlatform, userIdea, userTones, hasImage: !!userImage, aspectRatio, faceOverlay, facePosition });

                    // Use payload aspectRatio if provided, otherwise auto-detect from platform
                    let finalAspectRatio = aspectRatio; // From payload
                    let ratioDesc = "Square aspect ratio";

                    // Auto-detect from platform if not explicitly set
                    if (aspectRatio === "1:1") {
                        const p = userPlatform.toLowerCase();
                        if (p.includes("youtube")) {
                            finalAspectRatio = "16:9";
                            ratioDesc = "Wide 16:9 aspect ratio for YouTube thumbnail";
                        } else if (p.includes("twitter")) {
                            finalAspectRatio = "16:9";
                            ratioDesc = "Wide 16:9 aspect ratio";
                        } else if (p.includes("story") || p.includes("tiktok") || p.includes("reel") || p.includes("short")) {
                            finalAspectRatio = "9:16";
                            ratioDesc = "Vertical 9:16 aspect ratio";
                        }
                    } else {
                        // Use explicitly provided aspect ratio
                        if (finalAspectRatio === "16:9") ratioDesc = "Wide 16:9 landscape format";
                        else if (finalAspectRatio === "9:16") ratioDesc = "Vertical 9:16 portrait format";
                        else ratioDesc = "Square 1:1 format";
                    }

                    // DYNAMIC PROMPT CONSTRUCTION
                    let prompt = "";

                    if (userImage) {
                        // Check if topic mentions people/person to decide if we should add the face
                        const topicLower = userIdea.toLowerCase();
                        const mentionsPeople = topicLower.includes('people') || topicLower.includes('person') || topicLower.includes('man') || topicLower.includes('woman') || topicLower.includes('guy') || topicLower.includes('girl');

                        if (mentionsPeople) {
                            // Don't add face overlay if people are already mentioned in the topic
                            prompt = `Create a high-quality ${userPlatform} thumbnail image for: "${userIdea}". Style: ${userTones}.
${ratioDesc}.
Make it engaging, modern, clean, eye-catching. Professional YouTube thumbnail style.
IMPORTANT: This is a SINGLE CONTENT IMAGE, NOT a collage or grid. Generate ONLY ONE main thumbnail image.
NEGATIVE CONSTRAINTS: Do NOT create multiple variations, no grid layouts, no collages, no text overlays, no UI elements, no logos.`;
                        } else {
                            // Add the person on the left side since they're not mentioned
                            prompt = `You are an expert AI artist creating a PROFESSIONAL YOUTUBE THUMBNAIL.

**CRITICAL REQUIREMENTS:**
1. Create a SINGLE, UNIFIED 16:9 thumbnail image (NOT a collage, grid, or multiple variations)
2. The reference image shows a REAL PERSON - integrate THIS EXACT PERSON naturally on the LEFT SIDE of the scene
3. This person should be positioned on the LEFT portion of the frame, taking up roughly 30-40% of the image width
4. The RIGHT side should show the main context: "${userIdea}"

**IDENTITY PRESERVATION:**
- The person in the reference image MUST maintain their EXACT facial features, ethnicity, age, and appearance
- Match their skin tone, facial structure, eye shape, and distinguishing features 100%
- Do NOT create a lookalike - it must be the SAME PERSON

**COMPOSITION STYLE (MrBeast/YouTube Thumbnail):**
- Person on LEFT: Full body or upper body shot, facing slightly towards camera, engaged with the scene
- Person should have an expressive, energetic pose (pointing, reacting, gesturing) appropriate for: "${userIdea}"
- Background/RIGHT side: Show the main subject matter from the topic
- Professional lighting, photorealistic, high-definition 8K quality
- Vibrant colors, high contrast, eye-catching composition
- Style: ${userTones}

**NEGATIVE CONSTRAINTS:**
- Do NOT create multiple images, grids, collages, or variations
- Do NOT add text, titles, arrows, or graphic overlays
- Do NOT make the person look cartoonish or animated
- Do NOT include social media logos or UI elements
- Generate ONLY ONE main thumbnail image

Example composition: Person on left interacting with/reacting to the scene on the right.`;
                        }
                    } else {
                        // Fallback for no image
                        prompt = `Create a high-quality ${userPlatform} image for: "${userIdea}". Style: ${userTones}.
${ratioDesc}.
Make it engaging, modern, clean, eye-catching. Professional composition.
IMPORTANT: This is a SINGLE CONTENT IMAGE, NOT a collage or grid. Generate ONLY ONE main image.
NEGATIVE CONSTRAINTS: Do NOT include any social media logos, no UI elements, no buttons, no multiple variations.`;
                    }

                    console.log("Prompt:", prompt);
                    console.log("Creating model...");

                    const imageModel = genAI.getGenerativeModel({
                        model: "gemini-2.5-flash-image"
                    });

                    console.log("Calling generateContent...");

                    // Prepare parts for the API call
                    let parts = [{ text: prompt }];

                    if (userImage) {
                        // Extract base64 data if it has the prefix
                        const base64Data = userImage.replace(/^data:image\/\w+;base64,/, "");
                        parts.push({
                            inlineData: {
                                data: base64Data,
                                mimeType: "image/jpeg" // Assuming jpeg/png, API handles standard types
                            }
                        });
                    }

                    const result = await imageModel.generateContent(parts);
                    console.log("Getting response...");
                    const response = await result.response;

                    console.log("Response candidates:", response.candidates?.length);

                    if (response.candidates && response.candidates[0]) {
                        const parts = response.candidates[0].content.parts;
                        console.log("Parts count:", parts.length);

                        for (const part of parts) {
                            if (part.text) {
                                console.log("Text:", part.text);
                            }
                            if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')) {
                                console.log("✅ IMAGE FOUND!");
                                let finalImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;

                                // Person is now integrated directly in the main image generation
                                // No need for face overlay compositing

                                res.status(200).json({ result: finalImage });
                                return;
                            }
                        }
                    }

                    console.error("❌ No image in response");
                    return res.status(500).json({ error: "No image data returned from model" });

                } catch (e) {
                    console.error("❌ ERROR:", e && e.message ? e.message : e);
                    console.error(e && e.stack ? e.stack : "");
                    return res.status(500).json({ error: `Image gen failed: ${e && e.message ? e.message : "Unknown error"}` });
                }
            }

            // --- IMAGE GENERATION (Nano Banana / Gemini 2.5 Flash Image) ---
            if (type === "image") {
                try {
                    const imageModel = genAI.getGenerativeModel({
                        model: "gemini-2.5-flash-image"
                    });

                    const imagePrompt = `Create a high - quality, professional social media image.

Brand Context:
        - Industry: ${brand.industry || "general business"}
        - Brand Name: ${brand.brandName || ""}
        - Tone: ${brand.tone || "modern and professional"}
        - Target Audience: ${brand.audience || "general audience"}

Post Topic: "${topic}"

        Requirements:
        - Professional, eye - catching design suitable for social media
            - High quality, vibrant colors
                - Modern aesthetic
                    - 1024x1024 resolution`;

                    const result = await imageModel.generateContent(imagePrompt);
                    const response = await result.response;

                    if (response.candidates && response.candidates[0]) {
                        const parts = response.candidates[0].content.parts;

                        for (const part of parts) {
                            if (part.text) {
                                console.log("Image generation text:", part.text);
                            }

                            if (part.inlineData && part.inlineData.mimeType && part.inlineData.mimeType.startsWith('image/')) {
                                const imageData = part.inlineData.data;
                                const mimeType = part.inlineData.mimeType;
                                console.log("Image generated successfully, size:", imageData.length, "bytes");
                                res.status(200).json({ result: `data:${mimeType}; base64, ${imageData} ` });
                                return;
                            }
                        }
                    }

                    console.error("No image data in response. Full response:", JSON.stringify(response, null, 2));
                    return res.status(500).json({ error: "Image generation returned no inline data" });

                } catch (e) {
                    console.error("Image Generation Error:", e);
                    console.error("Error details:", e && e.message ? e.message : "");
                    if (e && e.stack) console.error("Stack:", e.stack);
                    return res.status(500).json({ error: `Failed to generate image with Imagen 3: ${e && e.message ? e.message : "Unknown error"}` });
                }
            }

            // --- TEXT GENERATION (Gemini 3.0 Pro) ---
            const selectedPrompt = prompts[type];
            if (!selectedPrompt) return res.status(404).json({ error: `Invalid prompt type: ${type}` });

            try {
                const model = genAI.getGenerativeModel({
                    model: "gemini-3-pro-preview",
                    systemInstruction: "You are an expert social media strategist who ONLY responds in the requested format."
                });

                let parts = [{ text: selectedPrompt }];

                if (image) {
                    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
                    parts = [
                        { inlineData: { data: base64Data, mimeType: "image/jpeg" } },
                        { text: selectedPrompt }
                    ];
                }

                const result = await model.generateContent(parts);
                const response = await result.response;
                const text = response.text();

                // Clean up markdown formatting (```json, ```) from ALL responses
                const cleanText = text.replace(/```json/g, "").replace(/```/g, "").trim();

                res.status(200).json({ result: cleanText });
                return;

            } catch (e) {
                console.error("Gemini Generation Error:", e);
                return res.status(500).json({ error: `Gemini Generation Failed: ${e && e.message ? e.message : "Unknown error"}` });
            }

        } catch (e) {
            console.error("Unhandled generateContent error:", e);
            const msg = e && e.message ? e.message : "Server Error";
            if (typeof msg === "string" && msg.startsWith("resource-exhausted")) {
                return res.status(429).json({ error: msg.replace("resource-exhausted:", "").trim() });
            }
            return res.status(500).json({ error: msg });
        }
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
        const stripe = require("stripe")(process.env.STRIPE_KEY || "dummy_key");

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
                key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_RiqljtmPi9aTaS",
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

                const paymentRef = brandsRef.collection("payments").doc(razorpay_payment_id);
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

// Guide Completion Reward - Award 10 credits on first-time completion
exports.completeGuide = onCall(
    async (request) => {
        const uid = request.auth?.uid;
        if (!uid) throw new Error("unauthenticated: User must be logged in.");

        console.log(`Guide completion request from user: ${uid}`);

        const brandRef = db.collection("brands").doc(uid);

        try {
            const result = await db.runTransaction(async (transaction) => {
                const brandDoc = await transaction.get(brandRef);

                if (!brandDoc.exists) {
                    throw new Error("Brand profile not found. Please complete brand setup first.");
                }

                const brandData = brandDoc.data();
                const alreadyCompleted = brandData.guideCompleted || false;

                // Check if guide was already completed before
                if (alreadyCompleted) {
                    console.log(`User ${uid} already completed guide. No credits awarded.`);
                    return {
                        success: true,
                        creditsAwarded: 0,
                        message: "Guide completion recorded. You've already received the completion bonus.",
                        alreadyCompleted: true
                    };
                }

                // First-time completion: Award 10 credits
                const currentCredits = brandData.credits || 0;
                const newCredits = currentCredits + 10;

                transaction.update(brandRef, {
                    credits: newCredits,
                    guideCompleted: true,
                    guideCompletedAt: FieldValue.serverTimestamp()
                });

                console.log(`Awarded 10 credits to user ${uid} for guide completion. New balance: ${newCredits}`);

                return {
                    success: true,
                    creditsAwarded: 10,
                    newBalance: newCredits,
                    message: "Congratulations! You've earned 10 credits for completing the guide!",
                    alreadyCompleted: false
                };
            });

            return result;
        } catch (error) {
            console.error("Guide completion error:", error);
            throw new Error(`Failed to process guide completion: ${error.message}`);
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
    if (!tones || tones.length === 0) return "Use a professional and engaging tone.";
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

// --- SCHEDULED CLEANUP: Delete images older than 30 days ---
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
