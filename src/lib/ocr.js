import { GoogleGenAI } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

/**
 * Converts a File object to a base64 string.
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // FileReader returns a Data URI: data:image/png;base64,...
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
  });
}

/**
 * Extracts Chinese characters from an uploaded image using Gemini.
 * 
 * @param {File} imageFile - The image file to process
 * @param {Function} onProgress - Callback for progress updates (0 to 1) 
 * @returns {Promise<string[]>} Array of extracted words/characters
 */
export async function extractVocabularyFromImage(imageFile, onProgress = null) {
  if (!ai) {
    throw new Error('Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your .env file.');
  }

  if (onProgress) onProgress(0.2); // Just to show it started

  try {
    const base64Data = await fileToBase64(imageFile);
    
    if (onProgress) onProgress(0.5);

    const inlineData = {
      data: base64Data,
      mimeType: imageFile.type
    };

    const prompt = `Extract all the Chinese phrases/sentences from this worksheet image. 
Return only a comma-separated list of the Chinese phrases found. 
Do not include any numbers, pinyin, english translations, conversational text, markdown formatting, or bullet points in your response. 
Just the raw Chinese characters separated by commas.
Example output: 负责排桌椅,不能插队,注意安全,一片安静`;

    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        { inlineData }, 
        prompt
      ],
    });

    if (onProgress) onProgress(0.9);

    const rawText = response.text || '';
    
    // Clean up the text
    const words = rawText
      .split(/[\n\s,;，；]+/)
      .map(w => w.replace(/[^\u4e00-\u9fa5]/g, '').trim()) // Keep ONLY Chinese characters
      .filter(w => w.length > 0);
      
    if (onProgress) onProgress(1.0);

    // Deduplicate and return
    return [...new Set(words)];

  } catch (error) {
    console.error('Gemini OCR Error:', error);
    throw new Error('Failed to extract text from image using Gemini');
  }
}
