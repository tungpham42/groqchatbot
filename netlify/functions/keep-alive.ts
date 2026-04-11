import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client (Consistent with save-chat.ts and get-logs.ts)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

/**
 * Netlify Scheduled Function to prevent Supabase from pausing.
 * Runs twice a week to register activity.
 */
export const handler: Handler = async (event, context) => {
  try {
    console.log("[Keep-Alive] Pinging Supabase to maintain activity...");

    // Querying 'chat_logs' since it is already defined in your other functions
    const { data, error } = await supabase
      .from("chat_logs")
      .select("id")
      .limit(1);

    if (error) {
      throw error;
    }

    console.log("[Keep-Alive] Success: Activity registered.");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Supabase is awake",
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error: any) {
    console.error("[Keep-Alive] Error:", error.message);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};

// Netlify Cron Schedule: Runs at midnight every Monday and Thursday
// Matches the logic used in your initial keep-alive setup
export const config = {
  schedule: "0 0 * * 1,4",
};
