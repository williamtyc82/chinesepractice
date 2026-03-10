import { pinyin } from 'pinyin-pro';

/**
 * Gets Pinyin for a Chinese word.
 * @param {string} word - The Chinese word
 * @returns {string} Pinyin with tone marks
 */
export function getPinyin(word) {
  return pinyin(word, { toneType: 'num' }).replace(/\s+/g, ''); // Or default tone marks
}

/**
 * Fetches English definition for a Chinese word.
 * In a real production app, this would use a robust dictionary API (e.g. CC-CEDICT based) or an LLM call.
 * For this demo, we'll try a public dictionary API or return a placeholder for the user to edit.
 * 
 * @param {string} word - The Chinese word
 * @returns {Promise<string>} English meaning
 */
export async function getMeaning(word) {
  // Try to use a free dictionary API (e.g., glosbe or similar, but CORS is often an issue)
  // Since we don't have a guaranteed free unauthenticated Chinese-English API that supports CORS,
  // we will return a placeholder or do a basic mock for common words to demonstrate.
  // The user can edit the meaning in the Review List before submitting.

  const mockDict = {
    '宇': 'Space',
    '你好': 'Hello',
    '数字': 'Numbers',
    '家人': 'Family',
    '学校': 'School',
    '一': 'One',
    '二': 'Two',
    '三': 'Three',
    '一片安静': 'A piece of quiet / completely silent',
    '安静': 'Quiet',
    '月亮': 'Moon',
    '太阳': 'Sun'
  };

  if (mockDict[word]) {
    return mockDict[word];
  }

  // Fallback empty string instead of a hardcoded "Click to edit" so the input placeholder shows
  return '';
}

/**
 * Processes an array of words to get their Pinyin and Meaning.
 * @param {string[]} words - Array of Chinese words
 * @returns {Promise<Object[]>} Array of objects with word, pinyin, meaning
 */
export async function processVocabularyList(words) {
  const processed = [];
  for (const word of words) {
    const py = pinyin(word); // using tone marks by default
    const meaning = await getMeaning(word);
    
    processed.push({
      id: crypto.randomUUID(), // temp ID for UI editing
      word,
      pinyin: py,
      meaning,
      chapter: 'Upload' // Default chapter
    });
  }
  return processed;
}
