import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: "AIzaSyDFYxVirAkzM2mS14Litm704hecgt6dWbw"
});

async function run() {
  console.log('Testing Gemini...');
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: "A star",
    });
    console.log('Success, response parts count:', response.candidates[0].content.parts.length);
  } catch (err) {
    console.error('Gemini Error:', err);
  }
}

run();
