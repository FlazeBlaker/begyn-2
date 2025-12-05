// src/services/razorpay.js
import { auth, db, doc, getDoc } from './firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';

// Initialize Cloud Functions
const functions = getFunctions();

// Credit packages
export const CREDIT_PACKAGES = [
    {
        id: 'starter',
        name: 'Starter Pack',
        credits: 10,
        price: 49,
        currency: 'INR',
        popular: false
    },
    {
        id: 'ultimate',
        name: 'Ultimate Creator',
        credits: 60,
        price: 199,
        currency: 'INR',
        popular: true,
        savings: '33%'
    },
    {
        id: 'enterprise',
        name: 'Agency Scale',
        credits: 500,
        price: 995,
        currency: 'INR',
        popular: false,
        savings: '60%'
    }
];

/**
 * Get user's current credit balance
 * @param {string} uid - User ID
 * @returns {Promise<number>} Current credit balance
 */
export const getUserCredits = async (uid) => {
    try {
        // Check brands collection first (new secure location)
        const brandRef = doc(db, 'brands', uid);
        const brandSnap = await getDoc(brandRef);

        if (brandSnap.exists() && brandSnap.data().credits !== undefined) {
            return brandSnap.data().credits;
        }

        // Fallback to users collection (legacy)
        const userRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
            return userSnap.data().credits || 0;
        }

        return 0;
    } catch (error) {
        console.error('Error getting user credits:', error);
        return 0;
    }
};

/**
 * Open Razorpay checkout (Secure Backend Mode)
 * @param {Object} packageInfo - Credit package information
 * @param {Function} onSuccess - Success callback
 * @param {Function} onFailure - Failure callback
 */
export const openRazorpayCheckout = async (packageInfo, onSuccess, onFailure) => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
        onFailure(new Error('User not authenticated'));
        return;
    }

    try {
        // 1. Call Backend to Create Order
        const createOrderFn = httpsCallable(functions, 'createRazorpayOrder');
        const orderResponse = await createOrderFn({
            packageId: packageInfo.id,
            price: packageInfo.price,
            credits: packageInfo.credits
        });

        const { orderId, key, amount, currency } = orderResponse.data;

        // 2. Load Razorpay Script
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        script.onload = () => {
            const options = {
                key: key, // Public key from backend
                amount: amount,
                currency: currency,
                name: 'AI Content Studio',
                description: `${packageInfo.name} - ${packageInfo.credits} Credits`,
                order_id: orderId, // Secure Order ID from backend
                handler: async function (response) {
                    try {
                        // console.log('Payment successful, verifying...', response);

                        // 3. Call Backend to Verify Payment & Add Credits
                        const verifyPaymentFn = httpsCallable(functions, 'verifyRazorpayPayment');
                        const verifyResponse = await verifyPaymentFn({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            packageId: packageInfo.id,
                            credits: packageInfo.credits
                        });

                        if (verifyResponse.data.success) {
                            onSuccess(response);
                        } else {
                            throw new Error(verifyResponse.data.message || 'Payment verification failed');
                        }
                    } catch (error) {
                        console.error('Error verifying payment:', error);
                        onFailure(new Error('Payment verification failed. Please contact support.'));
                    }
                },
                prefill: {
                    email: auth.currentUser?.email || ''
                },
                notes: {
                    userId: uid,
                    packageId: packageInfo.id,
                    credits: packageInfo.credits
                },
                theme: {
                    color: '#8b5cf6'
                },
                modal: {
                    ondismiss: function () {
                        onFailure(new Error('Payment cancelled by user'));
                    }
                }
            };

            const razorpay = new window.Razorpay(options);
            razorpay.open();
        };

        script.onerror = () => {
            onFailure(new Error('Failed to load Razorpay SDK'));
        };
    } catch (error) {
        console.error('Error initiating payment:', error);
        onFailure(error);
    }
};

export default {
    CREDIT_PACKAGES,
    getUserCredits,
    openRazorpayCheckout
};
