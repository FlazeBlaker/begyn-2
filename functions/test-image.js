// Test script to verify Gemini image generation works
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "AIzaSyBTE9GkRl051i6WVOUp3IzMU0uHn23pwgQ");

async function testImageGeneration() {
    try {
        console.log("Testing Gemini 2.5 Flash Image model...");

        const imageModel = genAI.getGenerativeModel({
            model: "gemini-2.5-flash-image"
        });

        const prompt = "Create a simple blue circle on white background";
        console.log("Sending prompt:", prompt);

        const result = await imageModel.generateContent(prompt);
        const response = await result.response;

        console.log("Response received:");
        console.log("Candidates:", response.candidates?.length);

        if (response.candidates && response.candidates[0]) {
            const parts = response.candidates[0].content.parts;
            console.log("Parts:", parts.length);

            for (const part of parts) {
                if (part.text) {
                    console.log("Text part:", part.text);
                }
                if (part.inlineData) {
                    console.log("Image part found!");
                    console.log("MIME type:", part.inlineData.mimeType);
                    console.log("Data length:", part.inlineData.data.length);
                    console.log("✅ IMAGE GENERATION WORKS!");
                    return true;
                }
            }
        }

        console.log("❌ No image data in response");
        console.log("Full response:", JSON.stringify(response, null, 2));
        return false;

    } catch (e) {
        console.error("❌ ERROR:", e.message);
        console.error("Error stack:", e.stack);
        return false;
    }
}

testImageGeneration();
