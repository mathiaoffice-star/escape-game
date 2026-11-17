import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
const cors = { "Access-Control-Allow-Origin": "https://mathiaoffice-star.github.io", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) return json({ error: "server_not_configured" }, 503);
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\\s+/i, "");
    if (!token) return json({ error: "unauthorized" }, 401);
    const admin = createClient(url, serviceKey);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: "invalid_session" }, 401);
    const body = await req.json();
    const matchId = String(body.match_id || ""), opponentId = String(body.opponent_id || ""), winnerId = String(body.winner_id || "");
    const expectedMatchId = [user.id, opponentId].sort().join("_");
    if (!/^[0-9a-f-]{36}$/i.test(opponentId) || opponentId === user.id || matchId !== expectedMatchId || ![user.id, opponentId].includes(winnerId)) return json({ error: "invalid_match_result" }, 400);
    const { error: insertError } = await admin.from("battle_result_reports").insert({ match_id: matchId, user_id: user.id, opponent_id: opponentId, winner_id: winnerId });
    if (insertError && insertError.code !== "23505") { console.error(insertError.message); return json({ error: "result_report_failed" }, 500); }
    const { data: result, error: rateError } = await admin.rpc("apply_battle_rating", { p_match_id: matchId });
    if (rateError) { console.error(rateError.message); return json({ error: "rating_update_failed" }, 500); }
    return json({ ok: true, result });
  } catch (error) { console.error(error); return json({ error: "internal_error" }, 500); }
});