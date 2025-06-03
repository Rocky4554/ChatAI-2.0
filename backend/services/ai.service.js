import { GoogleGenerativeAI } from "@google/generative-ai"
// import { prompt } from "../utils/prompt.js";
import { prompt } from "../utils/landingpage_prompt.js";


const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.5,
    },
    systemInstruction: prompt,
});

export const generateResult = async (prompt) => {

    const result = await model.generateContent(prompt);
    console.log("ai response before server",result.response.text());

    return result.response.text()
}