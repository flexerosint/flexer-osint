import { GoogleGenAI } from "@google/genai";

export const analyzeOSINTResult = async (jsonData: any) => {
  // Initialize inside to ensure process.env.API_KEY is available from the runtime context.
  // Always use the named parameter and direct process.env.API_KEY access as per guidelines.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analyze this OSINT lookup JSON data and provide a professional summary of findings, security risks, and key insights: ${JSON.stringify(jsonData)}`,
      config: {
        thinkingConfig: { thinkingBudget: 0 }
      }
    });
    // Directly access the .text property from the response object
    return response.text;
  } catch (error) {
    console.error("Gemini analysis error:", error);
    return "Could not generate AI analysis for this data.";
  }
};