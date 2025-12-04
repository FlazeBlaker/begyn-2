import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db, doc, setDoc, getDoc } from "../services/firebase";
import { generateContent } from "../services/aiApi";
import "../styles/GuideFlowStyles.css";

// --- PHASE 1 OPTIONS ---
const TONE_OPTIONS = ["Witty", "Professional", "Cozy", "Bold", "Playful", "Inspirational"];
const CORE_STEPS_COUNT = 3; // Niche, Platform, AI Generation

// --- CUSTOM BUTTON ---
const CustomButton = ({ text, onClick, loading, isSecondary, disabled, style }) => {
    const [hover, setHover] = useState(false);
    return (
        <button className="custom-button" style={{
            padding: "12px 24px", borderRadius: "10px", border: "1px solid transparent",
            fontSize: "1rem", fontWeight: 600, transition: "all 0.3s ease-in-out",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
            background: isSecondary ? (loading ? "rgba(255,255,255,0.1)" : (loading ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.1)")) : (loading ? "rgba(168, 85, 247, 0.6)" : "rgba(140,100,255,0.8)"),
            color: isSecondary ? "#f0f0f0" : "white",
            opacity: disabled || loading ? 0.6 : 1, cursor: disabled || loading ? "not-allowed" : "pointer",
            ...style
        }} onClick={onClick} disabled={disabled || loading}
            onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
            {loading && !isSecondary && <div className="spin-loader" />}{text}
        </button>
    );
};

// --- PROGRESS BAR ---
const ProgressBar = ({ current, total }) => {
    return (
        <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min(current / total, 1) * 100}%` }} />
        </div>
    );
};

// --- STEP 1: Define the Niche & Goal (Phase 1) ---
const Step1Niche = ({ data, updateData, next, usingBrandData }) => {
    const handleChange = (e) => updateData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleToneSelect = (tone) => {
        updateData(prev => {
            const current = prev.tone || [];
            if (current.includes(tone)) return { ...prev, tone: current.filter(t => t !== tone) };
            if (current.length < 3) return { ...prev, tone: [...current, tone] };
            return prev;
        });
    };
    const isNextDisabled = !data.coreTopic || !data.targetAudience || !data.primaryGoal || (data.tone || []).length === 0;

    return (
        <div className="step-container fadeIn">
            <h2>🏗️ 1. Core Foundation & Niche Definition</h2>
            {usingBrandData && (
                <div style={{
                    background: 'rgba(140, 100, 255, 0.1)',
                    border: '1px solid rgba(140, 100, 255, 0.3)',
                    borderRadius: '8px',
                    padding: '12px',
                    marginBottom: '20px',
                    color: '#a855f7',
                    fontSize: '0.9rem'
                }}>
                    💡 Pre-filled from your Brand Setup! You can edit these values.
                </div>
            )}
            <label htmlFor="coreTopic">Core Topic/Niche (e.g., retro gaming) *</label>
            <input id="coreTopic" className="styled-input" name="coreTopic" value={data.coreTopic || ""} onChange={handleChange} />
            <label htmlFor="targetAudience">Target Audience (Who are you reaching?) *</label>
            <input id="targetAudience" className="styled-input" name="targetAudience" value={data.targetAudience || ""} onChange={handleChange} />
            <label>Creator Personality/Tone (Select max 3) *</label>
            <div className="grid-columns">
                {TONE_OPTIONS.map(tone => {
                    const isSelected = (data.tone || []).includes(tone);
                    return <div key={tone} className={`card ${isSelected ? "selected" : ""}`} onClick={() => handleToneSelect(tone)}>{tone}</div>;
                })}
            </div>
            <label htmlFor="primaryGoal">Primary Goal (e.g., build community, generate income) *</label>
            <input id="primaryGoal" className="styled-input" name="primaryGoal" value={data.primaryGoal || ""} onChange={handleChange} />
            <div className="button-row">
                <CustomButton text="Next Step" onClick={next} disabled={isNextDisabled} />
            </div>
        </div>
    );
};

// --- STEP 2: Platform Selection (Phase 1) ---
const Step2Platform = ({ data, updateData, next }) => {
    const CONTENT_PREFS = ["Short Video (Reels/TikTok)", "Long Video (YouTube)", "Images (Carousels/Posts)", "Text (Threads/Tweets)"];

    const handleChange = (e) => updateData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleContentPrefSelect = (pref) => {
        updateData(prev => {
            const current = prev.contentPreference || [];
            if (current.includes(pref)) return { ...prev, contentPreference: current.filter(p => p !== pref) };
            if (current.length < 3) return { ...prev, contentPreference: [...current, pref] };
            return prev;
        });
    };
    const isNextDisabled = !data.timeCommitment || (data.contentPreference || []).length === 0;

    return (
        <div className="step-container fadeIn">
            <h2>📱 2. Platform Selection</h2>
            <label htmlFor="timeCommitment">Time Commitment (Hours per week) *</label>
            <input id="timeCommitment" className="styled-input" name="timeCommitment" value={data.timeCommitment || ""} onChange={handleChange} placeholder="e.g., 8-10 hours/week" />
            <label>Content Preference (Select up to 3) *</label>
            <div className="grid-columns">
                {CONTENT_PREFS.map(pref => {
                    const isSelected = (data.contentPreference || []).includes(pref);
                    return <div key={pref} className={`card ${isSelected ? "selected" : ""}`} onClick={() => handleContentPrefSelect(pref)}>{pref}</div>;
                })}
            </div>
            <div className="button-row">
                <CustomButton text="Next Step" onClick={next} disabled={isNextDisabled} />
            </div>
        </div>
    );
};

// --- STEP 3: DYNAMIC GENERATION (The new main API call) ---
const Step3AI = ({ formData, setFormData, loading, setLoading, next }) => {

    // --- Define the Expected Dynamic AI Output Schema ---
    const AI_SCHEMA = {
        type: "object",
        properties: {
            questions: {
                type: "array",
                description: "An array defining the subsequent steps/questions for the user.",
                items: {
                    type: "object",
                    properties: {
                        stepId: { type: "number", description: "Unique ID for this specific question (e.g., 4, 5, 6...)" },
                        question: { type: "string", description: "The question to ask the user (e.g., 'What PFP style do you prefer?')." },
                        keyName: { type: "string", description: "The key to store the answer in formData (e.g., pfpStyle)." },
                        type: { type: "string", description: "Input type: 'radio', 'text', or 'select'." },
                        options: {
                            type: "array",
                            description: "Required if type is 'radio' or 'select'. Array of strings for choices.",
                            items: { type: "string" }
                        },
                        required: { type: "boolean" }
                    },
                    required: ["stepId", "question", "keyName", "type", "required"]
                }
            }
        },
        required: ["questions"]
    };

    const startGeneration = async () => {
        setLoading(true);
        try {
            // Call the Cloud Function 'generateContent' with type 'dynamicGuide'
            const responseString = await generateContent({
                type: "dynamicGuide",
                payload: {
                    topic: formData.coreTopic, // Required to pass backend validation
                    coreData: {
                        niche: formData.coreTopic,
                        tone: formData.tone,
                        commitment: formData.timeCommitment
                    },
                    schema: AI_SCHEMA
                }
            });

            let result;
            try {
                // Check if responseString is already an object (common with some fetch wrappers)
                if (typeof responseString === 'object' && responseString !== null) {
                    result = responseString;
                } else {
                    result = JSON.parse(responseString);
                }
            } catch (e) {
                console.error("Failed to parse AI JSON:", e);

                // Fallback if JSON is malformed
                result = { questions: [] };
            }

            // Ensure we have questions, even if result was parsed but empty
            const dynamicQuestions = (result.questions && result.questions.length > 0) ? result.questions : [
                { stepId: 4, question: "What is your main struggle?", keyName: "struggle", type: "text", required: true },
                { stepId: 5, question: "Do you have a budget?", keyName: "budget", type: "radio", options: ["No", "Small", "Large"], required: true }
            ];

            setFormData(prev => ({
                ...prev,
                dynamicSteps: dynamicQuestions,
                totalDynamicSteps: dynamicQuestions.length
            }));

            setLoading(false);
            next(); // Move to Step 4 (First Dynamic Step)

        } catch (error) {
            console.error("AI Generation Error:", error);
            setLoading(false);
            // Fallback for error state
            setFormData(prev => ({
                ...prev,
                dynamicSteps: [
                    { stepId: 4, question: "What visual style should your PFP be?", keyName: "pfpStyle", type: "radio", options: ["Mascot", "Abstract Logo", "Stylized Text"], required: true },
                    { stepId: 5, question: "What is your primary Call-to-Action (CTA)?", keyName: "mainCTA", type: "radio", options: ["Link in Bio", "Subscribe Now", "Visit My Shop"], required: true },
                    { stepId: 6, question: "What is your budget for creation tools?", keyName: "toolBudget", type: "radio", options: ["Free Tools Only", "Freemium/Low Budget", "Paid/Pro Tools"], required: true }
                ],
                totalDynamicSteps: 3
            }));
            next();
        }
    };

    return (
        <div className="step-container fadeIn" style={{ textAlign: "center" }}>
            <h2>🤖 3. Branding & Name Generation (AI)</h2>
            <p>Based on your Niche and Goals, the AI will now dynamically generate the remaining custom setup steps (4-{formData.dynamicSteps?.length + CORE_STEPS_COUNT || 'N'}).</p>
            {loading ? <div className="ai-loader">🤖 Generating Custom Roadmap...</div> :
                <CustomButton text="Start Custom AI Guide" onClick={startGeneration} disabled={!formData.coreTopic} />
            }
        </div>
    );
};

// --- DYNAMIC STEP RENDERING COMPONENT (Steps 4 through N) ---
const Step4ToN_Dynamic = ({ step, stepNumber, totalSteps, data, updateData, next, finish }) => {
    const [currentAnswer, setCurrentAnswer] = useState(data[step.keyName] || '');
    const [radioAnswer, setRadioAnswer] = useState(data[step.keyName] && step.options?.includes(data[step.keyName]) ? data[step.keyName] : (data[step.keyName] ? 'Other' : ''));
    const [otherText, setOtherText] = useState(data[step.keyName] && !step.options?.includes(data[step.keyName]) ? data[step.keyName] : '');

    const handleNext = () => {
        let answerToSave = '';

        if (step.type === 'text') {
            answerToSave = currentAnswer;
        } else if (step.type === 'radio' || step.type === 'select') {
            if (radioAnswer === 'Other') {
                answerToSave = otherText;
            } else {
                answerToSave = radioAnswer;
            }
        }

        // Validation
        if (step.required && !answerToSave) {
            alert(`Please answer the question for Step ${stepNumber}.`);
            return;
        }

        // Save the answer to formData under the correct key
        updateData({ [step.keyName]: answerToSave });

        // Check if this is the last step (totalSteps includes the final review step)
        if (stepNumber === totalSteps) {
            finish();
        } else {
            next();
        }
    };

    const isNextDisabled = step.required && (
        (step.type === 'text' && !currentAnswer) ||
        ((step.type === 'radio' || step.type === 'select') && (!radioAnswer || (radioAnswer === 'Other' && !otherText)))
    );

    // --- Input Renderer ---
    const renderInput = () => {
        switch (step.type) {
            case 'text':
                return (
                    <input
                        className="styled-input"
                        value={currentAnswer}
                        onChange={(e) => setCurrentAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                    />
                );
            case 'radio':
            case 'select':
                return (
                    <div className="input-group">
                        <div className="grid-columns">
                            {step.options.map(option => {
                                const isSelected = radioAnswer === option;
                                return (
                                    <div
                                        key={option}
                                        className={`card ${isSelected ? "selected" : ""}`}
                                        onClick={() => {
                                            setRadioAnswer(option);
                                            setOtherText(''); // Clear other text if regular option selected
                                        }}
                                    >
                                        {option}
                                    </div>
                                );
                            })}
                            {/* Always show Other option if not present */}
                            {!step.options.includes("Other") && (
                                <div
                                    className={`card ${radioAnswer === "Other" ? "selected" : ""}`}
                                    onClick={() => setRadioAnswer("Other")}
                                >
                                    Other
                                </div>
                            )}
                        </div>

                        {/* Show text input if "Other" is selected */}
                        {radioAnswer === "Other" && (
                            <div className="other-input-container fadeIn" style={{ marginTop: '15px' }}>
                                <label>Please specify:</label>
                                <input
                                    className="styled-input"
                                    value={otherText}
                                    onChange={(e) => setOtherText(e.target.value)}
                                    placeholder="Type your custom answer..."
                                    autoFocus
                                />
                            </div>
                        )}
                    </div>
                );
            default:
                return <p>Error: Unknown input type.</p>;
        }
    };

    return (
        <div className="step-container fadeIn">
            <h2>{stepNumber}. {step.question}</h2>
            {step.required && <p style={{ color: '#ff6b6b', marginTop: '-10px' }}>(Required)</p>}

            <label>{step.question} {step.required ? '*' : ''}</label>

            {renderInput()}

            <div className="button-row">
                <CustomButton text={stepNumber === totalSteps ? "Complete & Save" : "Next Step"} onClick={handleNext} disabled={isNextDisabled} />
            </div>
        </div>
    );
};

// --- FINAL REVIEW STEP (Dynamic Summary) ---
const FinalReviewStep = ({ data, finish }) => {
    const dynamicAnswers = (data.dynamicSteps || []).map(s => ({
        question: s.question,
        answer: data[s.keyName] || 'N/A'
    }));

    return (
        <div className="step-container fadeIn">
            <h2>📋 Final Action Plan Review</h2>
            <p>Review the complete AI-generated strategy and confirm your brand setup.</p>
            <div className="final-review-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                width: '100%'
            }}>

                <div className="final-card"><h3>Core Foundation</h3><p>Niche: {data.coreTopic}</p><p>Tone: {(data.tone || []).join(', ')}</p></div>
                <div className="final-card"><h3>Commitment</h3><p>{data.timeCommitment}</p></div>

                {/* DYNAMIC ANSWERS */}
                {dynamicAnswers.map((item, i) => (
                    <div key={i} className="final-card">
                        <h3>{item.question.length > 50 ? item.question.substring(0, 50) + '...' : item.question}</h3>
                        <p>{item.answer}</p>
                    </div>
                ))}

                <div className="final-card" style={{ gridColumn: '1 / -1' }}>
                    <h3>Ready to Generate?</h3>
                    <p>Click below to generate your detailed 30-step roadmap.</p>
                </div>
            </div>
            <div className="button-row">
                <CustomButton text="Complete & Save" onClick={finish} />
            </div>
        </div>
    );
};

// --- MAIN GUIDE FLOW ---
export default function GuideFlow({ setOnboardedStatus }) {
    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState({
        coreTopic: "", targetAudience: "", primaryGoal: "", tone: [],
        timeCommitment: "", contentPreference: [],
        aiGenerated: null,
        dynamicSteps: null, // Stores the AI-generated question structure
        totalDynamicSteps: 0 // Stores the total count of dynamic steps
    });
    const [loading, setLoading] = useState(false);
    const [brandSetupData, setBrandSetupData] = useState(null);
    const [usingBrandData, setUsingBrandData] = useState(false);
    const navigate = useNavigate();
    const uid = auth.currentUser?.uid;

    // Fetch existing brand data on mount
    useEffect(() => {
        const fetchBrandData = async () => {
            if (!uid) return;
            try {
                const brandRef = doc(db, "brands", uid);
                const brandSnap = await getDoc(brandRef);

                if (brandSnap.exists()) {
                    const data = brandSnap.data();
                    setBrandSetupData(data);

                    // Pre-fill form data if brand setup exists
                    if (data.brandName || data.industry || data.tone || data.audience) {
                        setUsingBrandData(true);
                        setFormData(prev => ({
                            ...prev,
                            coreTopic: data.industry || prev.coreTopic,
                            targetAudience: data.audience || prev.targetAudience,
                            // Parse tone if it's a string, otherwise use as array
                            tone: typeof data.tone === 'string'
                                ? data.tone.split(',').map(t => t.trim()).filter(t => TONE_OPTIONS.includes(t)).slice(0, 3)
                                : (Array.isArray(data.tone) ? data.tone : prev.tone)
                        }));
                    }
                }
            } catch (error) {
                console.error("Error fetching brand data:", error);
            }
        };

        fetchBrandData();
    }, [uid]);

    const updateData = useCallback((fn) => {
        if (typeof fn === 'function') {
            setFormData(fn);
        } else {
            setFormData(prev => ({ ...prev, ...fn }));
        }
    }, []);

    const nextStep = () => setCurrentStep(prev => prev + 1);

    const [loadingProgress, setLoadingProgress] = useState("");

    const finishGuide = async () => {
        if (!uid) return;

        setLoading(true);
        setLoadingProgress("Initializing roadmap generation...");

        // 1. Compile Dynamic Answers for AI Final Guide Prompt
        const dynamicAnswers = (formData.dynamicSteps || []).map(s => ({
            question: s.question,
            answer: formData[s.keyName] || 'N/A'
        }));

        // 2. Call AI to generate the detailed, multi-step plan
        let finalGuideData = {
            roadmapSteps: [],
            sevenDayChecklist: [],
            contentPillars: []
        };

        try {
            // A. Generate Roadmap Steps in Batches (6 batches of 5 = 30 steps)
            const totalSteps = 30;
            const batchSize = 5;
            const batches = Math.ceil(totalSteps / batchSize);
            let allSteps = [];

            for (let i = 0; i < batches; i++) {
                const startStep = i * batchSize + 1;
                const endStep = startStep + batchSize - 1;

                const progressMsg = `This may take a few minutes generating step (${startStep} to ${endStep}). AI is crafting your custom strategy.`;

                setLoadingProgress(progressMsg);



                const batchResponse = await generateContent({

                    type: "generateRoadmapBatch",

                    payload: {

                        topic: formData.coreTopic || 'General Content Strategy',

                        formData: formData,

                        dynamicAnswers: dynamicAnswers,

                        startStep: startStep,

                        endStep: endStep,

                        numSteps: batchSize

                    }

                });



                let batchData;

                try {

                    batchData = typeof batchResponse === 'object' ? batchResponse : JSON.parse(batchResponse);

                } catch (e) {



                    continue;

                }



                if (batchData.steps && Array.isArray(batchData.steps)) {

                    allSteps = [...allSteps, ...batchData.steps];

                }

            }



            // Map all aggregated steps

            finalGuideData.roadmapSteps = allSteps.map((step, index) => ({

                id: `step-${index + 1}`,

                title: step.title,

                description: step.description,

                detailedDescription: step.detailedDescription || step.description,

                phase: step.phase,

                timeEstimate: step.timeEstimate || "30 mins",

                suggestions: step.suggestions || [],

                resources: step.resources || [],

                actionItems: step.actionItems || [],

                generatorLink: step.generatorLink || null,

                type: 'ai-generated'

            }));



            // B. Generate Pillars (Separate Call)

            const pillarsResponse = await generateContent({

                type: "generatePillars",

                payload: { formData: formData }

            });

            const pillarsData = typeof pillarsResponse === 'object' ? pillarsResponse : JSON.parse(pillarsResponse);

            finalGuideData.contentPillars = pillarsData.contentPillars || ["Education", "Entertainment", "Inspiration"];



            // C. Generate 7-Day Checklist (Derived from first 7 steps)

            finalGuideData.sevenDayChecklist = finalGuideData.roadmapSteps.slice(0, 7).map((s, i) => `Day ${i + 1}: ${s.title}`);



            // Keep legacy structure

            finalGuideData.detailedGuide = { roadmapSteps: finalGuideData.roadmapSteps };


        } catch (e) {
            console.error("Final Guide API Call Failed:", e);
            // Fallback data
            finalGuideData.roadmapSteps = [
                { id: 'step-1', title: 'Setup Profile', description: 'Complete your bio and profile picture.', phase: 'Foundation', timeEstimate: "15 mins" },
                { id: 'step-2', title: 'First Post', description: 'Create and publish your first piece of content.', phase: 'Content Creation', timeEstimate: "1 hour" }
            ];
            finalGuideData.sevenDayChecklist = ["Day 1: Setup", "Day 2: Research", "Day 3: Plan", "Day 4: Create", "Day 5: Edit", "Day 6: Post", "Day 7: Engage"];
            finalGuideData.contentPillars = ["Education", "Entertainment", "Inspiration"];
        }

        // 3. Save Everything & RESET PROGRESS - Merge with existing brand data
        const brandRef = doc(db, "brands", uid);

        // Merge formData with existing brand setup data
        const mergedBrandData = {
            ...brandSetupData,
            industry: formData.coreTopic || brandSetupData?.industry,
            audience: formData.targetAudience || brandSetupData?.audience,
            tone: Array.isArray(formData.tone) ? formData.tone.join(', ') : (formData.tone || brandSetupData?.tone)
        };

        // RESET roadmapProgress to empty object to clear previous ticks
        await setDoc(brandRef, {
            ...mergedBrandData,
            onboarded: true,
            brandData: { ...formData, aiGenerated: finalGuideData },
            roadmapProgress: {} // <--- CRITICAL: RESET PROGRESS
        }, { merge: true });

        // 4. Award completion credits (10 credits for first-time completion)
        try {
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const funcs = getFunctions();
            const completeGuideFn = httpsCallable(funcs, 'completeGuide');

            const result = await completeGuideFn();

            // Show notification if credits were awarded
            if (result.data && result.data.creditsAwarded > 0) {
                alert(`🎉 ${result.data.message}\n\nYou now have ${result.data.newBalance} credits!`);
            }
        } catch (creditError) {
            console.error("Failed to award completion credits:", creditError);
            // Don't block navigation if credit award fails
        }

        if (setOnboardedStatus) setOnboardedStatus(true);
        setLoading(false);
        navigate("/guide/roadmap");
    };

    // Calculate total steps (Static 1-3 + Dynamic N)
    const totalSteps = CORE_STEPS_COUNT + (formData.dynamicSteps?.length || 0) + 1; // +1 for the final review/save step

    // Step Rendering Logic
    const renderStep = () => {
        if (currentStep === 1) return <Step1Niche data={formData} updateData={updateData} next={nextStep} usingBrandData={usingBrandData} />;
        if (currentStep === 2) return <Step2Platform data={formData} updateData={updateData} next={nextStep} />;
        if (currentStep === 3) return <Step3AI formData={formData} setFormData={setFormData} loading={loading} setLoading={setLoading} next={nextStep} />;

        // --- Dynamic Steps Logic ---
        if (currentStep > CORE_STEPS_COUNT && formData.dynamicSteps) {
            const dynamicIndex = currentStep - CORE_STEPS_COUNT - 1;

            if (dynamicIndex >= formData.dynamicSteps.length) {
                return <FinalReviewStep data={formData} finish={finishGuide} />;
            }

            const step = formData.dynamicSteps[dynamicIndex];
            return (
                <Step4ToN_Dynamic
                    key={step.stepId}
                    step={step}
                    stepNumber={currentStep}
                    totalSteps={totalSteps}
                    data={formData}
                    updateData={updateData}
                    next={nextStep}
                    finish={finishGuide}
                />
            );
        }

        if (currentStep > CORE_STEPS_COUNT && !formData.dynamicSteps) {
            return <div className="step-container">Loading custom guide...</div>;
        }

        if (currentStep === totalSteps && formData.dynamicSteps) {
            return <FinalReviewStep data={formData} finish={finishGuide} />;
        }

        return <div className="step-container">Step Not Found.</div>;
    };

    // --- LOADING OVERLAY ---
    if (loading) {
        return (
            <div className="guide-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 9999, background: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(10px)' }}>
                <div className="ai-loader" style={{ fontSize: '3rem', marginBottom: '20px' }}>🤖</div>
                <h2 style={{ color: 'white', marginBottom: '10px' }}>Generating Your 30-Step Roadmap...</h2>
                <p style={{ color: '#a0a0b0', fontSize: '1.1rem', animation: 'pulse 2s infinite' }}>
                    {loadingProgress || "This may take a few minutes. AI is crafting your custom strategy."}
                </p>
                <p style={{ color: '#ef4444', marginTop: '20px', fontWeight: 'bold', fontSize: '0.9rem' }}>
                    ⚠️ Do not close or refresh this page
                </p>
                <style>{`
                    @keyframes pulse {
                        0% { opacity: 0.6; }
                        50% { opacity: 1; }
                        100% { opacity: 0.6; }
                    }
                `}</style>
            </div>
        );
    }

    return (
        <div className="guide-container">
            <ProgressBar current={currentStep} total={totalSteps} />
            {renderStep()}
        </div>
    );
}
