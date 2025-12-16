// src/pages/guide/Roadmap.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { auth, db, doc, getDoc, updateDoc, setDoc } from "../../services/firebase";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

// Constants removed, will be calculated dynamically


export default function Roadmap({ steps = [] }) {
    const uid = auth.currentUser?.uid;
    const [loading, setLoading] = useState(true);
    const [nodes, setNodes] = useState([]);
    const [selectedStep, setSelectedStep] = useState(null);
    const [dragging, setDragging] = useState(null); // { id, offsetX, offsetY }
    const [roadmapNotes, setRoadmapNotes] = useState({}); // { stepId: note }
    const [roadmapSettings, setRoadmapSettings] = useState({
        dailyHours: 2,
        contentPrefs: ["Short Video"],
    }); // saved settings
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);

    // --- Dynamic Constants ---
    const isMobile = windowWidth < 768;
    const NODE_RADIUS = isMobile ? Math.max(16, windowWidth * 0.04) : 22;
    const NODE_SPACING = isMobile ? Math.min(windowWidth * 0.45, 160) : Math.max(180, windowWidth * 0.15);
    const PANEL_WIDTH = isMobile ? windowWidth * 0.9 : Math.min(420, windowWidth * 0.35);
    const PANEL_HEIGHT = 300; // Keep height static for now or make dynamic if needed

    // --- initialize nodes with positions and completed status ---
    const initializeNodes = useCallback((stepsArray, savedProgress = {}, savedNotes = {}) => {
        return stepsArray.map((step, i) => {
            // New atomic structure: actionItems are less relevant per step if the step ITSELF is atomic.
            // But if we have sub-tasks (from old legacy or if AI hallucinates them), safely keep them.
            const rawItems = step.actionItems || step.subNodes || [];
            const actionItems = rawItems.map((item, j) => ({
                id: `${step.id}-action-${j}`,
                title: typeof item === 'string' ? item : item.title,
                completed: savedProgress[step.id]?.subNodes?.[j] || false,
            }));

            return {
                id: step.id,
                title: step.title,
                action: step.action || step.description, // New
                reason: step.reason, // New
                completionCondition: step.completionCondition, // New
                description: step.description,
                detailedDescription: step.detailedDescription,
                actionItems: actionItems,
                suggestions: step.suggestions,
                resources: step.resources,
                generatorLink: step.generatorLink,
                timeEstimate: step.timeEstimate,
                x: 60 + i * NODE_SPACING,
                y: 140 + Math.sin(i * 0.4) * 40,
                completed: savedProgress[step.id]?.completed || false,
                note: savedNotes[step.id] || "",
            };
        });
    }, [NODE_SPACING]); // Add NODE_SPACING dependency

    // --- load saved progress, notes, settings from Firestore and init nodes ---
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                if (!uid || steps.length === 0) {
                    setNodes(initializeNodes(steps, {}, {}));
                    setLoading(false);
                    return;
                }
                const docRef = doc(db, "brands", uid);
                const snap = await getDoc(docRef);
                const data = snap.exists() ? snap.data() : {};
                const savedProgress = data.roadmapProgress || {};
                const savedNotes = data.roadmapNotes || {};
                const savedSettings = data.roadmapSettings || {};
                setRoadmapNotes(savedNotes);
                setRoadmapSettings((prev) => ({ ...prev, ...savedSettings }));
                setNodes(initializeNodes(steps, savedProgress, savedNotes));
            } catch (e) {
                console.error("Failed to load roadmap:", e);
                setNodes(initializeNodes(steps, {}, {}));
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [uid, steps, initializeNodes]);

    // --- Save progress: only completed flags are saved to Firestore ---
    const saveProgress = useCallback(
        async (currentNodes) => {
            if (!uid) return;
            const progress = currentNodes.reduce((acc, n) => {
                acc[n.id] = {
                    completed: !!n.completed,
                    // Save action item completion as array of booleans (stored in subNodes field)
                    subNodes: (n.actionItems || []).map(item => item.completed || false)
                };
                return acc;
            }, {});
            try {
                await updateDoc(doc(db, "brands", uid), { roadmapProgress: progress });
            } catch {
                // fallback: create doc if doesn't exist
                try {
                    await setDoc(doc(db, "brands", uid), { roadmapProgress: progress }, { merge: true });
                } catch {
                    // console.error("Failed to save progress:", err2);
                }
            }
        },
        [uid]
    );

    // --- Save notes ---
    const saveNotesToFirestore = useCallback(
        async (notesObj) => {
            if (!uid) return;
            try {
                await updateDoc(doc(db, "brands", uid), { roadmapNotes: notesObj });
            } catch (err) {
                try {
                    await setDoc(doc(db, "brands", uid), { roadmapNotes: notesObj }, { merge: true });
                } catch {
                    // console.error("Failed to save notes:", err2);
                }
            }
        },
        [uid]
    );

    // --- Save settings (commitment & content preferences) ---
    const saveSettingsToFirestore = useCallback(
        async (settingsObj) => {
            if (!uid) return;
            try {
                await updateDoc(doc(db, "brands", uid), { roadmapSettings: settingsObj });
            } catch (err) {
                try {
                    await setDoc(doc(db, "brands", uid), { roadmapSettings: settingsObj }, { merge: true });
                } catch {
                    // console.error("Failed to save settings:", err2);
                }
            }
        },
        [uid]
    );

    // --- mark node complete (and save) ---
    const completeStep = useCallback(
        (id) => {
            setNodes((prev) => {
                const next = prev.map((n) => (n.id === id ? { ...n, completed: true } : n));
                // optimistic save
                saveProgress(next);
                return next;
            });
            // update selectedStep reference too
            if (selectedStep?.id === id) {
                setSelectedStep((s) => ({ ...s, completed: true }));
            }
        },
        [saveProgress, selectedStep]
    );

    // --- mark action item complete ---
    const completeActionItem = useCallback(
        (nodeId, actionItemId) => {
            setNodes((prev) => {
                const next = prev.map((n) => {
                    if (n.id !== nodeId) return n;

                    // Update the specific action item
                    const updatedItems = n.actionItems.map((item) =>
                        item.id === actionItemId ? { ...item, completed: !item.completed } : item
                    );

                    // Auto-complete parent if ALL items are completed (optional, maybe user wants to manually complete)
                    // For now, let's NOT auto-complete parent here to give user control, or we can.
                    // The user requested "auto-progression", so maybe we SHOULD auto-complete.
                    const allItemsComplete = updatedItems.every((s) => s.completed);

                    return {
                        ...n,
                        actionItems: updatedItems,
                        // completed: allItemsComplete ? true : n.completed, // Uncomment to auto-complete parent
                    };
                });

                // optimistic save
                saveProgress(next);
                return next;
            });

            // Update selectedStep if it's the current one
            if (selectedStep?.id === nodeId) {
                setSelectedStep((prev) => {
                    if (!prev || prev.id !== nodeId) return prev;
                    const updatedItems = prev.actionItems.map((item) =>
                        item.id === actionItemId ? { ...item, completed: !item.completed } : item
                    );
                    return { ...prev, actionItems: updatedItems };
                });
            }
        },
        [saveProgress, selectedStep]
    );

    // Check if a node is locked (needs all previous nodes + their subnodes completed)
    const isNodeLocked = useCallback((nodeIndex, allNodes) => {
        if (nodeIndex === 0) return false;

        // Check all previous nodes
        for (let i = 0; i < nodeIndex; i++) {
            const prevNode = allNodes[i];

            // Main node must be completed
            if (!prevNode.completed) return true;

            // All action items must be completed
            if (prevNode.actionItems && prevNode.actionItems.length > 0) {
                const allItemsComplete = prevNode.actionItems.every((s) => s.completed);
                if (!allItemsComplete) return true;
            }
        }

        return false;
    }, []);

    // Helpers to get node index by id
    const getIndexById = (id) => nodes.findIndex((n) => n.id === id);

    // Begin drag
    const handleMouseDown = (e, node, nodeIndex) => {
        // only allow dragging if node not locked
        const locked = isNodeLocked(nodeIndex, nodes);
        if (locked) return;

        const svgRect = svgRef.current.getBoundingClientRect();
        const offsetX = e.clientX - svgRect.left - node.x;
        const offsetY = e.clientY - svgRect.top - node.y;
        setDragging({ id: node.id, offsetX, offsetY });
        // prevent text selection
        e.preventDefault();
    };

    // while dragging
    const handleMouseMove = (e) => {
        if (!dragging) return;
        const svgRect = svgRef.current.getBoundingClientRect();
        const rawX = e.clientX - svgRect.left - dragging.offsetX;
        const rawY = e.clientY - svgRect.top - dragging.offsetY;

        // snap to grid gently
        const snappedX = Math.round(rawX / 10) * 10;
        const snappedY = Math.round(rawY / 10) * 10;

        setNodes((prev) =>
            prev.map((n) =>
                n.id === dragging.id ? {
                    ...n, x: snappedX, y: snappedY
                } : n
            )
        );
    };

    // drop
    const handleMouseUp = () => {
        if (!dragging) return;
        // persist positions (optional) and clear dragging
        setDragging(null);
    };

    // attach global mouse handlers
    useEffect(() => {
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dragging, nodes]);

    // Toggle selection on click (select step)
    const handleSelect = (node) => {
        // If clicked while dragging, ignore (small threshold could be added)
        setSelectedStep(node);
        // apply any saved note into local state (already included in nodes.note)
        setRoadmapNotes((prev) => ({ ...prev, [node.id]: node.note || "" }));
    };

    // Track window width for responsive SVG sizing


    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Update node positions when window resizes (and thus NODE_SPACING changes)
    useEffect(() => {
        setNodes(prevNodes => {
            return prevNodes.map((node, i) => ({
                ...node,
                x: 60 + i * NODE_SPACING,
                // y: 140 + Math.sin(i * 0.4) * 40 // Y stays same relative to sine wave
            }));
        });
    }, [NODE_SPACING]);

    // Auto-scroll to selected step
    useEffect(() => {
        if (selectedStep && containerRef.current) {
            const container = containerRef.current;
            const nodeX = selectedStep.x;
            const containerWidth = container.clientWidth;
            const scrollLeft = nodeX - containerWidth / 2;

            container.scrollTo({
                left: Math.max(0, scrollLeft),
                behavior: 'smooth'
            });
        }
    }, [selectedStep]);

    // compute svg dimensions based on nodes
    const svgWidth = Math.max((nodes.length - 1) * NODE_SPACING + 200, windowWidth);
    const svgHeight = 150;

    // small helper to compute estimated days for the node based on dailyHours
    const estimateDays = (node) => {
        // simple heuristic: base complexity by title length and description length
        const complexity = Math.max(1, Math.ceil((node.title.length + (node.description?.length || 0)) / 160));
        const hoursPerNode = complexity * 2; // base hours to finish this node
        const days = Math.max(1, Math.ceil(hoursPerNode / (roadmapSettings.dailyHours || 1)));
        return days;
    };

    // compute recommended tasks for a node (lightweight)
    const recommendedTasks = (node) => {
        const prefText = (roadmapSettings.contentPrefs || []).join(", ");
        const days = estimateDays(node);
        return [
            `Plan ${prefText} idea list (30 min)`,
            `Create & batch record ( ${Math.max(1, roadmapSettings.dailyHours)} hrs/day )`,
            `Edit & publish — aim for 2-3 pieces in ${days} days`,
        ];
    };

    if (loading) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingBox}>Loading Roadmap...</div>
            </div>
        );
    }

    if (!nodes || nodes.length === 0) {
        return (
            <div style={styles.loadingContainer}>
                <div style={styles.loadingBox}>No roadmap steps available.</div>
            </div>
        );
    }

    // utility to render a smooth connector between node i and i+1
    const renderConnections = () => {
        const lines = [];
        for (let i = 0; i < nodes.length - 1; i++) {
            const a = nodes[i];
            const b = nodes[i + 1];
            // create a gentle cubic curve
            const dx = b.x - a.x;
            const mx = a.x + dx / 2;
            const path = `M ${a.x} ${a.y} C ${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`;
            const completed = a.completed && b.completed;
            lines.push(
                <path
                    key={`conn-${a.id}-${b.id}`}
                    d={path}
                    stroke={completed ? "#4ade80" : "rgba(206,147,216,0.45)"}
                    strokeWidth={completed ? 4 : 2.2}
                    fill="none"
                    style={{
                        transition: "stroke 300ms ease, stroke-width 300ms ease",
                        filter: "drop-shadow(0 6px 12px rgba(100,70,255,0.09))",
                    }}
                />
            );
            // small node marker near the middle
            lines.push(
                <circle
                    key={`mid-${a.id}-${b.id}`}
                    cx={mx}
                    cy={(a.y + b.y) / 2}
                    r={6}
                    fill={completed ? "#4ade80" : "rgba(124,77,255,0.25)"}
                    stroke="rgba(255,255,255,0.06)"
                />
            );
        }
        return lines;
    };

    // Render subnodes function removed


    // update a note locally and optionally autosave
    const updateNote = (stepId, note, autosave = false) => {
        setRoadmapNotes((prev) => {
            const next = { ...prev, [stepId]: note };
            if (autosave) saveNotesToFirestore(next);
            // also reflect in nodes so UI shows it
            setNodes((nprev) => nprev.map((n) => (n.id === stepId ? { ...n, note } : n)));
            return next;
        });
    };

    // toggle content preference selection
    const toggleContentPref = (pref) => {
        setRoadmapSettings((prev) => {
            const prefs = prev.contentPrefs || [];
            const nextPrefs = prefs.includes(pref) ? prefs.filter((p) => p !== pref) : [...prefs, pref];
            const next = { ...prev, contentPrefs: nextPrefs };
            saveSettingsToFirestore(next);
            return next;
        });
    };

    // update daily hours and persist
    const updateDailyHours = (hours) => {
        setRoadmapSettings((prev) => {
            const next = { ...prev, dailyHours: hours };
            saveSettingsToFirestore(next);
            return next;
        });
    };

    // --- Navigation Handlers ---
    const handlePrev = () => {
        const idx = nodes.findIndex(n => n.id === selectedStep.id);
        if (idx > 0) handleSelect(nodes[idx - 1]);
    };

    const handleNext = () => {
        const idx = nodes.findIndex(n => n.id === selectedStep.id);
        if (idx < nodes.length - 1) handleSelect(nodes[idx + 1]);
    };

    // Save single node note on demand
    const handleSaveNote = async (stepId) => {
        await saveNotesToFirestore({ ...roadmapNotes });
    };

    return (
        <div style={styles.page}>
            <div style={styles.header}>
                <h1 style={styles.title}>🚀 Your Guide Roadmap</h1>
                <p style={styles.subtitle}>
                    Drag steps to reorganize visually. Click a step to view details and mark it complete.
                </p>
            </div>

            <div style={styles.wrapper}>
                <div
                    style={{
                        ...styles.canvasContainer,
                        paddingBottom: PANEL_HEIGHT + 48, // leave space for panel
                    }}
                    ref={containerRef}
                >
                    <svg ref={svgRef} width={svgWidth} height={svgHeight} style={{ display: "block", overflow: "visible" }}>
                        <defs>
                            <linearGradient id="nodeGrad" x1="0" x2="1">
                                <stop offset="0%" stopColor="#7C4DFF" stopOpacity="0.95" />
                                <stop offset="100%" stopColor="#CE93D8" stopOpacity="0.95" />
                            </linearGradient>
                            <filter id="softGlow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="6" result="coloredBlur" />
                                <feMerge>
                                    <feMergeNode in="coloredBlur" />
                                    <feMergeNode in="SourceGraphic" />
                                </feMerge>
                            </filter>
                        </defs>

                        {/* connections */}
                        <g>{renderConnections()}</g>

                        {/* nodes */}
                        <g>
                            {nodes.map((node, i) => {
                                const isSelected = selectedStep?.id === node.id;
                                const isLocked = isNodeLocked(i, nodes);
                                return (
                                    <g key={node.id}>
                                        {/* Subnodes removed from graph */}

                                        <g
                                            onMouseDown={(e) => handleMouseDown(e, node, i)}
                                            onClick={() => handleSelect(node)}
                                            style={{ cursor: isLocked ? "not-allowed" : "grab" }}
                                        >
                                            {/* outer ring */}
                                            <circle
                                                cx={node.x}
                                                cy={node.y}
                                                r={NODE_RADIUS + (isSelected ? 8 : 2)}
                                                fill={node.completed ? "#052f17" : "transparent"}
                                                stroke={node.completed ? "#4ade80" : "rgba(255,255,255,0.03)"}
                                                strokeWidth={isSelected ? 2.4 : 1.2}
                                                style={{
                                                    transformOrigin: `${node.x}px ${node.y}px`,
                                                    transition: "all 200ms ease",
                                                }}
                                            />
                                            {/* main node */}
                                            <circle
                                                cx={node.x}
                                                cy={node.y}
                                                r={NODE_RADIUS}
                                                fill={node.completed ? "#16a34a" : isLocked ? "#333" : "url(#nodeGrad)"}
                                                stroke="#ffffff"
                                                strokeWidth={isSelected ? 2 : 1}
                                                style={{
                                                    transition: "transform 180ms ease, filter 180ms ease",
                                                    filter: isSelected ? "drop-shadow(0 10px 30px rgba(124,77,255,0.25))" : "none",
                                                    pointerEvents: isLocked ? "none" : "auto",
                                                }}
                                            />
                                            {/* step number */}
                                            <text x={node.x} y={node.y + 5} textAnchor="middle" fill="#fff" fontSize="12" fontWeight="700" style={{ pointerEvents: "none" }}>
                                                {i + 1}
                                            </text>

                                            {/* label */}
                                            <text
                                                x={node.x}
                                                y={node.y - NODE_RADIUS - 12}
                                                textAnchor="middle"
                                                fill={isLocked ? "#999" : "#E1BEE7"}
                                                fontSize="13"
                                                fontWeight="700"
                                                style={{ pointerEvents: "none", userSelect: "none" }}
                                            >
                                                {node.title.length > 22 ? node.title.slice(0, 22) + "…" : node.title}
                                            </text>

                                            {/* lock icon for locked steps */}
                                            {isLocked && (
                                                <text x={node.x + NODE_RADIUS + 12} y={node.y - NODE_RADIUS + 6} fontSize="14" fill="#ffb4b4">
                                                    🔒
                                                </text>
                                            )}
                                        </g>
                                    </g>
                                );
                            })}
                        </g>
                    </svg>
                </div>
            </div>

            {/* Detail panel BELOW the roadmap */}
            {selectedStep && (
                <div
                    role="region"
                    aria-label="Step details"
                    style={{
                        marginTop: 24,
                        padding: 24,
                        borderRadius: 16,
                        background: "linear-gradient(145deg, rgba(20, 20, 28, 0.98), rgba(15, 15, 22, 0.98))",
                        border: "1px solid rgba(124, 77, 255, 0.3)",
                        boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                        transition: "all 300ms ease",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                        <div>
                            <h3 style={{ margin: "0 0 8px 0", color: "#fff", fontSize: "clamp(1.2rem, 4vw, 1.6rem)" }}>
                                {selectedStep.isSubNode ? (
                                    <>
                                        <span style={{ color: "#CE93D8", fontSize: "0.9em" }}>Sub-task: </span>
                                        {selectedStep.selectedSubNode.title}
                                    </>
                                ) : (
                                    selectedStep.title
                                )}
                            </h3>
                        </div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                                onClick={handlePrev}
                                disabled={nodes.findIndex(n => n.id === selectedStep.id) === 0}
                                style={{
                                    background: "rgba(255, 255, 255, 0.15)",
                                    border: "1px solid rgba(255, 255, 255, 0.2)",
                                    color: nodes.findIndex(n => n.id === selectedStep.id) === 0 ? "rgba(255,255,255,0.3)" : "white",
                                    cursor: nodes.findIndex(n => n.id === selectedStep.id) === 0 ? "not-allowed" : "pointer",
                                    borderRadius: "50%",
                                    width: 40,
                                    height: 40,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "all 0.2s",
                                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
                                }}
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                onClick={handleNext}
                                disabled={nodes.findIndex(n => n.id === selectedStep.id) === nodes.length - 1}
                                style={{
                                    background: "rgba(255, 255, 255, 0.15)",
                                    border: "1px solid rgba(255, 255, 255, 0.2)",
                                    color: nodes.findIndex(n => n.id === selectedStep.id) === nodes.length - 1 ? "rgba(255,255,255,0.3)" : "white",
                                    cursor: nodes.findIndex(n => n.id === selectedStep.id) === nodes.length - 1 ? "not-allowed" : "pointer",
                                    borderRadius: "50%",
                                    width: 40,
                                    height: 40,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "all 0.2s",
                                    boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
                                }}
                            >
                                <ChevronRight size={24} />
                            </button>
                            <button
                                aria-label="Close details"
                                onClick={() => setSelectedStep(null)}
                                style={{
                                    background: "rgba(255, 255, 255, 0.05)",
                                    border: "none",
                                    color: "#a0a0b0",
                                    fontSize: 24,
                                    cursor: "pointer",
                                    borderRadius: "50%",
                                    width: 36,
                                    height: 36,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    transition: "all 0.2s",
                                    marginLeft: '8px'
                                }}
                            >
                                ×
                            </button>
                        </div>
                    </div>

                    <div style={{ color: "#e2e8f0", fontSize: "1rem", lineHeight: 1.7, marginBottom: 24 }}>
                        {selectedStep.isSubNode ? selectedStep.detailedDescription : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {/* ACTION BLOCK */}
                                <div style={{ background: 'rgba(74, 222, 128, 0.1)', padding: '16px', borderRadius: '12px', borderLeft: '4px solid #4ade80' }}>
                                    <h4 style={{ margin: '0 0 8px 0', color: '#4ade80', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Action</h4>
                                    <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600, color: 'white' }}>{selectedStep.action}</p>
                                </div>

                                {/* WHY BLOCK */}
                                {selectedStep.reason && (
                                    <div>
                                        <h4 style={{ margin: '0 0 4px 0', color: '#a0a0b0', fontSize: '0.85rem' }}>Why this matters:</h4>
                                        <p style={{ margin: 0, color: '#e2e8f0' }}>{selectedStep.reason}</p>
                                    </div>
                                )}

                                {/* CONDITION BLOCK */}
                                {selectedStep.completionCondition && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px' }}>
                                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'rgba(255,255,255,0.5)' }}></div>
                                        </div>
                                        <div>
                                            <h4 style={{ margin: '0', color: '#a0a0b0', fontSize: '0.75rem' }}>Done when:</h4>
                                            <p style={{ margin: 0, color: '#fff', fontSize: '0.95rem' }}>{selectedStep.completionCondition}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Fallback for legacy descriptions if no new fields */}
                                {!selectedStep.action && <p>{selectedStep.description}</p>}
                            </div>
                        )}
                    </div>

                    {/* Action Items Checklist */}
                    {selectedStep.actionItems && selectedStep.actionItems.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            <h4 style={{ color: "#4ade80", margin: "0 0 16px 0", fontSize: "1rem" }}>📝 Action Plan:</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {selectedStep.actionItems.map((item, i) => (
                                    <div key={i}
                                        onClick={() => completeActionItem(selectedStep.id, item.id)}
                                        style={{
                                            background: 'rgba(255,255,255,0.03)',
                                            padding: '12px',
                                            borderRadius: '8px',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        <div style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '4px',
                                            border: item.completed ? 'none' : '2px solid rgba(255,255,255,0.3)',
                                            background: item.completed ? '#4ade80' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center'
                                        }}>
                                            {item.completed && <span style={{ color: '#000', fontSize: '12px', fontWeight: 'bold' }}>✓</span>}
                                        </div>
                                        <h5 style={{
                                            margin: 0,
                                            color: item.completed ? '#4ade80' : '#e2e8f0',
                                            fontSize: '0.95rem',
                                            textDecoration: item.completed ? 'line-through' : 'none'
                                        }}>
                                            {item.title}
                                        </h5>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Suggestions */}
                    {selectedStep.suggestions && selectedStep.suggestions.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            <h4 style={{ color: "#CE93D8", margin: "0 0 12px 0", fontSize: "1rem" }}>💡 Pro Suggestions:</h4>
                            <ul style={{ margin: 0, paddingLeft: 20, color: "#cbd5e1" }}>
                                {selectedStep.suggestions.map((s, i) => (
                                    <li key={i} style={{ marginBottom: 6 }}>{s}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Resources */}
                    {selectedStep.resources && selectedStep.resources.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            <h4 style={{ color: "#38bdf8", margin: "0 0 12px 0", fontSize: "1rem" }}>🛠️ Recommended Tools:</h4>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                                {selectedStep.resources.map((r, i) => (
                                    <a
                                        key={i}
                                        href={r.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                            background: "rgba(56, 189, 248, 0.1)",
                                            color: "#38bdf8",
                                            padding: "6px 12px",
                                            borderRadius: "6px",
                                            textDecoration: "none",
                                            fontSize: "0.9rem",
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
                    {(() => {
                        // Helper to determine the correct generator link
                        const getGeneratorLink = (step) => {
                            const text = (step.title + " " + step.description).toLowerCase();
                            if (text.includes("idea") || text.includes("brainstorm") || text.includes("topic")) return "/generate?type=idea";
                            if (text.includes("script") || text.includes("video") || text.includes("tiktok") || text.includes("reel")) return "/generate?type=videoScript";
                            if (text.includes("caption") || text.includes("instagram") || text.includes("post")) return "/generate?type=caption";
                            if (text.includes("tweet") || text.includes("twitter") || text.includes("thread") || text.includes("x.com")) return "/generate?type=tweet";
                            // Default fallback or if specific link exists and we want to trust it (but user said it's old)
                            // Let's default to idea if nothing matches but we have a generator flag
                            return "/generate?type=idea";
                        };

                        const link = getGeneratorLink(selectedStep);

                        if (selectedStep.generatorLink || link) {
                            return (
                                <div style={{ marginBottom: 24 }}>
                                    <Link
                                        to={link}
                                        style={{
                                            display: "block",
                                            textAlign: "center",
                                            background: "linear-gradient(90deg, #7C4DFF, #9C27B0)",
                                            color: "white",
                                            padding: "14px",
                                            borderRadius: "10px",
                                            textDecoration: "none",
                                            fontWeight: "bold",
                                            boxShadow: "0 4px 15px rgba(124, 77, 255, 0.4)"
                                        }}
                                    >
                                        ✨ Use AI Generator for this Step
                                    </Link>
                                </div>
                            );
                        }
                        return null;
                    })()}

                    {(() => {
                        // Handle main node completion
                        const idx = nodes.findIndex((n) => n.id === selectedStep.id);
                        const isLocked = isNodeLocked(idx, nodes);

                        // Check if all action items are completed
                        const hasIncompleteItems = selectedStep.actionItems && selectedStep.actionItems.some(item => !item.completed);

                        return (
                            <>
                                {!selectedStep.completed ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        <button
                                            onClick={() => {
                                                if (!isLocked && !hasIncompleteItems) completeStep(selectedStep.id);
                                            }}
                                            disabled={isLocked || hasIncompleteItems}
                                            style={{
                                                padding: "14px 20px",
                                                background: (isLocked || hasIncompleteItems) ? "#334155" : "#22c55e",
                                                color: (isLocked || hasIncompleteItems) ? "rgba(255,255,255,0.5)" : "#fff",
                                                border: "none",
                                                borderRadius: 10,
                                                cursor: (isLocked || hasIncompleteItems) ? "not-allowed" : "pointer",
                                                fontWeight: 700,
                                                fontSize: "1rem",
                                                width: "100%",
                                                boxShadow: (isLocked || hasIncompleteItems)
                                                    ? "none"
                                                    : "0 4px 15px rgba(34, 197, 94, 0.3)",
                                                transition: "all 0.2s"
                                            }}
                                        >
                                            {isLocked
                                                ? "🔒 Locked"
                                                : hasIncompleteItems
                                                    ? "Complete Action Plan First"
                                                    : "✅ Mark Step Complete"
                                            }
                                        </button>
                                        {isLocked && (
                                            <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center" }}>
                                                Complete previous steps and their action items to unlock
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{
                                        color: "#4ade80",
                                        fontWeight: 700,
                                        fontSize: "1.1rem",
                                        textAlign: "center",
                                        padding: "14px",
                                        background: "rgba(34, 197, 94, 0.1)",
                                        borderRadius: "10px",
                                        border: "1px solid rgba(34, 197, 94, 0.2)"
                                    }}>
                                        🎉 Step Completed!
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>
            )}
        </div>
    );
}

/* ===========================
   Styles (local)
   =========================== */
const styles = {
    page: {
        padding: "clamp(16px, 4vw, 28px)", // Responsive padding
        color: "#fff",
        fontFamily: "Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        minHeight: "calc(100vh - 80px)",
        background:
            "radial-gradient(1200px 400px at 10% 10%, rgba(124, 77, 255, 0.15), transparent), linear-gradient(180deg, #4A148C, #2a0a55)",
        borderRadius: "30px",
        overflow: "hidden",
    },
    header: {
        marginBottom: "clamp(16px, 4vw, 24px)",
        maxWidth: 980,
    },
    title: {
        fontSize: "clamp(1.5rem, 5vw, 2rem)", // Responsive font size
        margin: "0 0 8px 0",
    },
    subtitle: {
        margin: 0,
        color: "#a0a0b0",
        fontSize: "clamp(0.9rem, 3vw, 1rem)",
        lineHeight: 1.5,
    },
    wrapper: {
        display: "flex",
        flexDirection: "column", // Stack on mobile
        gap: 20,
        alignItems: "flex-start",
        width: "100%",
    },
    canvasContainer: {
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: 14,
        background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))",
        overflowX: "auto",
        overflowY: "hidden",
        width: "100%",
        WebkitOverflowScrolling: "touch", // Smooth scroll on iOS
    },
    loadingContainer: {
        height: 300,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    loadingBox: {
        color: "#a0a0b0",
        padding: 18,
        borderRadius: 12,
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.03)",
    },
};
