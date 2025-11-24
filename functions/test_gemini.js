const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI("AIzaSyBTE9GkRl051i6WVOUp3IzMU0uHn23pwgQ");

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello, are you working?");
        const response = await result.response;
        console.log(`Success with ${modelName}:`, response.text());
    } catch (error) {
        console.log(`Failed with ${modelName}:`, error.message);
    }
}

async function runTests() {
    await testModel("gemini-3-pro-preview");
}

runTests();
