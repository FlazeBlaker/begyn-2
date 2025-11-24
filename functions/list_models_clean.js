const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');

const genAI = new GoogleGenerativeAI("AIzaSyBTE9GkRl051i6WVOUp3IzMU0uHn23pwgQ");

async function listModels() {
    try {
        const apiKey = "AIzaSyBTE9GkRl051i6WVOUp3IzMU0uHn23pwgQ";
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

        const response = await fetch(url);
        const data = await response.json();

        let output = "Available Models:\n";
        if (data.models) {
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    output += `- ${m.name} (Version: ${m.version})\n`;
                }
            });
        } else {
            output += "No models found or error: " + JSON.stringify(data);
        }

        fs.writeFileSync('models_list.txt', output);
        console.log("Wrote models to models_list.txt");

    } catch (error) {
        console.error("Error listing models:", error.message);
    }
}

listModels();
