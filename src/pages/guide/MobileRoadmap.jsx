import React, { useState } from 'react';
import { auth, db, doc, updateDoc } from '../../services/firebase';

const MobileRoadmap = ({ steps, onStepComplete, onSubNodeComplete }) => {
    const [expandedStep, setExpandedStep] = useState(null);

    const handleMarkDone = async (stepId) => {
        // Call parent callback to update state
        if (onStepComplete) {
            await onStepComplete(stepId);
        }

        // Close the expanded step
        setExpandedStep(null);

        // Find the next incomplete step and expand it
        const currentIndex = steps.findIndex(s => s.id === stepId);
        if (currentIndex < steps.length - 1) {
            const nextStep = steps[currentIndex + 1];
            if (nextStep.status !== 'completed') {
                setTimeout(() => {
                    setExpandedStep(nextStep.id);
                    // Scroll to the next step
                    const element = document.getElementById(`step-${nextStep.id}`);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 300);
            }
        }
    };

    return (
        <div className="mobile-roadmap-container">
            <h2 className="mobile-roadmap-title">Your Journey</h2>
            <div className="mobile-timeline">
                {steps.map((step, index) => {
                    const isCompleted = step.status === 'completed';
                    const isCurrent = step.status === 'in-progress';
                    const isLocked = step.status === 'locked';
                    const isExpanded = expandedStep === step.id;

                    let statusClass = 'locked';
                    let icon = '🔒';

                    if (isCompleted) {
                        statusClass = 'completed';
                        icon = '✓';
                    } else if (isCurrent) {
                        statusClass = 'current';
                        icon = '📍';
                    }

                    return (
                        <div
                            key={step.id}
                            id={`step-${step.id}`}
                            className={`timeline-step ${statusClass} ${isExpanded ? 'expanded' : ''}`}
                        >
                            <div className="timeline-icon">{icon}</div>
                            <div className="timeline-content">
                                <div
                                    className="timeline-title"
                                    onClick={() => {
                                        if (!isLocked) {
                                            setExpandedStep(isExpanded ? null : step.id);
                                        }
                                    }}
                                    style={{ cursor: isLocked ? 'not-allowed' : 'pointer' }}
                                >
                                    {step.title}
                                </div>

                                {!isExpanded && (
                                    <>
                                        <div className="timeline-desc">{step.description}</div>
                                        <div className="timeline-meta">
                                            <span>⏱️ {step.timeEstimate || '30 mins'}</span>
                                            <span>{step.category || 'General'}</span>
                                        </div>
                                    </>
                                )}

                                {isExpanded && (
                                    <div className="timeline-details">
                                        <div className="timeline-desc-full">{step.detailedDescription || step.description}</div>
                                        <div className="timeline-meta">
                                            <span>⏱️ {step.timeEstimate || '30 mins'}</span>
                                            <span>{step.category || 'General'}</span>
                                        </div>

                                        {/* Sub Nodes */}
                                        {step.subNodes && step.subNodes.length > 0 && (
                                            <div style={{ marginTop: 16 }}>
                                                <h4 style={{ color: "#4ade80", margin: "0 0 12px 0", fontSize: "0.9rem" }}>📝 Action Plan:</h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                    {step.subNodes.map((node, i) => (
                                                        <div key={i} style={{
                                                            background: node.completed ? 'rgba(74, 222, 128, 0.1)' : 'rgba(255,255,255,0.03)',
                                                            padding: '10px',
                                                            borderRadius: '8px',
                                                            border: node.completed ? '1px solid rgba(74, 222, 128, 0.3)' : '1px solid rgba(255,255,255,0.05)',
                                                            transition: 'all 0.2s'
                                                        }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                                                <div>
                                                                    <h5 style={{ margin: '0 0 6px 0', color: node.completed ? '#4ade80' : '#e2e8f0', fontSize: '0.9rem', textDecoration: node.completed ? 'line-through' : 'none' }}>
                                                                        {i + 1}. {node.title}
                                                                    </h5>
                                                                    <ul style={{ margin: 0, paddingLeft: 20, color: node.completed ? "#86efac" : "#cbd5e1", fontSize: "0.85rem" }}>
                                                                        {node.steps && node.steps.map((s, j) => (
                                                                            <li key={j} style={{ marginBottom: 4 }}>{s}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                                {!node.completed && onSubNodeComplete && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onSubNodeComplete(step.id, i, step.subNodes.length);
                                                                        }}
                                                                        style={{
                                                                            background: 'rgba(74, 222, 128, 0.2)',
                                                                            color: '#4ade80',
                                                                            border: '1px solid rgba(74, 222, 128, 0.3)',
                                                                            borderRadius: '6px',
                                                                            padding: '6px 10px',
                                                                            fontSize: '0.8rem',
                                                                            cursor: 'pointer',
                                                                            whiteSpace: 'nowrap'
                                                                        }}
                                                                    >
                                                                        Done
                                                                    </button>
                                                                )}
                                                                {node.completed && (
                                                                    <span style={{ fontSize: '1.2rem' }}>✅</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Suggestions */}
                                        {step.suggestions && step.suggestions.length > 0 && (
                                            <div style={{ marginTop: 16 }}>
                                                <h4 style={{ color: "#a855f7", margin: "0 0 8px 0", fontSize: "0.9rem" }}>💡 Pro Suggestions:</h4>
                                                <ul style={{ margin: 0, paddingLeft: 20, color: "#cbd5e1", fontSize: "0.9rem" }}>
                                                    {step.suggestions.map((s, i) => (
                                                        <li key={i} style={{ marginBottom: 4 }}>{s}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Resources */}
                                        {step.resources && step.resources.length > 0 && (
                                            <div style={{ marginTop: 16 }}>
                                                <h4 style={{ color: "#38bdf8", margin: "0 0 8px 0", fontSize: "0.9rem" }}>🛠️ Recommended Tools:</h4>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                                    {step.resources.map((r, i) => (
                                                        <a
                                                            key={i}
                                                            href={r.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            style={{
                                                                background: "rgba(56, 189, 248, 0.1)",
                                                                color: "#38bdf8",
                                                                padding: "4px 10px",
                                                                borderRadius: "6px",
                                                                textDecoration: "none",
                                                                fontSize: "0.85rem",
                                                                border: "1px solid rgba(56, 189, 248, 0.2)"
                                                            }}
                                                        >
                                                            {r.name} ↗
                                                        </a>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Generator Button */}
                                        {step.generatorLink && (
                                            <div style={{ marginTop: 16 }}>
                                                <a
                                                    href={step.generatorLink}
                                                    style={{
                                                        display: "block",
                                                        textAlign: "center",
                                                        background: "linear-gradient(90deg, #7c3aed, #db2777)",
                                                        color: "white",
                                                        padding: "12px",
                                                        borderRadius: "8px",
                                                        textDecoration: "none",
                                                        fontWeight: "bold",
                                                        fontSize: "0.95rem",
                                                        boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)"
                                                    }}
                                                >
                                                    ✨ Use AI Generator
                                                </a>
                                            </div>
                                        )}

                                        {!isCompleted && (
                                            (() => {
                                                const hasSubNodes = step.subNodes && step.subNodes.length > 0;
                                                const allSubNodesComplete = !hasSubNodes || step.subNodes.every(sub => sub.completed);

                                                return (
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
                                                        <button
                                                            className="mark-done-btn"
                                                            onClick={() => handleMarkDone(step.id)}
                                                            disabled={!allSubNodesComplete}
                                                            style={{
                                                                width: '100%',
                                                                padding: '12px 20px',
                                                                background: allSubNodesComplete ? 'linear-gradient(135deg, #8b5cf6, #a855f7)' : '#334155',
                                                                color: allSubNodesComplete ? '#fff' : '#94a3b8',
                                                                border: 'none',
                                                                borderRadius: '8px',
                                                                fontSize: '1rem',
                                                                fontWeight: '700',
                                                                cursor: allSubNodesComplete ? 'pointer' : 'not-allowed',
                                                                boxShadow: allSubNodesComplete ? '0 4px 12px rgba(139, 92, 246, 0.3)' : 'none',
                                                                transition: 'all 0.2s',
                                                                opacity: allSubNodesComplete ? 1 : 0.7
                                                            }}
                                                        >
                                                            {allSubNodesComplete ? '✅ Mark Done' : '🔒 Complete Sub-tasks First'}
                                                        </button>
                                                        {!allSubNodesComplete && (
                                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', textAlign: 'center' }}>
                                                                Complete all action plan items above to finish this step.
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })()
                                        )}

                                        {isCompleted && (
                                            <div style={{
                                                marginTop: '16px',
                                                padding: '12px',
                                                background: 'rgba(74, 222, 128, 0.1)',
                                                border: '1px solid rgba(74, 222, 128, 0.3)',
                                                borderRadius: '8px',
                                                color: '#4ade80',
                                                textAlign: 'center',
                                                fontWeight: '700'
                                            }}>
                                                ✓ Completed
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MobileRoadmap;
