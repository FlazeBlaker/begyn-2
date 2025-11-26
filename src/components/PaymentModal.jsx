// src/components/PaymentModal.jsx
import { useState } from 'react';
import { CREDIT_PACKAGES, openRazorpayCheckout, getUserCredits } from '../services/razorpay';
import { auth } from '../services/firebase';
import Toast from './Toast';
import '../styles/PaymentModal.css';

export default function PaymentModal({ isOpen, onClose, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
    };

    const handlePurchase = async (packageInfo) => {
        setLoading(true);
        setSelectedPackage(packageInfo.id);

        try {
            await openRazorpayCheckout(
                packageInfo,
                async (response) => {
                    // Payment successful
                    const newCredits = await getUserCredits(auth.currentUser?.uid);
                    setLoading(false);
                    setSelectedPackage(null);

                    if (onSuccess) {
                        onSuccess(newCredits);
                    }

                    // Show success toast
                    showToast(`🎉 Payment successful! ${packageInfo.credits} credits added to your account.`, 'success');

                    // Close modal after a short delay
                    setTimeout(() => {
                        onClose();
                    }, 2000);
                },
                (error) => {
                    // Payment failed
                    setLoading(false);
                    setSelectedPackage(null);
                    console.error('Payment failed:', error);
                    showToast(`Payment failed: ${error.message}`, 'error');
                }
            );
        } catch (error) {
            setLoading(false);
            setSelectedPackage(null);
            console.error('Error initiating payment:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="payment-modal-overlay" onClick={onClose}>
            <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
                <button className="modal-close" onClick={onClose} aria-label="Close">×</button>

                <h2 className="modal-title">💳 Buy Credits</h2>
                <p className="modal-subtitle">Choose a credit package to continue creating amazing content</p>

                <div className="credit-packages">
                    {CREDIT_PACKAGES.map((pkg) => (
                        <div
                            key={pkg.id}
                            className={`credit-package ${pkg.popular ? 'popular' : ''}`}
                        >
                            {pkg.popular && <div className="popular-badge">Most Popular</div>}
                            {pkg.savings && <div className="savings-badge">Save {pkg.savings}</div>}

                            <div className="package-header">
                                <h3>{pkg.name}</h3>
                                <div className="package-credits">{pkg.credits} Credits</div>
                            </div>

                            <div className="package-price">
                                <span className="currency">₹</span>
                                <span className="amount">{pkg.price}</span>
                            </div>

                            <div className="package-per-credit">
                                ₹{(pkg.price / pkg.credits).toFixed(2)} per credit
                            </div>

                            <button
                                className="purchase-btn"
                                onClick={() => handlePurchase(pkg)}
                                disabled={loading}
                            >
                                {loading && selectedPackage === pkg.id ? (
                                    <>
                                        <span className="spinner"></span>
                                        Processing...
                                    </>
                                ) : (
                                    'Buy Now'
                                )}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="payment-info">
                    <p>🔒 Secure payment powered by Razorpay</p>
                    <p>💡 Credits never expire and can be used for any content generation</p>
                </div>
            </div>

            {/* Toast Notification */}
            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
