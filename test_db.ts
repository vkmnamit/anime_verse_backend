import { config } from "dotenv";
config();
import { createClient } from "@supabase/supabase-js";

const s = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
s.from("profiles").select("id, username").then(console.log);
