import { store } from "../models/store";

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export type NotificationTrigger =
  | "trip_created"
  | "user_joined"
  | "trip_deleted"
  | "user_left"
  | "you_joined"
  | "you_left"
  | "you_removed"
  | "trip_cancelled"
  | "itinerary_replanned"
  | "location_reached_you"
  | "location_reached_other"
  | "change_proposed"
  | "change_accepted"
  | "change_rejected";

export interface TriggerContext {
  destination?: string;
  username?: string; // name of person who did the action
  placeName?: string; // for location reached
}

// Fallback static messages for when Groq is unavailable, times out, or errors.
const FALLBACKS: Record<NotificationTrigger, (ctx: TriggerContext) => string> = {
  trip_created: (ctx) => `Pack your bags for ${ctx.destination}!`,
  user_joined: (ctx) => `${ctx.username} just joined your trip!`,
  trip_deleted: (ctx) => `The trip to ${ctx.destination} was deleted.`,
  user_left: (ctx) => `${ctx.username} left the trip.`,
  you_joined: (ctx) => `You successfully joined the trip to ${ctx.destination}.`,
  you_left: (ctx) => `You left the trip to ${ctx.destination}.`,
  you_removed: (ctx) => `You have been removed from the trip to ${ctx.destination}.`,
  trip_cancelled: (ctx) => `The trip to ${ctx.destination} was cancelled.`,
  itinerary_replanned: () => `The itinerary has been updated.`,
  location_reached_you: (ctx) => `You just reached ${ctx.placeName}!`,
  location_reached_other: (ctx) => `${ctx.username} just checked into ${ctx.placeName}!`,
  change_proposed: (ctx) => `${ctx.username} proposed a change to the itinerary.`,
  change_accepted: () => `Your proposed change was accepted!`,
  change_rejected: () => `Your proposed change was rejected.`,
};

/**
 * Generates a dynamic notification message using Groq and saves it to the store.
 * Fires asynchronously and falls back safely so it never blocks the main action.
 */
export async function fireDynamicNotification(
  userId: string,
  tripId: string | undefined,
  type: NotificationTrigger,
  context: TriggerContext
) {
  // Use a fallback right away if no API key
  if (!GROQ_API_KEY) {
    store.saveNotification({
      userId,
      tripId,
      type,
      message: FALLBACKS[type](context),
    });
    return;
  }

  // 1. Prepare prompt
  const systemPrompt = `You are a notification generator for a travel app called Traverse.
Generate a single, short, punchy, varied notification sentence (max 15 words) for a user.
DO NOT use quotes. DO NOT add extra commentary. JUST the sentence.
Tone guardrails:
- Positive/neutral events (created, joined, reached checkpoint): Adventurous, warm, slightly playful.
- Negative events (removed, deleted, cancelled, left): Measured, direct, and neutral. Don't be cheerful.`;

  let userPrompt = `Event type: ${type}\n`;
  if (context.destination) userPrompt += `Destination: ${context.destination}\n`;
  if (context.username) userPrompt += `Username (of person who took action): ${context.username}\n`;
  if (context.placeName) userPrompt += `Place: ${context.placeName}\n`;
  
  userPrompt += `Write the notification.`;

  try {
    // Fast 1500ms timeout so we don't hold up things if run synchronously by mistake
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500);

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b", // Fast model for notifications
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.8, // Allow variety
        max_tokens: 500
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error("Groq API error");
    
    const data = await response.json();
    let message = data.choices[0].message.content.trim();
    // Clean up quotes if the model adds them anyway
    if (message.startsWith('"') && message.endsWith('"')) {
      message = message.slice(1, -1);
    }
    
    store.saveNotification({ userId, tripId, type, message });

  } catch (error) {
    // Fallback on error or timeout
    console.warn(`[Groq] Notification generation failed for ${type}. Using fallback.`);
    store.saveNotification({
      userId,
      tripId,
      type,
      message: FALLBACKS[type](context),
    });
  }
}
