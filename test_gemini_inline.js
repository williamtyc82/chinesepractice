import { GoogleGenAI } from "@google/genai";
import fs from 'fs';

const ai = new GoogleGenAI({
  apiKey: "AIzaSyDFYxVirAkzM2mS14Litm704hecgt6dWbw"
});

async function run() {
  const file = fs.readFileSync('test.png');
  const base64Data = file.toString('base64');
  
  const prompt = `Extract all the Chinese phrases/sentences from this worksheet image. 
Return only a comma-separated list of the Chinese phrases found. 
Do not include any numbers, pinyin, english translations, conversational text, markdown formatting, or bullet points in your response. 
Just the raw Chinese characters separated by commas.
Example output: 负责排桌椅,不能插队,注意安全,一片安静`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: [
        { inlineData: { data: base64Data, mimeType: "image/png" } },
        prompt
      ],
    });
    
    console.log("Response text:", response.text);
  } catch (err) {
    console.error('Gemini Error:', err);
  }
}

run();
