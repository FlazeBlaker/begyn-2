// src/pages/guide/Roadmap.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";
import { auth, db, doc, getDoc, updateDoc, setDoc } from "../../services/firebase";

const GRID_SIZE = 50;
const NODE_RADIUS = 22;
const NODE_SPACING = 180;
const PANEL_WIDTH = 420;
const PANEL_HEIGHT = 300;
const SUBNODE_RADIUS = 8;
const SUBNODE_DISTANCE = 38;

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

    // --- initialize nodes with positions and completed status ---
    const initializeNodes = useCallback((stepsArray, savedProgress = {}, savedNotes = {}) => {
        return stepsArray.map((step, i) => {
            // Initialize subnodes with unique IDs and completion tracking
            const subNodes = (step.subNodes || []).map((sub, j) => ({
                ...sub,
                id: `${step.id}-sub-${j}`,
                completed: savedProgress[step.id]?.subNodes?.[j] || false,
            }));

            return {
                id: step.id,
                title: step.title,
                description: step.description,
                detailedDescription: step.detailedDescription,
                subNodes: subNodes,
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
    }, []);

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
                    // Save subnode completion as array of booleans
                    subNodes: (n.subNodes || []).map(sub => sub.completed || false)
                };
                return acc;
            }, {});
            try {
                await updateDoc(doc(db, "brands", uid), { roadmapProgress: progress });
            } catch (err) {
                // fallback: create doc if doesn't exist
                try {
                    await setDoc(doc(db, "brands", uid), { roadmapProgress: progress }, { merge: true });
                } catch (err2) {
                    console.error("Failed to save progress:", err2);
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
                } catch (err2) {
                    console.error("Failed to save notes:", err2);
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
                } catch (err2) {
                    console.error("Failed to save settings:", err2);
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

    // --- mark subnode complete ---
    const completeSubNode = useCallback(
        (nodeId, subnodeId) => {
            let nextSelection = null;

            setNodes((prev) => {
                const next = prev.map((n) => {
                    if (n.id !== nodeId) return n;

                    // Update the specific subnode
                    const updatedSubNodes = n.subNodes.map((sub) =>
                        sub.id === subnodeId ? { ...sub, completed: true } : sub
                    );

                    // Auto-complete parent if ALL subnodes are completed
                    const allSubsComplete = updatedSubNodes.every((s) => s.completed);

                    return {
                        ...n,
                        subNodes: updatedSubNodes,
                        completed: allSubsComplete && n.completed ? true : n.completed,
                    };
                });

                // Find the node and current subnode index
                const currentNode = next.find(n => n.id === nodeId);
                const currentSubIndex = currentNode?.subNodes.findIndex(s => s.id === subnodeId) ?? -1;

                // Determine next selection
                if (currentNode && currentSubIndex !== -1) {
                    // Check if there's a next subnode in the same node
                    if (currentSubIndex + 1 < currentNode.subNodes.length) {
                        const nextSubnode = currentNode.subNodes[currentSubIndex + 1];
                        nextSelection = {
                            ...currentNode,
                            isSubNode: true,
                            selectedSubNode: nextSubnode,
                            selectedSubNodeIndex: currentSubIndex + 1
                        };
                    } else {
                        // No more subnodes, find next main node
                        const currentNodeIndex = next.findIndex(n => n.id === nodeId);
                        if (currentNodeIndex !== -1 && currentNodeIndex + 1 < next.length) {
                            const nextNode = next[currentNodeIndex + 1];
                            // If next node has subnodes, select first subnode, otherwise select the main node
                            if (nextNode.subNodes && nextNode.subNodes.length > 0) {
                                nextSelection = {
                                    ...nextNode,
                                    isSubNode: true,
                                    selectedSubNode: nextNode.subNodes[0],
                                    selectedSubNodeIndex: 0
                                };
                            } else {
                                nextSelection = nextNode;
                            }
                        }
                    }
                }

                // optimistic save
                saveProgress(next);
                return next;
            });

            // Update selectedStep with the next selection
            if (nextSelection) {
                setSelectedStep(nextSelection);
            } else {
                // If no next selection, just update the current selectedStep to show completion
                setSelectedStep((prev) => {
                    if (!prev || !prev.isSubNode || prev.id !== nodeId) return prev;
                    const updatedSubNodes = prev.subNodes.map((sub) =>
                        sub.id === subnodeId ? { ...sub, completed: true } : sub
                    );
                    const updatedSelectedSubNode = updatedSubNodes.find(s => s.id === subnodeId);
                    const allSubsComplete = updatedSubNodes.every((s) => s.completed);
                    return {
                        ...prev,
                        subNodes: updatedSubNodes,
                        selectedSubNode: updatedSelectedSubNode,
                        completed: allSubsComplete && prev.completed ? true : prev.completed,
                    };
                });
            }
        },
        [saveProgress]
    );

    // Check if a node is locked (needs all previous nodes + their subnodes completed)
    const isNodeLocked = useCallback((nodeIndex, allNodes) => {
        if (nodeIndex === 0) return false;

        // Check all previous nodes
        for (let i = 0; i < nodeIndex; i++) {
            const prevNode = allNodes[i];

            // Main node must be completed
            if (!prevNode.completed) return true;

            // All subnodes must be completed
            if (prevNode.subNodes && prevNode.subNodes.length > 0) {
                const allSubsComplete = prevNode.subNodes.every((s) => s.completed);
                if (!allSubsComplete) return true;
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

    // Track container width for responsive SVG sizing
    const [containerWidth, setContainerWidth] = useState(window.innerWidth);

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // compute svg dimensions based on nodes
    // Use containerWidth to ensure it fits the available space (e.g. when sidebar is open)
    const svgWidth = Math.max((nodes.length - 1) * NODE_SPACING + 200, containerWidth);
    const svgHeight = 130;

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
                    stroke={completed ? "#4ade80" : "rgba(200,180,255,0.45)"}
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
                    fill={completed ? "#4ade80" : "rgba(150,120,255,0.25)"}
                    stroke="rgba(255,255,255,0.06)"
                />
            );
        }
        return lines;
    };

    // Render subnodes as vertical chain below parent node
    const renderSubNodes = (node) => {
        if (!node.subNodes || node.subNodes.length === 0) return null;

        const elements = [];
        const VERTICAL_SPACING = 55;
        const startY = node.y + 50; // Start below parent node

        node.subNodes.forEach((subnode, i) => {
            const sy = startY + (i * VERTICAL_SPACING);
            const sx = node.x;

            // Connector line from parent (or previous subnode) to current subnode
            const fromY = i === 0 ? node.y : (startY + ((i - 1) * VERTICAL_SPACING));
            const completed = subnode.completed;

            elements.push(
                <line
                    key={`sub-line-${node.id}-${i}`}
                    x1={sx}
                    y1={fromY}
                    x2={sx}
                    y2={sy}
                    stroke={completed ? "#4ade80" : "rgba(168, 85, 247, 0.3)"}
                    strokeWidth={completed ? 3 : 2}
                    style={{ pointerEvents: 'none' }}
                />
            );

            // Subnode circle
            elements.push(
                <circle
                    key={`sub-${subnode.id}`}
                    cx={sx}
                    cy={sy}
                    r={SUBNODE_RADIUS}
                    fill={completed ? "#16a34a" : "rgba(168, 85, 247, 0.6)"}
                    stroke={completed ? "#4ade80" : "#a855f7"}
                    strokeWidth={1.5}
                    style={{
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        // Select the subnode to show its details
                        setSelectedStep({
                            ...node,
                            isSubNode: true,
                            selectedSubNode: subnode,
                            selectedSubNodeIndex: i
                        });
                    }}
                    onDoubleClick={(e) => {
                        e.stopPropagation();
                        // Double-click to mark complete
                        if (!completed) {
                            completeSubNode(node.id, subnode.id);
                        }
                    }}
                >
                    <title>{subnode.title}</title>
                </circle>
            );

            // Subnode label
            elements.push(
                <text
                    key={`sub-label-${subnode.id}`}
                    x={sx + SUBNODE_RADIUS + 8}
                    y={sy + 4}
                    fill={completed ? "#4ade80" : "#c4b5fd"}
                    fontSize="11"
                    fontWeight="500"
                    style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                    {subnode.title.length > 30 ? subnode.title.slice(0, 30) + "…" : subnode.title}
                </text>
            );
        });

        return elements;
    };

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
                    <svg
                        ref={svgRef}
                        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                        width="100%"
                        height="100%"
                        preserveAspectRatio="xMinYMid meet"
                        style={{
                            display: "block",
                            overflow: "visible",
                            maxHeight: "150px",
                            // Allow shrinking down to 85% of natural size, then scroll. This gives a "responsive" feel without becoming too small.
                            minWidth: `${((nodes.length - 1) * NODE_SPACING + 200) * 0.85}px`
                        }}
                    >
                        <defs>
                            <linearGradient id="nodeGrad" x1="0" x2="1">
                                <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.95" />
                                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.95" />
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
                                        {/* Subnodes - render first so they appear behind main node */}
                                        {renderSubNodes(node)}

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
                                                    filter: isSelected ? "drop-shadow(0 10px 30px rgba(124,58,237,0.25))" : "none",
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
                                                fill={isLocked ? "#999" : "#d8b4fe"}
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
                        border: "1px solid rgba(168, 85, 247, 0.3)",
                        boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                        transition: "all 300ms ease",
                    }}
                >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                        <div>
                            <h3 style={{ margin: "0 0 8px 0", color: "#fff", fontSize: "clamp(1.2rem, 4vw, 1.6rem)" }}>
                                {selectedStep.isSubNode ? (
                                    <>
                                        <span style={{ color: "#a855f7", fontSize: "0.9em" }}>Sub-task: </span>
                                        {selectedStep.selectedSubNode.title}
                                    </>
                                ) : (
                                    selectedStep.title
                                )}
                            </h3>
                            {!selectedStep.isSubNode && selectedStep.timeEstimate && (
                                <span style={{
                                    display: "inline-block",
                                    background: "rgba(139, 92, 246, 0.15)",
                                    color: "#c4b5fd",
                                    padding: "4px 10px",
                                    borderRadius: "20px",
                                    fontSize: "0.85rem",
                                    fontWeight: 500
                                }}>
                                    ⏱️ {selectedStep.timeEstimate}
                                </span>
                            )}
                        </div>
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
                                transition: "all 0.2s"
                            }}
                        >
                            ×
                        </button>
                    </div>

                    <div style={{ color: "#e2e8f0", fontSize: "1rem", lineHeight: 1.7, marginBottom: 24 }}>
                        {selectedStep.isSubNode ? (
                            // Show subnode steps
                            selectedStep.selectedSubNode.steps && selectedStep.selectedSubNode.steps.length > 0 ? (
                                <ul style={{ margin: 0, paddingLeft: 20, color: "#cbd5e1" }}>
                                    {selectedStep.selectedSubNode.steps.map((s, j) => (
                                        <li key={j} style={{ marginBottom: 8 }}>{s}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p>{selectedStep.selectedSubNode.title}</p>
                            )
                        ) : (
                            selectedStep.detailedDescription || selectedStep.description
                        )}
                    </div>

                    {/* Sub Nodes */}
                    {selectedStep.subNodes && selectedStep.subNodes.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            <h4 style={{ color: "#4ade80", margin: "0 0 16px 0", fontSize: "1rem" }}>📝 Action Plan:</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                {selectedStep.subNodes.map((node, i) => (
                                    <div key={i} style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255,255,255,0.05)'
                                    }}>
                                        <h5 style={{ margin: '0 0 8px 0', color: '#e2e8f0', fontSize: '0.95rem' }}>{i + 1}. {node.title}</h5>
                                        <ul style={{ margin: 0, paddingLeft: 20, color: "#cbd5e1", fontSize: "0.9rem" }}>
                                            {node.steps && node.steps.map((s, j) => (
                                                <li key={j} style={{ marginBottom: 4 }}>{s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Suggestions */}
                    {selectedStep.suggestions && selectedStep.suggestions.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                            <h4 style={{ color: "#a855f7", margin: "0 0 12px 0", fontSize: "1rem" }}>💡 Pro Suggestions:</h4>
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
                    {selectedStep.generatorLink && (
                        <div style={{ marginBottom: 24 }}>
                            <a
                                href={selectedStep.generatorLink}
                                style={{
                                    display: "block",
                                    textAlign: "center",
                                    background: "linear-gradient(90deg, #7c3aed, #db2777)",
                                    color: "white",
                                    padding: "14px",
                                    borderRadius: "10px",
                                    textDecoration: "none",
                                    fontWeight: "bold",
                                    boxShadow: "0 4px 15px rgba(124, 58, 237, 0.4)"
                                }}
                            >
                                ✨ Use AI Generator for this Step
                            </a>
                        </div>
                    )}

                    {(() => {
                        // Handle subnode completion
                        if (selectedStep.isSubNode) {
                            const subnode = selectedStep.selectedSubNode;
                            const isCompleted = subnode.completed;

                            return (
                                <>
                                    {!isCompleted ? (
                                        <button
                                            onClick={() => {
                                                completeSubNode(selectedStep.id, subnode.id);
                                            }}
                                            style={{
                                                padding: "14px 20px",
                                                background: "#22c55e",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: 10,
                                                cursor: "pointer",
                                                fontWeight: 700,
                                                fontSize: "1rem",
                                                width: "100%",
                                                boxShadow: "0 4px 15px rgba(34, 197, 94, 0.3)",
                                                transition: "all 0.2s"
                                            }}
                                        >
                                            ✅ Mark Sub-task Complete
                                        </button>
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
                                            🎉 Sub-task Completed!
                                        </div>
                                    )}
                                </>
                            );
                        }

                        // Handle main node completion
                        const idx = nodes.findIndex((n) => n.id === selectedStep.id);
                        const isLocked = isNodeLocked(idx, nodes);

                        return (
                            <>
                                {!selectedStep.completed ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                        <button
                                            onClick={() => {
                                                if (!isLocked) completeStep(selectedStep.id);
                                            }}
                                            disabled={isLocked}
                                            style={{
                                                padding: "14px 20px",
                                                background: isLocked ? "#334155" : "#22c55e",
                                                color: "#fff",
                                                border: "none",
                                                borderRadius: 10,
                                                cursor: isLocked ? "not-allowed" : "pointer",
                                                fontWeight: 700,
                                                fontSize: "1rem",
                                                width: "100%",
                                                boxShadow: isLocked
                                                    ? "none"
                                                    : "0 4px 15px rgba(34, 197, 94, 0.3)",
                                                transition: "all 0.2s"
                                            }}
                                        >
                                            {isLocked ? "🔒 Locked" : "✅ Mark Step Complete"}
                                        </button>
                                        {isLocked && (
                                            <div style={{ color: "#94a3b8", fontSize: 13, textAlign: "center" }}>
                                                Complete previous steps and their sub-tasks to unlock
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
            "radial-gradient(1200px 400px at 10% 10%, rgba(124,58,237,0.06), transparent), linear-gradient(180deg, rgba(6,6,10,1), rgba(10,8,18,1))",
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
