import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { StudySection } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export async function generateStudyGuideContent(topic: string): Promise<StudySection[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate a comprehensive, high-quality deep dive or guide for the topic: "${topic}". 
    The content should be versatile, informative, and engaging for any audience (not just students).
    The guide should be divided into 6-8 comprehensive sections. 
    Each section should have a title and detailed markdown content.
    At least 3 sections should include data for a chart (bar, line, or pie) that visualizes a key concept or data point in that section.
    At least 2 sections should include a descriptive prompt for a 3D-style high-quality illustration that illustrates the concept.
    Return the result as a JSON array of sections.`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            content: { type: Type.STRING },
            chart: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["bar", "line", "pie"] },
                title: { type: Type.STRING },
                data: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      name: { type: Type.STRING },
                      value: { type: Type.NUMBER }
                    },
                    required: ["name", "value"]
                  }
                }
              },
              required: ["type", "title", "data"]
            },
            imagePrompt: { type: Type.STRING }
          },
          required: ["title", "content"]
        }
      }
    }
  });

  const sections = JSON.parse(response.text) as StudySection[];
  
  // Generate images for sections that have prompts
  for (const section of sections) {
    if (section.imagePrompt) {
      try {
        const imgResponse = await ai.models.generateContent({
          model: "gemini-2.5-flash-image",
          contents: `Create a high-quality, 3D educational illustration for: ${section.imagePrompt}. Style: Clean, professional, 3D render, educational.`,
        });
        
        for (const part of imgResponse.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            section.imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            break;
          }
        }
      } catch (error) {
        console.error("Failed to generate image:", error);
      }
    }
  }

  return sections;
}

export async function getChatResponse(topic: string, history: { role: string, text: string }[], message: string) {
  const chat = ai.chats.create({
    model: "gemini-3.1-pro-preview",
    config: {
      systemInstruction: `You are an expert consultant and knowledge assistant for the topic: "${topic}". Answer the user's questions clearly, accurately, and concisely. Provide deep insights and versatile information.`,
    }
  });

  // We don't use history directly in create, but we can send it or just use the last message
  // For simplicity, let's just send the message with context
  const response = await chat.sendMessage({ message });
  return response.text;
}
