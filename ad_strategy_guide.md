# 📺 Watch Ads for Credits: Strategy & Profitability Guide

## 1. Is this a good feature?
**Yes.** Adding a "Watch Ad to Earn Credits" feature is a standard monetization strategy for "freemium" apps. It serves two main purposes:
1.  **Monetization from Non-Payers**: It allows you to earn revenue from users who would never buy a credit pack.
2.  **Engagement**: It keeps users in the app longer and allows them to "taste" the premium features without a credit card, increasing the likelihood of a future purchase.

## 2. Profitability Analysis (Updated for 1 Credit)

### 💰 Revenue (How much will 1000 ads pay?)
Revenue from Rewarded Video Ads varies by region (Tier 1 countries like US/UK pay more) and niche.
*   **Average eCPM (Revenue per 1000 views):** $15 - $25
*   **Estimated Revenue for 1000 Ads:** **$15.00 - $25.00**

### 💸 Cost (How much will 1000 credits cost you?)
This depends on the AI model you use (e.g., GPT-4o vs GPT-4o-mini vs Gemini Flash).
*   **Assumption:** 1 Credit = 1 Text Generation (Caption/Idea).
*   **Cost per Generation (Average):** ~$0.001 - $0.005 (blended rate for text/images).
*   **Cost for 1000 Credits:** **$1.00 - $5.00**

### 📈 The Verdict: 1 Credit vs 3 Credits
**1 Credit per Ad is EXTREMELY profitable.**
*   **Revenue (1000 ads):** ~$20.00
*   **Cost (1000 credits):** ~$5.00
*   **Net Profit:** **~$15.00** per 1000 ads watched.

**Comparison:**
*   **At 1 Credit/Ad:** You make ~$15 profit per 1000 views. (Safe, high margin).
*   **At 3 Credits/Ad:** You make ~$5 profit per 1000 views. (Riskier, lower margin, but higher user satisfaction).

### ⚖️ Recommendation
**Start with 1 Credit.**
*   It guarantees you won't lose money.
*   It encourages users to buy packs (watching 50 ads for 50 credits is tedious, so they might just pay $5 instead).
*   You can always increase it to 2 or 3 later during special events or if retention is low.

## 3. Implementation Guide

### How it works
1.  **User clicks "Watch Ad"**: A video ad plays (usually 15-30 seconds).
2.  **Ad Completes**: The ad network sends a callback (success).
3.  **Reward Granted**: You add +1 credit to the user's balance.

### Technical Implementation (What I added)
Since you don't have a live Ad Network account (Google AdMob / Unity Ads) connected yet, I have added a **"Mock Ad" system**:
1.  **UI**: Added a "Watch Ad (+1 Credit)" card to the Pricing Page.
2.  **Simulation**: Clicking it opens a modal that simulates a 15-second timer.
3.  **Reward**: After the timer, 1 credit is instantly added to their account.

### ⚠️ Important Notes for Production
*   **Security**: Currently, credits are added via client-side code (`updateDoc`). In a real production app, you **MUST** verify the ad view on your backend (Cloud Function) before granting credits to prevent hackers from faking ad views.
*   **Ad Network**: To make real money, you need to sign up for **Google AdMob** (mobile) or **Google AdSense / Unity Ads** (web) and replace the "Mock Modal" with their SDK code.
