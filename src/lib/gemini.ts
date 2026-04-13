import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export async function getCampaignInsights(campaignData: any) {
  if (!ai) return "AI insights are currently unavailable. Please check your API key.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the following campaign performance data and provide 3 concise, actionable insights for improvement:
      ${JSON.stringify(campaignData, null, 2)}
      
      Focus on ROI, cancellation rates, and confirmation rates.`,
    });

    return response.text || "No insights generated.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Failed to generate AI insights.";
  }
}
