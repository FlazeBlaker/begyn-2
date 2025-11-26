// src/pages/RoadmapDashboard.jsx
import { useState, useEffect } from "react";
import { auth, db, doc, getDoc, updateDoc } from "../services/firebase";
import "../styles/GuideFlowStyles.css";

// Editable roadmap task component
const RoadmapTask = ({ item, category, index, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentText, setCurrentText] = useState(item);

    const handleSave = async () => {
        onUpdate(category, index, currentText);
        setIsEditing(false);
    };

    return (
        <li className="roadmap-item">
            {isEditing ? (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <input
                        className="styled-input"
                        value={currentText}
                        onChange={(e) => setCurrentText(e.target.value)}
                        style={{ minWidth: '200px', flex: 1 }}
                    />
                    <button onClick={handleSave} style={{ whiteSpace: 'nowrap', padding: '8px 16px' }}>Save</button>
                </div>
            ) : (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{item}</span>
                    <button onClick={() => setIsEditing(true)} style={{ background: 'none', border: 'none', color: '#a855f7', cursor: 'pointer' }}>
                        ✏️ Edit
                    </button>
                </div>
            )}
        </li>
    );
};

export default function RoadmapDashboard() {
    const [brandData, setBrandData] = useState(null);
    const [loading, setLoading] = useState(true);
    const uid = auth.currentUser?.uid;

    useEffect(() => {
        const fetchBrandData = async () => {
            if (!uid) return;
            const docRef = doc(db, "brands", uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists() && docSnap.data().brandData) {
                setBrandData(docSnap.data().brandData);
            }
            setLoading(false);
        };
        fetchBrandData();
    }, [uid]);

    const updateRoadmapItem = async (category, index, newText) => {
        if (!brandData || !uid) return;
        const newBrandData = JSON.parse(JSON.stringify(brandData));
        if (Array.isArray(newBrandData.aiGenerated[category])) {
            newBrandData.aiGenerated[category][index] = newText;
            setBrandData(newBrandData);
            await updateDoc(doc(db, "brands", uid), { brandData: newBrandData });
        }
    };

    if (loading) return <div className="guide-container"><div className="ai-loader">Loading Your Roadmap...</div></div>;
    if (!brandData || !brandData.aiGenerated) return <div className="guide-container"><div className="step-container">No brand data found.</div></div>;

    const gen = brandData.aiGenerated;

    return (
        <div className="guide-container">
            <div className="step-container fadeIn" style={{ maxWidth: '1200px' }}>
                <h2 style={{ color: '#d946ef' }}>🚀 Your Personalized Creator Roadmap</h2>
                {/* Removed fixed gridTemplateColumns to allow responsive wrapping */}
                <div className="final-review-grid">
                    <div className="final-card" style={{ border: '2px solid #7c3aed' }}>
                        <h3>The First 7-Day Action Plan (Editable)</h3>
                        <ul>
                            {gen.sevenDayChecklist.map((task, index) => (
                                <RoadmapTask
                                    key={index}
                                    item={task}
                                    category="sevenDayChecklist"
                                    index={index}
                                    onUpdate={updateRoadmapItem}
                                />
                            ))}
                        </ul>
                    </div>

                    <div className="final-card" style={{ border: '2px solid #a855f7' }}>
                        <h3>Content Pillars & Focus (Editable)</h3>
                        <ul>
                            {gen.contentPillars.map((pillar, index) => (
                                <RoadmapTask
                                    key={index}
                                    item={pillar}
                                    category="contentPillars"
                                    index={index}
                                    onUpdate={updateRoadmapItem}
                                />
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}