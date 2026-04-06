import { GoogleGenAI } from "@google/genai";
import fs from 'fs';
const envFile = fs.readFileSync('.env', 'utf-8');
const apiKeyMatch = envFile.match(/VITE_GEMINI_API_KEY=(.*)/);
const apiKey = apiKeyMatch ? apiKeyMatch[1].trim() : '';
console.log("Testing validation with key exists:", !!apiKey);

const ai = new GoogleGenAI({ apiKey });

async function test() {
  try {
    const originalFetch = global.fetch;
    global.fetch = async (url, options) => {
      options = options || {};
      options.headers = options.headers || {};
      options.headers['Referer'] = 'https://chinesepractice-eight.vercel.app/';
      return originalFetch(url, options);
    };

    console.log("Calling Gemini generateContent with an image...");
    
    // 1x1 pixel white png
    const base64Data = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";
    const inlineData = {
      data: base64Data,
      mimeType: "image/png"
    };
    const prompt = "What is this image?";

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { inlineData }, 
        prompt
      ],
    });
    console.log("Success! Output:");
    console.log(response.text);
  } catch (err) {
    console.error("Error occurred:");
    console.error(err);
  }
}

test();
