const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');

// Initialize Vertex AI
// Note: This expects Google Cloud credentials to be configured in the environment.
// (e.g., via 'gcloud auth application-default login' or GOOGLE_APPLICATION_CREDENTIALS)
const vertex_ai = new VertexAI({ project: 'ai-social-media-19b8b', location: 'us-central1' });

async function generateImage() {
    const model = 'imagegeneration@006';

    const generativeModel = vertex_ai.preview.getGenerativeModel({
        model: model,
    });

    const prompt = 'A futuristic pickleball court on Mars, cinematic lighting, 4k';

    console.log(`Generating image with model: ${model}`);
    console.log(`Prompt: "${prompt}"`);

    try {
        const result = await generativeModel.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });

        const response = await result.response;

        // Check for image content in the response
        // The structure for Imagen on Vertex AI can vary, but typically it returns base64 data
        // However, for 'generateContent' with Imagen 3, we need to inspect the response structure carefully.
        // Often it's in candidates[0].content.parts[0].inlineData

        console.log('Response received.');

        if (response.candidates && response.candidates[0]) {
            const parts = response.candidates[0].content.parts;
            for (const part of parts) {
                if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
                    const base64Data = part.inlineData.data;
                    const buffer = Buffer.from(base64Data, 'base64');
                    fs.writeFileSync('test-image.png', buffer);
                    console.log('Success! Image saved to test-image.png');
                    return;
                }
            }
        }

        console.log('No image found in response:', JSON.stringify(response, null, 2));

    } catch (error) {
        console.error('Error generating image:', error);
    }
}

generateImage();
