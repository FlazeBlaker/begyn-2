import React, { useState, useEffect } from 'react';

const MockAdModal = ({ isOpen, onClose, onReward }) => {
    const [timeLeft, setTimeLeft] = useState(15);
    const [canClose, setCanClose] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTimeLeft(15);
            setCanClose(false);
            const timer = setInterval(() => {
                setTimeLeft((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setCanClose(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isOpen]);

    const handleClose = () => {
        if (canClose) {
            onReward();
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'Inter, sans-serif'
        }}>
            <div style={{
                background: '#1e293b',
                padding: '40px',
                borderRadius: '20px',
                textAlign: 'center',
                maxWidth: '400px',
                width: '90%',
                border: '1px solid #334155',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>📺</div>
                <h2 style={{ marginBottom: '10px', fontSize: '1.5rem' }}>Watching Ad...</h2>
                <p style={{ color: '#94a3b8', marginBottom: '30px' }}>
                    Please wait to earn your credits.
                </p>

                <div style={{
                    fontSize: '2rem',
                    fontWeight: 'bold',
                    color: canClose ? '#4ade80' : '#fbbf24',
                    marginBottom: '30px'
                }}>
                    {canClose ? "Reward Unlocked!" : `00:${timeLeft < 10 ? `0${timeLeft}` : timeLeft}`}
                </div>

                <button
                    onClick={handleClose}
                    disabled={!canClose}
                    style={{
                        background: canClose ? 'linear-gradient(135deg, #22c55e, #16a34a)' : '#334155',
                        color: canClose ? 'white' : '#94a3b8',
                        border: 'none',
                        padding: '12px 30px',
                        borderRadius: '10px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: canClose ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        width: '100%'
                    }}
                >
                    {canClose ? "Collect 1 Credit" : "Please Wait..."}
                </button>
            </div>
            <div style={{ marginTop: '20px', color: '#64748b', fontSize: '0.8rem' }}>
                Mock Ad Environment
            </div>
        </div>
    );
};

export default MockAdModal;
