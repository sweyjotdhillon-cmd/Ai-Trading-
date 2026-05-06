import { GoogleGenAI } from '@google/genai';
const ai = new GoogleGenAI();
ai.models.generateContent({
   model: 'gemini-2.5-flash',
   contents: ['hello']
}).then(r => console.log(r.text)).catch(e => console.error(e));
