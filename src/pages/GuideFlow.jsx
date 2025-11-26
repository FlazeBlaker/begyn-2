import { useState, useEffect, useCallback, useRef } from "react";
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

// --- ENHANCED PROGRESS BAR (Minimalist Floating) ---
const ProgressBar = ({ current, total }) => {
    const percentage = Math.min((current / total) * 100, 100);

    return (
        <div className="floating-progress-bubble" style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 1000,
            background: 'rgba(30, 30, 40, 0.8)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '50px',
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
            transition: 'all 0.3s ease'
        }}>
            <div style={{
                position: 'relative',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <svg width="40" height="40" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                    <circle
                        cx="50" cy="50" r="45"
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="8"
                        strokeDasharray="283"
                        strokeDashoffset={283 - (283 * percentage) / 100}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                </svg>
                <span style={{
                    position: 'absolute',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    color: 'white'
                }}>
                    {Math.round(percentage)}%
                </span>
            </div>
            <span style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.9rem',
                fontWeight: '500',
                display: 'none' // Hidden by default, can be shown on hover if needed
            }}>
                Progress
            </span>
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
            <h2>Your Niche</h2>
            <p>Tell us about what you create</p>

            <label htmlFor="coreTopic">What's your topic?</label>
            <input
                id="coreTopic"
                className="styled-input"
                name="coreTopic"
                value={data.coreTopic || ""}
                onChange={handleChange}
                placeholder="e.g., Tech Reviews, Fitness, Travel"
            />

            <label htmlFor="targetAudience">Who's your audience?</label>
            <input
                id="targetAudience"
                className="styled-input"
                name="targetAudience"
                value={data.targetAudience || ""}
                onChange={handleChange}
                placeholder="e.g., Young professionals, Gamers"
            />

            <label>Pick your vibe (up to 3)</label>
            <div className="grid-columns">
                {TONE_OPTIONS.map(tone => {
                    const isSelected = (data.tone || []).includes(tone);
                    return <div key={tone} className={`card ${isSelected ? "selected" : ""}`} onClick={() => handleToneSelect(tone)}>{tone}</div>;
                })}
            </div>

            <label htmlFor="primaryGoal">What's your goal?</label>
            <input
                id="primaryGoal"
                className="styled-input"
                name="primaryGoal"
                value={data.primaryGoal || ""}
                onChange={handleChange}
                placeholder="e.g., Build community, Make money"
            />

            <div className="button-row">
                <CustomButton text="Continue" onClick={next} disabled={isNextDisabled} />
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
            <h2>Your Time & Format</h2>
            <p>How much time can you invest?</p>

            <label htmlFor="timeCommitment">Hours per week</label>
            <input
                id="timeCommitment"
                className="styled-input"
                name="timeCommitment"
                value={data.timeCommitment || ""}
                onChange={handleChange}
                placeholder="e.g., 5-10 hours"
            />

            <label>Preferred content type (up to 3)</label>
            <div className="grid-columns">
                {CONTENT_PREFS.map(pref => {
                    const isSelected = (data.contentPreference || []).includes(pref);
                    return <div key={pref} className={`card ${isSelected ? "selected" : ""}`} onClick={() => handleContentPrefSelect(pref)}>{pref}</div>;
                })}
            </div>

            <div className="button-row">
                <CustomButton text="Continue" onClick={next} disabled={isNextDisabled} />
            </div>
        </div>
    );
};

// --- STEP 3: AI START (Iterative Entry Point) ---
const Step3AI = ({ formData, setFormData, loading, setLoading, next }) => {

    const startIterativeGuide = async () => {
        setLoading(true);
        try {
            // Initial call with empty history
            const responseString = await generateContent({
                type: "dynamicGuideIterative",
                payload: {
                    coreData: {
                        niche: formData.coreTopic,
                        goal: formData.primaryGoal,
                        tone: formData.tone,
                        commitment: formData.timeCommitment
                    },
                    history: []
                }
            });

            let result;
            try {
                if (typeof responseString === 'object' && responseString !== null) {
                    result = responseString;
                } else {
                    result = JSON.parse(responseString);
                }
            } catch (e) {
                console.error("Failed to parse AI JSON:", e);
                // Fallback
                result = {
                    ready: false,
                    question: {
                        text: "What is your main struggle right now?",
                        type: "text"
                    }
                };
            }

            if (result.ready) {
                // AI is satisfied immediately (unlikely but possible)
                setFormData(prev => ({ ...prev, dynamicSteps: [] }));
                setLoading(false);
                next(); // Go to Final Review (logic handles empty dynamicSteps)
            } else {
                // First Question
                const firstQuestion = {
                    stepId: 4,
                    question: result.question.text,
                    keyName: "dynamic_1",
                    type: result.question.type || "text",
                    options: result.question.options || [],
                    required: true
                };

                setFormData(prev => ({
                    ...prev,
                    dynamicSteps: [firstQuestion]
                }));
                setLoading(false);
                next();
            }

        } catch (error) {
            console.error("AI Start Error:", error);
            setLoading(false);
            // Fallback
            setFormData(prev => ({
                ...prev,
                dynamicSteps: [{
                    stepId: 4,
                    question: "What is your biggest challenge?",
                    keyName: "dynamic_fallback",
                    type: "text",
                    required: true
                }]
            }));
            next();
        }
    };

    return (
        <div className="step-container fadeIn" style={{ textAlign: "center" }}>
            <h2>Begyn AI Analysis</h2>
            <p>We'll ask you a few questions to build your perfect strategy.</p>
            {loading ? <div className="ai-loader">⚙️ Analyzing your niche...</div> :
                <CustomButton text="Start Begyn Interview" onClick={startIterativeGuide} disabled={!formData.coreTopic} />
            }
        </div>
    );
};

// --- DYNAMIC STEP RENDERING COMPONENT (Iterative) ---
const Step4ToN_Dynamic = ({ step, stepNumber, totalSteps, data, updateData, next, finish, loading, setLoading }) => {
    const [currentAnswer, setCurrentAnswer] = useState(data[step.keyName] || '');
    const [radioAnswer, setRadioAnswer] = useState(data[step.keyName] || '');
    const [showOtherInput, setShowOtherInput] = useState(false);
    const [otherValue, setOtherValue] = useState('');

    const handleIterativeNext = async () => {
        let answerToSave = step.type === 'radio' || step.type === 'select' ? radioAnswer : currentAnswer;
        if (radioAnswer === 'Other' && otherValue.trim()) {
            answerToSave = otherValue;
        }

        if (step.required && !answerToSave) {
            alert(`Please answer the question.`);
            return;
        }

        setLoading(true);

        // 1. Update State Locally
        const updatedFormData = { ...data, [step.keyName]: answerToSave };
        updateData(updatedFormData);

        // 2. Build History
        const history = (data.dynamicSteps || []).map(s => {
            // For the current step, use the new answer. For others, use stored answer.
            const ans = s.keyName === step.keyName ? answerToSave : (updatedFormData[s.keyName] || 'N/A');
            return { question: s.question, answer: ans };
        });

        // 3. Call AI for NEXT question
        try {
            const responseString = await generateContent({
                type: "dynamicGuideIterative",
                payload: {
                    coreData: {
                        niche: data.coreTopic,
                        goal: data.primaryGoal,
                        tone: data.tone,
                        commitment: data.timeCommitment
                    },
                    history: history
                }
            });

            let result;
            try {
                if (typeof responseString === 'object' && responseString !== null) {
                    result = responseString;
                } else {
                    result = JSON.parse(responseString);
                }
            } catch (e) {
                console.error("Failed to parse AI JSON:", e);
                result = { ready: true }; // Fallback to finish
            }

            if (result.ready || history.length >= 7) {
                // Done
                setLoading(false);
                next(); // Will move to Final Review because we didn't add a step
            } else {
                // New Question
                const newStep = {
                    stepId: step.stepId + 1,
                    question: result.question.text,
                    keyName: `dynamic_${history.length + 1}`,
                    type: result.question.type || "text",
                    options: result.question.options || [],
                    required: true
                };

                updateData(prev => ({
                    ...prev,
                    dynamicSteps: [...prev.dynamicSteps, newStep]
                }));
                setLoading(false);
                next();
            }

        } catch (error) {
            console.error("Iterative Error:", error);
            setLoading(false);
            next(); // Fallback to next (likely Final Review)
        }
    };

    const isNextDisabled = step.required && (
        (step.type === 'text' && !currentAnswer) ||
        ((step.type === 'radio' || step.type === 'select') && !radioAnswer) ||
        (radioAnswer === 'Other' && !otherValue.trim())
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
                        onKeyDown={(e) => { if (e.key === 'Enter' && !isNextDisabled) handleIterativeNext(); }}
                    />
                );
            case 'radio':
            case 'select':
                const optionsWithOther = step.options ? [...step.options, 'Other'] : ['Yes', 'No', 'Other'];
                return (
                    <>
                        <div className="grid-columns">
                            {optionsWithOther.map(option => {
                                const isSelected = radioAnswer === option;
                                return (
                                    <div
                                        key={option}
                                        className={`card ${isSelected ? "selected" : ""}`}
                                        onClick={() => {
                                            setRadioAnswer(option);
                                            setShowOtherInput(option === 'Other');
                                            if (option !== 'Other') setOtherValue('');
                                        }}
                                    >
                                        {option}
                                    </div>
                                );
                            })}
                        </div>
                        {showOtherInput && radioAnswer === 'Other' && (
                            <div className="other-input-container">
                                <input
                                    className="styled-input"
                                    value={otherValue}
                                    onChange={(e) => setOtherValue(e.target.value)}
                                    placeholder="Please specify..."
                                    autoFocus
                                />
                            </div>
                        )}
                    </>
                );
            default:
                return <input className="styled-input" />;
        }
    };

    return (
        <div className="step-container fadeIn">
            <h2>{step.question}</h2>
            {renderInput()}
            <div className="button-row">
                <CustomButton
                    text={loading ? "Thinking..." : "Next"}
                    onClick={handleIterativeNext}
                    disabled={isNextDisabled || loading}
                    loading={loading}
                />
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
            <h2>Final Review</h2>
            <p>Review your answers before we generate the roadmap.</p>
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
            </div>
            <div className="button-row">
                <CustomButton text="Generate Begyn Roadmap" onClick={finish} />
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
        dynamicSteps: null,
        totalDynamicSteps: 0
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

                    if (data.brandName || data.industry || data.tone || data.audience) {
                        setUsingBrandData(true);
                        setFormData(prev => ({
                            ...prev,
                            coreTopic: data.industry || prev.coreTopic,
                            targetAudience: data.audience || prev.targetAudience,
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

    const finishGuide = async () => {
        if (!uid) return;
        setLoading(true);

        const dynamicAnswers = (formData.dynamicSteps || []).map(s => ({
            question: s.question,
            answer: formData[s.keyName] || 'N/A'
        }));

        const brandRef = doc(db, "brands", uid);
        const mergedBrandData = {
            ...brandSetupData,
            industry: formData.coreTopic || brandSetupData?.industry,
            audience: formData.targetAudience || brandSetupData?.audience,
            tone: Array.isArray(formData.tone) ? formData.tone.join(', ') : (formData.tone || brandSetupData?.tone)
        };

        // Save inputs and set status to 'generating'
        await setDoc(brandRef, {
            ...mergedBrandData,
            onboarded: true,
            brandData: {
                ...formData,
                dynamicAnswers,
                roadmapStatus: 'generating'
            },
            roadmapProgress: {}
        }, { merge: true });

        if (setOnboardedStatus) setOnboardedStatus(true);
        setLoading(false);
        navigate("/guide/roadmap");
    };

    // Calculate total steps (Dynamic)
    // If dynamicSteps is null, we are at step 1-3.
    // If dynamicSteps exists, total is CORE_STEPS_COUNT + dynamicSteps.length + 1 (Final Review)
    const totalSteps = formData.dynamicSteps
        ? CORE_STEPS_COUNT + formData.dynamicSteps.length + 1
        : 8; // Placeholder total

    // --- 3D TILT LOGIC ---
    const containerRef = useRef(null);
    const cardRef = useRef(null);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;

        const { clientX, clientY } = e;
        const { innerWidth, innerHeight } = window;

        // Calculate rotation based on cursor position relative to center
        // Range: -15deg to +15deg
        const xRotation = ((clientY - innerHeight / 2) / innerHeight) * 30; // Rotate X (up/down)
        const yRotation = ((clientX - innerWidth / 2) / innerWidth) * 30;   // Rotate Y (left/right)

        cardRef.current.style.transform = `rotateX(${-xRotation}deg) rotateY(${yRotation}deg)`;
    };

    const handleMouseLeave = () => {
        if (cardRef.current) {
            cardRef.current.style.transform = `rotateX(0deg) rotateY(0deg)`;
        }
    };

    const renderStep = () => {
        if (currentStep === 1) return <Step1Niche data={formData} updateData={updateData} next={nextStep} usingBrandData={usingBrandData} />;
        if (currentStep === 2) return <Step2Platform data={formData} updateData={updateData} next={nextStep} />;
        if (currentStep === 3) return <Step3AI formData={formData} setFormData={setFormData} loading={loading} setLoading={setLoading} next={nextStep} />;

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
                    loading={loading}
                    setLoading={setLoading}
                />
            );
        }

        if (currentStep > CORE_STEPS_COUNT && !formData.dynamicSteps) {
            return <div className="step-container">Loading custom guide...</div>;
        }

        return <div className="step-container">Step Not Found.</div>;
    };

    if (loading && currentStep === 3) { // Only show full screen loader for initial generation
        return (
            <div className="guide-flow-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 9999, background: 'rgba(10, 10, 15, 0.95)', backdropFilter: 'blur(10px)' }}>
                <div className="ai-loader" style={{ fontSize: '3rem', marginBottom: '20px' }}>🚀</div>
                <h2 style={{ color: 'white', marginBottom: '10px' }}>Begyn AI is thinking...</h2>
                <p style={{ color: '#a0a0b0' }}>Crafting the next question for you.</p>
            </div>
        );
    }

    return (
        <div
            className="guide-flow-container"
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
        >
            <ProgressBar current={currentStep} total={totalSteps} />
            <div ref={cardRef} className="tilt-wrapper" style={{ transition: 'transform 0.1s ease-out', transformStyle: 'preserve-3d' }}>
                {renderStep()}
            </div>
        </div>
    );
}