import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

// Lấy biến môi trường từ Netlify hoặc .env local
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

const supabase = createClient(supabaseUrl!, supabaseKey!);

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body || "{}");

    // Netlify Header chứa IP thực của user
    const clientIp = event.headers["x-nf-client-connection-ip"] || "127.0.0.1";

    const { error } = await supabase.from("chat_logs").insert({
      session_id: data.sessionId,
      user_ip: clientIp,
      user_message: data.userMessage,
      ai_response: data.aiMessage,
    });

    if (error) throw error;

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error: any) {
    console.error("Save Log Error:", error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
