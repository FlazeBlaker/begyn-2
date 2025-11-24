const { GoogleGenerativeAI } = require("@google/generative-ai");

// Use the key from index.js
const genAI = new GoogleGenerativeAI("AIzaSyBTE9GkRl051i6WVOUp3IzMU0uHn23pwgQ");

async function listModels() {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Dummy model to get client
        // Actually, we need the model manager or just try to list. 
        // The SDK doesn't have a direct listModels on the client instance in all versions, 
        // but let's try to just run a generation with a known old model to see if it works, 
        // or use the error message which might list models? 
        // No, the error message said "Call ListModels".

        // In the Node SDK, it might be different. 
        // Let's try to use the API directly via fetch if SDK doesn't expose it easily 
        // or just try 'gemini-pro' which is usually safe.

        // But let's try to fetch via REST to be sure.
        const apiKey = "AIzaSyBTE9GkRl051i6WVOUp3IzMU0uHn23pwgQ";
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        console.log("Available Models:", JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
