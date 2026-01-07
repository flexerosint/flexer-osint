
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeOSINTResult = async (jsonData: any) => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this OSINT lookup JSON data and provide a professional summary of findings, security risks, and key insights: ${JSON.stringify(jsonData)}`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    return response.text;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Could not generate AI analysis for this data.";
  }
};
