// src/pages/YourGuidePage.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { auth, db, doc, getDoc, updateDoc, setDoc } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import { generateContent } from "../services/aiApi";
import "../styles/MobileMissionControl.css"; // New Mobile Styles
import Roadmap from "./guide/Roadmap";
import MobileRoadmap from "./guide/MobileRoadmap"; // New Mobile Component
import { calculateStreak } from "../utils/streakUtils";





// --- LOADING COMPONENT ---
const LoadingCard = ({ height = "clamp(180px, 20vh, 250px)", title }) => (
    <div className="final-card ai-shimmer" style={{ height, width: '100%', minHeight: height, position: 'relative', overflow: 'hidden' }}>
        {title && <div className="shimmer-line" style={{ width: '40%', height: '24px', marginBottom: '20px', background: 'rgba(255,255,255,0.1)' }}></div>}
        <div className="shimmer-line" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}></div>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div className="spin-loader" style={{ width: '30px', height: '30px', borderTopColor: '#a855f7' }}></div>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>Begynning...</span>
        </div>
    </div>
);



export default function YourGuidePage({ userInfo, setOnboardedStatus }) {
    // Derived state from props
    const brandData = userInfo?.brandData;
    const roadmapProgress = userInfo?.roadmapProgress || {};
    const loading = !userInfo; // Loading if userInfo is not yet available

    // Check if we are in generating state
    const isGenerating = brandData?.roadmapStatus === 'generating';
    const generationStartedRef = useRef(false);

    // Local loading states for independent sections
    const [loadingRoadmap, setLoadingRoadmap] = useState(isGenerating);


    const [isMobile, setIsMobile] = useState(window.innerWidth < 768); // Mobile detection
    const navigate = useNavigate();
    const uid = auth.currentUser?.uid;

    // console.log("YourGuidePage Rendered. UserInfo present:", !!userInfo, "Generating:", isGenerating);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- SPLIT GENERATION LOGIC ---
    useEffect(() => {
        const generateAll = async () => {
            if (!uid || !brandData || !isGenerating || generationStartedRef.current) return;

            generationStartedRef.current = true;
            // console.log("STARTING PARALLEL AI GENERATION...");

            // 1. Generate Roadmap Steps
            const pRoadmap = generateContent({
                type: "generateRoadmapSteps",
                payload: {
                    formData: brandData,
                    dynamicAnswers: brandData.dynamicAnswers || []
                }
            }).then(async (res) => {
                let data = typeof res === 'object' ? res : JSON.parse(res);
                const steps = (data.roadmapSteps || []).map((step, index) => ({
                    id: `step-${index + 1}`,
                    title: step.title,
                    description: step.description,
                    detailedDescription: step.detailedDescription || step.description,
                    phase: step.phase,
                    timeEstimate: step.timeEstimate || "30 mins",
                    suggestions: step.suggestions || [],
                    resources: step.resources || [],
                    suggestions: step.suggestions || [],
                    resources: step.resources || [],
                    actionItems: step.actionItems || step.subNodes || [], // Fallback for old data
                    generatorLink: step.generatorLink || null,
                    type: 'ai-generated'
                }));

                await updateDoc(doc(db, "brands", uid), {
                    "brandData.aiGenerated.roadmapSteps": steps
                });
                setLoadingRoadmap(false);
                return steps;
            }).catch(e => {
                console.error("Roadmap Gen Failed:", e);
                setLoadingRoadmap(false);
            });

            // Wait for all to finish to mark global status as complete
            await Promise.allSettled([pRoadmap]);

            // Final update to remove 'generating' status
            await updateDoc(doc(db, "brands", uid), {
                "brandData.roadmapStatus": "complete"
            });

            // Credits are now awarded on signup, not completion.

        };

        generateAll();
    }, [uid, brandData, isGenerating, userInfo]);




    // ... existing imports

    // ... existing imports

    const handleStepComplete = async (stepId) => {
        if (!uid) return;

        // --- PROGRESSION CHECKS ---
        const stepIndex = dynamicRoadmapSteps.findIndex(s => s.id === stepId);
        if (stepIndex === -1) return;

        // 1. Check if previous steps are completed
        if (stepIndex > 0) {
            const prevStep = dynamicRoadmapSteps[stepIndex - 1];
            const prevProgress = roadmapProgress[prevStep.id];
            if (!prevProgress?.completed) {
                alert("Please complete the previous step first!");
                return;
            }
        }

        // 2. Check if all action items are completed
        const step = dynamicRoadmapSteps[stepIndex];
        const currentProgress = roadmapProgress[stepId] || {};
        const actionItems = step.actionItems || [];

        // Check if every action item is marked as completed in progress
        // We store action item completion in 'subNodes' field in DB to preserve backward compatibility or just reuse the field name
        const allActionItemsDone = actionItems.every((_, i) => currentProgress.subNodes && currentProgress.subNodes[i]);

        if (actionItems.length > 0 && !allActionItemsDone) {
            alert("Please complete all action items first!");
            return;
        }

        try {
            // 1. Get current streak data
            const brandRef = doc(db, "brands", uid);
            const brandSnap = await getDoc(brandRef);

            let updates = {
                [`roadmapProgress.${stepId}.completed`]: true
            };

            if (brandSnap.exists()) {
                const data = brandSnap.data();
                const currentStreak = data.streak || 1;
                const lastActiveDate = data.lastActiveDate || null;

                // 2. Calculate new streak
                const { streak, lastActiveDate: newDate } = calculateStreak(currentStreak, lastActiveDate);

                // 3. Add to updates
                updates.streak = streak;
                updates.lastActiveDate = newDate;
            }

            // 4. Atomic update
            await updateDoc(brandRef, updates);

        } catch (error) {
            console.error("Error updating roadmap progress:", error);
        }
    };

    const [showResetPopup, setShowResetPopup] = useState(false);
    const [resetLoading, setResetLoading] = useState(false);

    const handleResetConfirm = async () => {
        if (!uid) return;
        setResetLoading(true);

        try {
            // 1. Deduct credits via backend
            await generateContent({ type: "payForGuideReset" });

            // 2. Reset local/firestore state
            if (setOnboardedStatus) setOnboardedStatus(false);
            await updateDoc(doc(db, "brands", uid), { onboarded: false });
            navigate("/guide/flow");

        } catch (error) {
            console.error("Reset failed:", error);
            alert("Failed to reset guide: " + (error.message || "Insufficient credits or network error."));
            setShowResetPopup(false);
        } finally {
            setResetLoading(false);
        }
    };

    const retakeGuide = () => {
        setShowResetPopup(true);
    };

    // Calculate Progress
    const progressStats = useMemo(() => {
        if (!brandData?.aiGenerated?.roadmapSteps) return { percent: 0, completed: 0, total: 0, nextStep: null };
        const steps = brandData.aiGenerated.roadmapSteps;
        const total = steps.length;
        const completed = steps.filter(s => roadmapProgress[s.id]?.completed).length;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
        const nextStep = steps.find(s => !roadmapProgress[s.id]?.completed) || null;
        return { percent, completed, total, nextStep };
    }, [brandData, roadmapProgress]);

    // --- CUSTOM POPUP COMPONENT ---
    const ResetPopup = () => {
        if (!showResetPopup) return null;
        return (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(5px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000
            }}>
                <div style={{
                    background: '#1e293b', padding: '30px', borderRadius: '16px',
                    border: '1px solid rgba(140, 100, 255, 0.3)', maxWidth: '400px', width: '90%',
                    textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⚠️</div>
                    <h3 style={{ color: 'white', marginBottom: '10px', fontSize: '1.5rem' }}>Reset Mission?</h3>
                    <p style={{ color: '#cbd5e1', marginBottom: '25px', lineHeight: '1.5' }}>
                        Regenerating your guide will cost <strong style={{ color: '#a855f7' }}>10 credits</strong>.
                        <br />This action cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                        <button onClick={() => setShowResetPopup(false)} style={{
                            padding: '10px 20px', borderRadius: '8px', border: '1px solid #475569',
                            background: 'transparent', color: '#cbd5e1', cursor: 'pointer', fontWeight: '600'
                        }} disabled={resetLoading}>
                            Cancel
                        </button>
                        <button onClick={handleResetConfirm} style={{
                            padding: '10px 20px', borderRadius: '8px', border: 'none',
                            background: '#a855f7', color: 'white', cursor: 'pointer', fontWeight: '600',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }} disabled={resetLoading}>
                            {resetLoading ? <div className="spin-loader" style={{ width: '16px', height: '16px', borderTopColor: 'white' }} /> : null}
                            Confirm & Pay
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        // console.log("Rendering LOADING state");
        return <div className="guide-container"><div className="ai-loader">Begynning...</div></div>;
    }

    // Check if brandData exists AND aiGenerated data exists AND the roadmap steps exist
    // BUT if we are generating, we want to show the UI with loaders
    if (!isGenerating && (!brandData || !brandData.aiGenerated || !brandData.aiGenerated.roadmapSteps)) {
        // console.log("Rendering NO MISSION state. BrandData:", brandData);
        return (
            <div className="guide-container">
                <div className="step-container" style={{ textAlign: 'center', padding: 'clamp(24px, 5vw, 40px)' }}>
                    <h2 style={{ fontSize: '2rem', marginBottom: '20px', color: 'var(--text-primary)' }}>No Active Mission Found</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>It looks like you haven't initialized your creator roadmap yet.</p>
                    <button onClick={retakeGuide} style={{ background: '#a855f7', color: 'white', padding: 'clamp(10px, 2vw, 12px) clamp(20px, 5vw, 30px)', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: '600', fontSize: 'clamp(1rem, 3vw, 1.1rem)' }}>
                        Initialize Begyn Mission Control
                    </button>
                </div>
            </div>
        );
    }


    const gen = brandData.aiGenerated || {};
    const { coreTopic, primaryGoal } = brandData;
    // Use local loading state or fallback to empty array
    const dynamicRoadmapSteps = (gen.roadmapSteps && gen.roadmapSteps.length > 0) ? gen.roadmapSteps : [];

    // Prepare steps with status for MobileRoadmap
    const mobileSteps = dynamicRoadmapSteps.map(step => {
        const stepProgress = roadmapProgress[step.id] || {};
        return {
            ...step,
            status: stepProgress.completed ? 'completed' : (step.id === progressStats.nextStep?.id ? 'in-progress' : 'locked'),
            ...step,
            status: stepProgress.completed ? 'completed' : (step.id === progressStats.nextStep?.id ? 'in-progress' : 'locked'),
            actionItems: (step.actionItems || []).map((item, i) => ({
                title: typeof item === 'string' ? item : item.title, // Handle both string and object (old data)
                completed: stepProgress.subNodes && stepProgress.subNodes[i] ? true : false
            }))
        };
    });

    const handleActionItemComplete = async (stepId, index) => {
        if (!uid) return;
        try {
            const brandRef = doc(db, "brands", uid);
            const brandSnap = await getDoc(brandRef);

            if (brandSnap.exists()) {
                const data = brandSnap.data();
                const currentProgress = data.roadmapProgress || {};
                const stepProgress = currentProgress[stepId] || {};
                const currentActionItems = stepProgress.subNodes || []; // We reuse 'subNodes' field in DB

                // Toggle the specific item
                const newActionItems = [...currentActionItems];
                // Ensure array is long enough
                while (newActionItems.length <= index) newActionItems.push(false);
                newActionItems[index] = !newActionItems[index];

                // Check if all items are now complete
                const step = dynamicRoadmapSteps.find(s => s.id === stepId);
                const totalItems = step?.actionItems?.length || 0;

                // We need to make sure we have enough booleans for all items
                // But 'every' on newActionItems might be misleading if it's shorter than totalItems
                // So let's check against the total count
                let allDone = true;
                if (totalItems > 0) {
                    // Fill up to totalItems with false if needed for checking
                    const checkArray = [...newActionItems];
                    while (checkArray.length < totalItems) checkArray.push(false);
                    allDone = checkArray.slice(0, totalItems).every(Boolean);
                }

                await updateDoc(brandRef, {
                    [`roadmapProgress.${stepId}.subNodes`]: newActionItems
                });

                // Auto-complete parent step if all items are done
                if (allDone) {
                    await handleStepComplete(stepId);
                }
            }
        } catch (error) {
            console.error("Error updating action item progress:", error);
        }
    };

    // console.log("Rendering DASHBOARD state. Generating:", isGenerating);
    return (
        <div className={`guide-container ${isMobile ? 'mobile-view' : ''}`} style={{
            minHeight: '100vh',
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: 'clamp(16px, 5vw, 40px)',
            maxWidth: 'min(95vw, 1400px)',
            width: '100%',
            margin: '0 auto',
            boxSizing: 'border-box'
        }}>

            {/* HEADER */}
            < div className="mobile-header" style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'clamp(20px, 5vw, 30px)',
                borderBottom: isMobile ? 'none' : '1px solid var(--border-color)',
                paddingBottom: 'clamp(16px, 4vw, 20px)',
                gap: 'clamp(12px, 4vw, 16px)'
            }}>
                <div style={{ flex: '1 1 auto', minWidth: 'clamp(180px, 30vw, 250px)' }}>
                    <h1 style={{
                        fontSize: 'clamp(1.8rem, 6vw, 2.5rem)',
                        margin: 0,
                        background: 'linear-gradient(to right, var(--text-primary), #a855f7)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        lineHeight: '1.2'
                    }}>

                        Begyn Mission Control
                    </h1>
                    <p style={{
                        color: 'var(--text-secondary)',
                        margin: 'clamp(5px, 2vw, 8px) 0 0 0',
                        fontSize: 'clamp(0.85rem, 3vw, 1rem)'
                    }}>Your Begyn command center for content domination.</p>
                </div>
                {!isGenerating && (
                    <button onClick={retakeGuide} style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-primary)',
                        padding: 'clamp(10px, 2vw, 12px) clamp(16px, 4vw, 20px)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontSize: 'clamp(0.85rem, 3vw, 0.9rem)',
                        minHeight: '44px',
                        whiteSpace: 'nowrap'
                    }}>
                        🔄 Reset Mission
                    </button>
                )}
            </div >

            {/* DASHBOARD GRID */}
            < div className={`dashboard-grid ${isMobile ? 'mobile-dashboard' : ''}`} style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                gap: 'clamp(16px, 4vw, 20px)',
                marginBottom: 'clamp(30px, 6vw, 40px)'
            }}>

                {/* CARD 1: MISSION STATUS */}
                {loadingRoadmap ? <LoadingCard height="180px" title /> : (
                    < div className={`final-card ${isMobile ? 'mobile-card' : ''}`} style={{
                        background: 'var(--bg-card)',
                        border: '1px solid rgba(168, 85, 247, 0.3)',
                        padding: 'clamp(16px, 4vw, 20px)',
                        borderRadius: '16px',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <h3 style={{
                            color: '#a855f7',
                            fontSize: 'clamp(0.8rem, 3vw, 0.9rem)',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: 'clamp(12px, 3vw, 15px)'
                        }}>Begyn Status</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'clamp(15px, 4vw, 20px)', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', width: 'clamp(70px, 15vw, 80px)', height: 'clamp(70px, 15vw, 80px)' }}>
                                <svg width="100%" height="100%" viewBox="0 0 100 100">
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border-color)" strokeWidth="10" />
                                    <circle cx="50" cy="50" r="45" fill="none" stroke="#a855f7" strokeWidth="10" strokeDasharray="283" strokeDashoffset={283 - (283 * progressStats.percent) / 100} transform="rotate(-90 50 50)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
                                </svg>
                                <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(1rem, 4vw, 1.2rem)', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                                    {progressStats.percent}%
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 'clamp(1.3rem, 5vw, 1.5rem)', fontWeight: 'bold', color: 'var(--text-primary)' }}>{progressStats.completed} / {progressStats.total}</div>
                                <div style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 3vw, 0.9rem)' }}>Steps Completed</div>
                            </div>
                        </div>
                    </div >
                )}

                {/* CARD 2: CURRENT OBJECTIVE */}
                {loadingRoadmap ? <LoadingCard height="180px" title /> : (
                    < div className={`final-card ${isMobile ? 'mobile-card' : ''}`} style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        padding: 'clamp(16px, 4vw, 20px)',
                        borderRadius: '16px',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <h3 style={{
                            color: '#34d399',
                            fontSize: 'clamp(0.8rem, 3vw, 0.9rem)',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: 'clamp(12px, 3vw, 15px)'
                        }}>Begyn Objective</h3>
                        <div style={{ fontSize: 'clamp(1rem, 4vw, 1.1rem)', fontWeight: '600', marginBottom: 'clamp(5px, 2vw, 8px)', color: 'var(--text-primary)', lineHeight: '1.3' }}>{coreTopic || 'Niche Undefined'}</div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: 'clamp(0.85rem, 3vw, 0.9rem)' }}>Goal: {primaryGoal || 'Growth'}</div>
                        {
                            progressStats.nextStep && (
                                <div style={{ marginTop: 'clamp(12px, 3vw, 15px)', padding: 'clamp(10px, 3vw, 12px)', background: 'rgba(52, 211, 153, 0.1)', borderLeft: '3px solid #34d399', borderRadius: '6px' }}>
                                    <div style={{ fontSize: 'clamp(0.75rem, 3vw, 0.8rem)', color: '#34d399', fontWeight: 'bold' }}>NEXT UP:</div>
                                    <div style={{ fontSize: 'clamp(0.85rem, 3vw, 0.9rem)', color: 'var(--text-primary)', marginTop: '4px', lineHeight: '1.4' }}>{progressStats.nextStep.title}</div>
                                </div>
                            )
                        }
                    </div >
                )}

                {/* CARD 3: QUICK ACTIONS */}
                {loadingRoadmap ? <LoadingCard height="180px" title /> : (
                    < div className={`final-card ${isMobile ? 'mobile-card' : ''}`} style={{
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        padding: 'clamp(16px, 4vw, 20px)',
                        borderRadius: '16px',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <h3 style={{
                            color: '#60a5fa',
                            fontSize: 'clamp(0.8rem, 3vw, 0.9rem)',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            marginBottom: 'clamp(12px, 3vw, 15px)'
                        }}>Quick Access</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(8px, 2vw, 10px)' }}>
                            <button
                                onClick={() => document.getElementById('roadmap-section').scrollIntoView({ behavior: 'smooth' })}
                                style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    padding: 'clamp(12px, 3vw, 15px)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    fontSize: 'clamp(0.85rem, 3vw, 0.95rem)',
                                    minHeight: '60px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <span style={{ fontSize: 'clamp(1.2rem, 5vw, 1.5rem)' }}>🗺️</span>
                                <span>Roadmap</span>
                            </button>

                            <button
                                onClick={() => {
                                    // Scroll to roadmap section first
                                    document.getElementById('roadmap-section')?.scrollIntoView({ behavior: 'smooth' });

                                    // Then scroll to the current task
                                    setTimeout(() => {
                                        if (progressStats.nextStep) {
                                            const stepElement = document.getElementById(`step-${progressStats.nextStep.id}`);
                                            if (stepElement) {
                                                stepElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                // For mobile, also expand the step
                                                if (isMobile) {
                                                    stepElement.click();
                                                }
                                            }
                                        }
                                    }, 500);
                                }}
                                disabled={!progressStats.nextStep}
                                style={{
                                    background: progressStats.nextStep ? 'linear-gradient(135deg, #34d399, #10b981)' : 'var(--bg-secondary)',
                                    border: progressStats.nextStep ? '1px solid rgba(52, 211, 153, 0.3)' : '1px solid var(--border-color)',
                                    padding: 'clamp(12px, 3vw, 15px)',
                                    borderRadius: '8px',
                                    color: progressStats.nextStep ? '#fff' : 'var(--text-secondary)',
                                    cursor: progressStats.nextStep ? 'pointer' : 'not-allowed',
                                    textAlign: 'center',
                                    fontSize: 'clamp(0.85rem, 3vw, 0.95rem)',
                                    minHeight: '60px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '4px',
                                    transition: 'all 0.2s',
                                    boxShadow: progressStats.nextStep ? '0 4px 12px rgba(52, 211, 153, 0.2)' : 'none'
                                }}
                            >
                                <span style={{ fontSize: 'clamp(1.2rem, 5vw, 1.5rem)' }}>🎯</span>
                                <span>{progressStats.nextStep ? 'Current Task' : 'All Complete!'}</span>
                            </button>
                        </div>
                    </div >
                )}
            </div >



            {/* ROADMAP SECTION */}
            < div id="roadmap-section" style={{ marginTop: 'clamp(40px, 8vw, 50px)' }}>
                {
                    loadingRoadmap ? <LoadingCard height="400px" title /> : (
                        isMobile ? (
                            <MobileRoadmap
                                steps={mobileSteps}
                                onStepComplete={handleStepComplete}
                                onActionItemComplete={handleActionItemComplete}
                            />
                        ) : (
                            <>
                                <h2 style={{ fontSize: 'clamp(1.4rem, 5vw, 1.8rem)', marginBottom: 'clamp(16px, 4vw, 20px)', color: 'var(--text-primary)' }} >🗺️ The Begyn Journey</h2 >
                                <Roadmap steps={dynamicRoadmapSteps} />
                            </>
                        )
                    )
                }
            </div >

            {/* POPUPS */}
            <ResetPopup />

        </div >
    );
}
