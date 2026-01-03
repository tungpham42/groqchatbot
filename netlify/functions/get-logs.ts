import { Handler } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

export const handler: Handler = async (event) => {
  // Bảo mật đơn giản: Cần secret key trên url
  const secret = event.queryStringParameters?.secret;

  if (secret !== process.env.DASHBOARD_PASSWORD) {
    // Bạn có thể đổi pass này
    return { statusCode: 401, body: JSON.stringify({ error: "Unauthorized" }) };
  }

  const { data, error } = await supabase
    .from("chat_logs")
    .select("*")
    .order("created_at", { ascending: false }) // Mới nhất lên đầu
    .limit(100);

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify(data) };
};
