import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: `You are a helpful assistant for Forehand Nail Studio, a luxury nail salon.
You can help customers with:
- Booking appointments
- Answering questions about services and pricing
- Providing information about the salon
- Helping with rescheduling or cancellations

Be friendly, professional, and concise. The salon is based in Iran and serves Persian-speaking clients.
Respond in the same language the customer uses (Persian or English).`,
    messages,
  });

  return result.toTextStreamResponse();
}
