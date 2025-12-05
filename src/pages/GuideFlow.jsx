import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db, doc, setDoc, getDoc } from "../services/firebase";
import { generateContent } from "../services/aiApi";
import "../styles/GuideFlowStyles.css";

// --- PHASE 1 OPTIONS ---
const TONE_OPTIONS = ["Witty", "Professional", "Cozy", "Bold", "Playful", "Inspirational"];
const CORE_STEPS_COUNT = 3;

// --- TRANSITION OVERLAY ---
const TransitionOverlay = ({ show }) => {
    if (!show) return null;
    return (
        <div className="transition-overlay">
            <div className="processing-orb"></div>
            <div className="processing-text">AI is processing...</div>
        </div>
    );
};

// --- LEFT PANEL COMPONENT (CONTEXT) ---
const LeftPanel = ({ stepNumber, title, description }) => {
    return (
        <div className="left-panel">
            <div className="ai-avatar-large">✨</div>
            <div className="context-step">Step {stepNumber.toString().padStart(2, '0')}</div>
            <h1 className="context-title">{title}</h1>
            <p className="context-description">{description}</p>
        </div>
    );
};

// --- STEP 1: Define the Niche & Goal ---
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
        <div className="form-container">
            {usingBrandData && (
                <div style={{ background: 'rgba(124, 77, 255, 0.1)', padding: '16px', borderRadius: '12px', marginBottom: '24px', color: '#CE93D8', border: '1px solid rgba(124, 77, 255, 0.3)' }}>
                    ✨ Pre-filled from your Brand Setup!
                </div>
            )}

            <div className="input-group">
                <label className="input-label">Core Topic / Niche *</label>
                <input className="premium-input" name="coreTopic" value={data.coreTopic || ""} onChange={handleChange} placeholder="e.g., Retro Gaming" />
            </div>

            <div className="input-group">
                <label className="input-label">Target Audience *</label>
                <input className="premium-input" name="targetAudience" value={data.targetAudience || ""} onChange={handleChange} placeholder="Who are you talking to?" />
            </div>

            <div className="input-group">
                <label className="input-label">Creator Personality (Max 3) *</label>
                <div className="options-grid">
                    {TONE_OPTIONS.map(tone => {
                        const isSelected = (data.tone || []).includes(tone);
                        return (
                            <div key={tone} className={`option-card ${isSelected ? "selected" : ""}`} onClick={() => handleToneSelect(tone)}>
                                {tone}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="input-group">
                <label className="input-label">Primary Goal *</label>
                <input className="premium-input" name="primaryGoal" value={data.primaryGoal || ""} onChange={handleChange} placeholder="e.g., Build Community" />
            </div>

            <div className="action-bar">
                <button className="premium-button" onClick={next} disabled={isNextDisabled}>
                    Continue <span>→</span>
                </button>
            </div>
        </div>
    );
};

// --- STEP 2: Platform Selection ---
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
        <div className="form-container">
            <div className="input-group">
                <label className="input-label">Time Commitment (Hours/Week) *</label>
                <input className="premium-input" name="timeCommitment" value={data.timeCommitment || ""} onChange={handleChange} placeholder="e.g., 10 hours" />
            </div>

            <div className="input-group">
                <label className="input-label">Content Preference (Max 3) *</label>
                <div className="options-grid">
                    {CONTENT_PREFS.map(pref => {
                        const isSelected = (data.contentPreference || []).includes(pref);
                        return (
                            <div key={pref} className={`option-card ${isSelected ? "selected" : ""}`} onClick={() => handleContentPrefSelect(pref)}>
                                {pref}
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="action-bar">
                <button className="premium-button" onClick={next} disabled={isNextDisabled}>
                    Continue <span>→</span>
                </button>
            </div>
        </div>
    );
};

// --- STEP 3: AI Analysis ---
const Step3AI = ({ formData, setFormData, loading, setLoading, next }) => {
    const AI_SCHEMA = {
        type: "object",
        properties: {
            questions: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        stepId: { type: "number" },
                        question: { type: "string" },
                        keyName: { type: "string" },
                        type: { type: "string", description: "Always use 'radio' or 'select'" },
                        options: { type: "array", items: { type: "string" }, description: "List of 3-4 options for the user to choose from. REQUIRED." },
                        required: { type: "boolean" }
                    },
                    required: ["stepId", "question", "keyName", "type", "options", "required"]
                }
            }
        },
        required: ["questions"]
    };

    const startGeneration = async () => {
        setLoading(true);
        try {
            const responseString = await generateContent({
                type: "dynamicGuide",
                payload: {
                    topic: formData.coreTopic,
                    coreData: { niche: formData.coreTopic, tone: formData.tone, commitment: formData.timeCommitment },
                    schema: AI_SCHEMA
                }
            });

            let result;
            try {
                result = (typeof responseString === 'object' && responseString !== null) ? responseString : JSON.parse(responseString);
            } catch (e) {
                console.error("Failed to parse AI JSON:", e);
                result = { questions: [] };
            }

            const dynamicQuestions = (result.questions && result.questions.length > 0) ? result.questions : [
                { stepId: 4, question: "What is your main struggle?", keyName: "struggle", type: "text", required: true },
                { stepId: 5, question: "Do you have a budget?", keyName: "budget", type: "radio", options: ["No", "Small", "Large"], required: true }
            ];

            setFormData(prev => ({ ...prev, dynamicSteps: dynamicQuestions, totalDynamicSteps: dynamicQuestions.length }));
            setLoading(false);
            next();
        } catch (error) {
            console.error("AI Generation Error:", error);
            setLoading(false);
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
        <div className="form-container" style={{ textAlign: 'center', paddingTop: '40px' }}>
            <div className="processing-orb" style={{ width: '120px', height: '120px', margin: '0 auto 40px auto' }}></div>
            <button className="premium-button" onClick={startGeneration} disabled={loading || !formData.coreTopic} style={{ margin: '0 auto' }}>
                {loading ? "Generating..." : "Generate Custom Roadmap"}
            </button>
        </div>
    );
};

// --- DYNAMIC STEP ---
const Step4ToN_Dynamic = ({ step, stepNumber, totalSteps, data, updateData, next, finish }) => {
    const [currentAnswer, setCurrentAnswer] = useState(data[step.keyName] || '');
    const [radioAnswer, setRadioAnswer] = useState(data[step.keyName] && step.options?.includes(data[step.keyName]) ? data[step.keyName] : (data[step.keyName] ? 'Other' : ''));
    const [otherText, setOtherText] = useState(data[step.keyName] && !step.options?.includes(data[step.keyName]) ? data[step.keyName] : '');

    const inputType = (step.type || 'text').toLowerCase();
    // Force ALL dynamic steps to be choice types to satisfy user request
    // "text field should only apear if i clicked the other options"
    const isChoiceType = true;
    const isTextType = false;

    const handleNext = () => {
        let answerToSave = '';

        if (isChoiceType) {
            answerToSave = (radioAnswer === 'Other') ? otherText : radioAnswer;
        } else {
            // Default to text handling for text types AND unknown types (fallback)
            answerToSave = currentAnswer;
        }

        if (step.required && !answerToSave) {
            alert(`Please answer the question for Step ${stepNumber}.`);
            return;
        }

        updateData({ [step.keyName]: answerToSave });
        if (stepNumber === totalSteps) finish();
        else next();
    };

    const isNextDisabled = step.required && (
        (isChoiceType && (!radioAnswer || (radioAnswer === 'Other' && !otherText))) ||
        (!isChoiceType && !currentAnswer)
    );

    const renderInput = () => {
        // Force choice type logic
        if (isChoiceType) {
            // Create a safe copy of options, defaulting to empty array if undefined
            let optionsToRender = step.options ? [...step.options] : [];

            // Ensure 'Other' is always present
            if (!optionsToRender.includes("Other")) {
                optionsToRender.push("Other");
            }

            return (
                <div className="input-group">
                    <div className="options-grid">
                        {optionsToRender.map((option, index) => {
                            const isSelected = radioAnswer === option;
                            return (
                                <div
                                    key={`${option}-${index}`}
                                    className={`option-card ${isSelected ? "selected" : ""}`}
                                    onClick={() => {
                                        setRadioAnswer(option);
                                        if (option !== 'Other') setOtherText('');
                                    }}
                                >
                                    {option}
                                </div>
                            );
                        })}
                    </div>
                    {radioAnswer === "Other" && (
                        <div style={{ marginTop: '15px' }}>
                            <input
                                className="premium-input"
                                value={otherText}
                                onChange={(e) => setOtherText(e.target.value)}
                                placeholder="Type your custom answer..."
                                autoFocus
                            />
                        </div>
                    )}
                </div>
            );
        }

        // Fallback (should not be reached given isChoiceType=true)
        return <input className="premium-input" value={currentAnswer} onChange={(e) => setCurrentAnswer(e.target.value)} placeholder="Type your answer here..." />;
    };

    return (
        <div className="form-container">
            {step.required && <p style={{ color: '#F48FB1', fontSize: '0.9rem', marginBottom: '16px' }}>(Required)</p>}
            <div className="input-group">{renderInput()}</div>
            <div className="action-bar">
                <button className="premium-button" onClick={handleNext} disabled={isNextDisabled}>
                    {stepNumber === totalSteps ? "Finish" : "Next"} <span>→</span>
                </button>
            </div>
        </div>
    );
};

// --- FINAL REVIEW STEP ---
const FinalReviewStep = ({ data, finish }) => {
    const dynamicAnswers = (data.dynamicSteps || []).map(s => ({ question: s.question, answer: data[s.keyName] || 'N/A' }));

    return (
        <div className="form-container">
            <div className="final-review-grid">
                <div className="final-card"><h3>Core Foundation</h3><p>Niche: {data.coreTopic}</p><p>Tone: {(data.tone || []).join(', ')}</p></div>
                <div className="final-card"><h3>Commitment</h3><p>{data.timeCommitment}</p></div>
                {dynamicAnswers.map((item, i) => (
                    <div key={i} className="final-card"><h3>{item.question}</h3><p>{item.answer}</p></div>
                ))}
            </div>
            <div className="action-bar">
                <button className="premium-button" onClick={finish}>Generate Roadmap <span>✨</span></button>
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
        aiGenerated: null, dynamicSteps: null, totalDynamicSteps: 0
    });
    const [loading, setLoading] = useState(false);
    const [brandSetupData, setBrandSetupData] = useState(null);
    const [usingBrandData, setUsingBrandData] = useState(false);
    const [showProcessing, setShowProcessing] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState("");

    const navigate = useNavigate();
    const location = useLocation(); // Import useLocation
    const uid = auth.currentUser?.uid;

    useEffect(() => {
        // Access Control: Only allow entry if state.allowed is true
        if (!location.state?.allowed) {
            navigate('/dashboard', { replace: true });
        }
    }, [location, navigate]);

    useEffect(() => {
        const fetchBrandData = async () => {
            if (!uid) return;
            try {
                const brandRef = doc(db, "brands", uid);
                const brandSnap = await getDoc(brandRef);
                if (brandSnap.exists()) {
                    const data = brandSnap.data();
                    setBrandSetupData(data);
                    if (data.brandName || data.industry || data.tone || data.audience) {
                        setUsingBrandData(true);
                        setFormData(prev => ({
                            ...prev,
                            coreTopic: data.industry || prev.coreTopic,
                            targetAudience: data.audience || prev.targetAudience,
                            tone: typeof data.tone === 'string' ? data.tone.split(',').map(t => t.trim()).filter(t => TONE_OPTIONS.includes(t)).slice(0, 3) : (Array.isArray(data.tone) ? data.tone : prev.tone)
                        }));
                    }
                }
            } catch (error) { console.error("Error fetching brand data:", error); }
        };
        fetchBrandData();
    }, [uid]);

    useEffect(() => {
        const handleBeforeUnload = (e) => { e.preventDefault(); e.returnValue = "Warning"; return "Warning"; };
        const handlePopState = () => {
            if (window.confirm("Warning: Leave now?")) {
                window.removeEventListener("popstate", handlePopState);
                if (uid) setDoc(doc(db, "brands", uid), { onboarded: true }, { merge: true }).catch(console.error);
                if (setOnboardedStatus) setOnboardedStatus(true);
                navigate('/dashboard');
            } else {
                window.history.pushState(null, "", window.location.pathname);
            }
        };
        window.history.pushState(null, "", window.location.pathname);
        window.addEventListener("beforeunload", handleBeforeUnload);
        window.addEventListener("popstate", handlePopState);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            window.removeEventListener("popstate", handlePopState);
        };
    }, [navigate, uid, setOnboardedStatus]);

    const updateData = useCallback((fn) => { if (typeof fn === 'function') setFormData(fn); else setFormData(prev => ({ ...prev, ...fn })); }, []);

    const nextStep = () => {
        setShowProcessing(true);
        setTimeout(() => {
            setShowProcessing(false);
            setCurrentStep(prev => prev + 1);
        }, 800);
    };

    const finishGuide = async () => {
        if (!uid) return;
        setLoading(true);
        setLoadingProgress("Initializing roadmap generation...");

        const dynamicAnswers = (formData.dynamicSteps || []).map(s => ({ question: s.question, answer: formData[s.keyName] || 'N/A' }));
        let finalGuideData = { roadmapSteps: [], sevenDayChecklist: [], contentPillars: [] };

        try {
            const totalSteps = 60;
            const batchSize = 5;
            const batches = Math.ceil(totalSteps / batchSize);
            let allSteps = [];

            for (let i = 0; i < batches; i++) {
                const startStep = i * batchSize + 1;
                const endStep = startStep + batchSize - 1;
                setLoadingProgress(`Generating steps ${startStep}-${endStep} of 30...`);

                // Context: Pass the last 5 steps to maintain continuity
                const previousStepsContext = allSteps.slice(-5).map(s => ({ title: s.title, description: s.description }));

                const batchResponse = await generateContent({
                    type: "generateRoadmapBatch",
                    payload: {
                        topic: formData.coreTopic || 'General Content Strategy',
                        formData: formData,
                        dynamicAnswers: dynamicAnswers,
                        startStep: startStep,
                        endStep: endStep,
                        numSteps: batchSize,
                        previousSteps: previousStepsContext // NEW: Pass context
                    }
                });
                let batchData;
                try { batchData = typeof batchResponse === 'object' ? batchResponse : JSON.parse(batchResponse); } catch (e) { continue; }
                if (batchData.steps && Array.isArray(batchData.steps)) allSteps = [...allSteps, ...batchData.steps];
            }

            finalGuideData.roadmapSteps = allSteps.map((step, index) => ({
                id: `step-${index + 1}`, title: step.title, description: step.description, detailedDescription: step.detailedDescription || step.description, phase: step.phase, timeEstimate: step.timeEstimate || "30 mins", suggestions: step.suggestions || [], resources: step.resources || [], actionItems: step.actionItems || [], generatorLink: step.generatorLink || null, type: 'ai-generated'
            }));

            const pillarsResponse = await generateContent({ type: "generatePillars", payload: { formData: formData } });
            const pillarsData = typeof pillarsResponse === 'object' ? pillarsResponse : JSON.parse(pillarsResponse);
            finalGuideData.contentPillars = pillarsData.contentPillars || ["Education", "Entertainment", "Inspiration"];
            finalGuideData.sevenDayChecklist = finalGuideData.roadmapSteps.slice(0, 7).map((s, i) => `Day ${i + 1}: ${s.title}`);
            finalGuideData.detailedGuide = { roadmapSteps: finalGuideData.roadmapSteps };

        } catch (e) {
            console.error("Final Guide API Call Failed:", e);
            finalGuideData.roadmapSteps = [{ id: 'step-1', title: 'Setup Profile', description: 'Complete your bio.', phase: 'Foundation', timeEstimate: "15 mins" }];
            finalGuideData.sevenDayChecklist = ["Day 1: Setup"];
            finalGuideData.contentPillars = ["Education"];
        }

        const brandRef = doc(db, "brands", uid);
        const mergedBrandData = { ...brandSetupData, industry: formData.coreTopic || brandSetupData?.industry, audience: formData.targetAudience || brandSetupData?.audience, tone: Array.isArray(formData.tone) ? formData.tone.join(', ') : (formData.tone || brandSetupData?.tone) };
        await setDoc(brandRef, { ...mergedBrandData, onboarded: true, brandData: { ...formData, aiGenerated: finalGuideData }, roadmapProgress: {} }, { merge: true });

        try {
            const { getFunctions, httpsCallable } = await import('firebase/functions');
            const funcs = getFunctions();
            const completeGuideFn = httpsCallable(funcs, 'completeGuide');
            await completeGuideFn();
            // Alert removed as no credits are awarded anymore
        } catch (creditError) { console.error("Failed to award completion credits:", creditError); }

        if (setOnboardedStatus) setOnboardedStatus(true);
        setLoading(false);
        navigate("/roadmap");
    };

    const totalSteps = CORE_STEPS_COUNT + (formData.dynamicSteps?.length || 0) + 1;

    // --- RENDER HELPERS ---
    const getStepInfo = () => {
        if (currentStep === 1) return { title: "Core Foundation", description: "Let's define the soul of your brand." };
        if (currentStep === 2) return { title: "Platform Strategy", description: "Where will you build your empire?" };
        if (currentStep === 3) return { title: "AI Analysis", description: "Analyzing your niche to generate custom strategy steps." };
        if (currentStep > CORE_STEPS_COUNT && formData.dynamicSteps) {
            const dynamicIndex = currentStep - CORE_STEPS_COUNT - 1;
            if (dynamicIndex >= formData.dynamicSteps.length) return { title: "Final Review", description: "Confirm your strategy before we generate the roadmap." };
            return { title: formData.dynamicSteps[dynamicIndex].question, description: "Help us tailor the roadmap to your specific needs." };
        }
        return { title: "Loading...", description: "Please wait." };
    };

    const stepInfo = getStepInfo();

    const renderRightPanel = () => {
        if (currentStep === 1) return <Step1Niche data={formData} updateData={updateData} next={nextStep} usingBrandData={usingBrandData} />;
        if (currentStep === 2) return <Step2Platform data={formData} updateData={updateData} next={nextStep} />;
        if (currentStep === 3) return <Step3AI formData={formData} setFormData={setFormData} loading={loading} setLoading={setLoading} next={nextStep} />;
        if (currentStep > CORE_STEPS_COUNT && formData.dynamicSteps) {
            const dynamicIndex = currentStep - CORE_STEPS_COUNT - 1;
            if (dynamicIndex >= formData.dynamicSteps.length) return <FinalReviewStep data={formData} finish={finishGuide} />;
            return <Step4ToN_Dynamic key={formData.dynamicSteps[dynamicIndex].stepId} step={formData.dynamicSteps[dynamicIndex]} stepNumber={currentStep} totalSteps={totalSteps} data={formData} updateData={updateData} next={nextStep} finish={finishGuide} />;
        }
        return <div>Loading...</div>;
    };

    if (loading) {
        return (
            <div className="guide-flow-split-layout" style={{ flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 9999, background: 'rgba(5, 5, 7, 0.98)' }}>
                <div className="processing-orb" style={{ width: '150px', height: '150px' }}></div>
                <h2 style={{ color: 'white', marginTop: '40px', fontSize: '2rem' }}>Generating Your Roadmap...</h2>
                <p style={{ color: '#a0a0b0', fontSize: '1.2rem', marginTop: '16px' }}>{loadingProgress}</p>
                <p style={{ color: '#ef4444', marginTop: '32px', fontWeight: 'bold' }}>⚠️ Do not close this page</p>
            </div>
        );
    }

    return (
        <div className="guide-flow-split-layout">
            <TransitionOverlay show={showProcessing} />
            <LeftPanel stepNumber={currentStep} title={stepInfo.title} description={stepInfo.description} />
            <div className="right-panel">
                <div className="progress-container">
                    <div className="progress-fill" style={{ width: `${Math.min(currentStep / totalSteps, 1) * 100}%` }} />
                </div>
                {renderRightPanel()}
            </div>
        </div>
    );
}


