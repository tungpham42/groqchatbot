import { Handler } from "@netlify/functions";
import Groq from "groq-sdk";

// Khởi tạo Groq SDK
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// Danh sách Model theo thứ tự ưu tiên (Chiến thuật Fallback)
const MODELS = [
  "meta-llama/llama-4-maverick-17b-128e-instruct", // 1. First Choice
  "openai/gpt-oss-120b", // 2. Primary High-Intelligence Model
  "openai/gpt-oss-20b", // 3. High-Quality Fallback
  "llama-3.3-70b-versatile", // 4. Fast/Efficient Fallback
  "llama-3.1-8b-instant", // 5. "Last Resort" Instant Model
];

/**
 * Fetches real-time web context using the Tavily Search API.
 * Optimized to return concise, AI-ready text to save tokens.
 */
async function fetchWebContext(query: string): Promise<string> {
  try {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      console.warn("Missing TAVILY_API_KEY. Skipping web search.");
      return "";
    }

    console.log(`[Search] Querying Tavily for: "${query}"`);

    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query: query,
        search_depth: "advanced",
        include_answer: true,
        max_results: 5,
      }),
    });

    if (!response.ok) {
      throw new Error(`Tavily API Error: ${response.statusText}`);
    }

    const data = await response.json();

    // Format the results into a clean string for the LLM
    let context = "";
    if (data.answer) {
      context += `Summary Answer: ${data.answer}\n\n`;
    }

    if (data.results && data.results.length > 0) {
      context += "Detailed Sources:\n";
      context += data.results
        .map(
          (r: any) =>
            `- Title: ${r.title}\n  URL: ${r.url}\n  Content: ${r.content}`,
        )
        .join("\n\n");
    }

    return context || "No highly relevant information found on the internet.";
  } catch (error) {
    console.error("Failed to fetch web data:", error);
    return ""; // Return empty string so the chatbot still works using its base knowledge
  }
}

export const handler: Handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { messages } = JSON.parse(event.body || "{}");

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return { statusCode: 400, body: "Invalid messages format" };
    }

    // 1. Extract the user's latest query to search the web
    const lastUserMessage = messages.filter((m) => m.role === "user").pop();
    let webContext = "";

    if (lastUserMessage) {
      webContext = await fetchWebContext(lastUserMessage.content);
    }

    // 2. Build the System Prompt with the live web data
    // The instructions ensure it responds in the same language the user speaks
    const systemPromptMessage = {
      role: "system",
      content: `You are a helpful, intelligent AI assistant. Always respond in the same language the user uses.

      Use the following real-time web search results to inform and ground your answer. 
      If the search results contain relevant information, use it to provide an accurate, up-to-date response. 
      If the search results do not contain the answer, or if the context is empty, rely on your general knowledge.
      
      === REAL-TIME WEB CONTEXT ===
      ${webContext ? webContext : "No real-time data available for this query."}
      =============================`,
    };

    // Filter out any previous system prompts sent by the client to avoid conflicts,
    // then prepend our new RAG system prompt.
    const filteredMessages = messages.filter((m) => m.role !== "system");
    const augmentedMessages = [systemPromptMessage, ...filteredMessages];

    // 3. Recursive function to try models sequentially
    const getResponse = async (modelIndex: number): Promise<any> => {
      // If all models have been tried and failed
      if (modelIndex >= MODELS.length) {
        throw new Error("Server overloaded: All models are busy.");
      }

      const currentModel = MODELS[modelIndex];

      try {
        console.log(`Attempting to use model: ${currentModel}`);

        const completion = await groq.chat.completions.create({
          messages: augmentedMessages,
          model: currentModel,
          temperature: 0.7, // Lowered slightly for better factual adherence
          max_tokens: 4096,
        });

        // Return the AI's content and the name of the model that succeeded
        return {
          content: completion.choices[0]?.message?.content || "",
          usedModel: currentModel,
        };
      } catch (error: any) {
        console.warn(
          `Model ${currentModel} failed with error: ${error?.status || error.message}`,
        );

        // If error is 429 (Rate Limit) or 5xx (Server Error) -> Try the next model
        if (error?.status === 429 || error?.status >= 500) {
          return getResponse(modelIndex + 1);
        }

        // For other errors (like invalid API Key, bad request format), throw immediately
        throw error;
      }
    };

    // Start trying from the first model (index 0)
    const result = await getResponse(0);

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error("Critical Error:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};
