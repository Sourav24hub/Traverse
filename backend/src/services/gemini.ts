/**
 * Gemini AI service — generates a structured day-by-day itinerary.
 *
 * Uses the Gemini API (GEMINI_API_KEY from environment).
 * The model is asked to respond with strict JSON matching the spec §9.2 shape.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ItineraryDay, ItineraryItem } from "../models/store.js";
import { generateId } from "./idgen.js";

/**
 * Minimal structural type for the Gemini client — satisfied by both
 * a real GoogleGenerativeAI instance and test mocks.
 */
export interface GeminiClient {
  getGenerativeModel(params: { model: string }): {
    generateContent(prompt: string): Promise<{
      response: { text(): string };
    }>;
  };
}

/** Factory that returns a Gemini client; replaced in tests with a mock factory */
export let getGeminiClient: () => GeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set in environment variables.");
  }
  return new GoogleGenerativeAI(apiKey);
};

/** Allow tests to inject a mock client factory */
export function setGeminiClientFactory(factory: () => GeminiClient): void {
  getGeminiClient = factory;
}

interface GenerateItineraryParams {
  destination: string;
  days: number;
  people: number;
  prompt?: string;
}

/**
 * Calls Gemini to produce a structured itinerary.
 * Returns an array of ItineraryDay objects (one per travel day).
 */
export async function generateItinerary(
  params: GenerateItineraryParams
): Promise<ItineraryDay[]> {
  const { destination, days, people, prompt } = params;

  const systemPrompt = `You are a travel planning assistant. 
Generate a day-by-day itinerary for a trip to ${destination}.
Duration: ${days} day(s). Group size: ${people} person(s).
${prompt ? `Additional requirements: ${prompt}` : ""}

Respond ONLY with a valid JSON array (no markdown, no explanation). 
The array must have exactly ${days} elements, each matching this structure:
{
  "day": <integer, 1-based>,
  "items": [
    {
      "name": "<place or activity name>",
      "lat": <latitude as number>,
      "lng": <longitude as number>,
      "type": "<one of: checkpoint | restaurant | activity | accommodation | transport>",
      "completed": false
    }
  ]
}

Include 3-5 items per day. Use accurate real-world coordinates for ${destination}.
Do NOT include any text outside the JSON array.`;

  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
  const result = await model.generateContent(systemPrompt);
  const text = result.response.text().trim();

  // Strip markdown fences if the model wrapped the JSON in ```json ... ```
  const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

  let raw: unknown;
  try {
    raw = JSON.parse(jsonText);
  } catch {
    throw new Error(`Gemini returned non-JSON response: ${jsonText.slice(0, 200)}`);
  }

  if (!Array.isArray(raw)) {
    throw new Error("Gemini response was not a JSON array.");
  }

  // Normalise and assign stable itemIds
  const itineraryDays: ItineraryDay[] = (raw as Record<string, unknown>[]).map(
    (dayObj, idx) => {
      const dayNum: number =
        typeof dayObj.day === "number" ? dayObj.day : idx + 1;

      const rawItems = Array.isArray(dayObj.items)
        ? (dayObj.items as Record<string, unknown>[])
        : [];

      const items: ItineraryItem[] = rawItems.map((it) => ({
        itemId: generateId("i"),
        name: String(it.name ?? "Unnamed stop"),
        lat: Number(it.lat ?? 0),
        lng: Number(it.lng ?? 0),
        type: String(it.type ?? "checkpoint"),
        completed: false,
      }));

      return { day: dayNum, items };
    }
  );

  return itineraryDays;
}
