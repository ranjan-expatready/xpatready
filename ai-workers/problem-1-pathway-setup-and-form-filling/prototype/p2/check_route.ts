// AIW-D261 route check. Reads the founder's key file, refuses unsafe permissions, and asks the
// Models API whether the comparison model is available. Sends no prompt and no file content;
// never prints the key. It shows that the key works and the model is listed, nothing more: it does not
// qualify retention, training or processing-region terms (those stay with AIW-D147 for production).
import Anthropic from "@anthropic-ai/sdk";
import { loadKey } from "./guard.ts";
import { BASE_URL, MODELS, ROUTE_ID } from "./policy.ts";

const MODEL = MODELS[0];

try {
  const client = new Anthropic({ apiKey: loadKey(), baseURL: BASE_URL, maxRetries: 0, timeout: 20_000 });
  const m = await client.models.retrieve(MODEL);
  console.log(JSON.stringify({ route: ROUTE_ID, model: m.id, available: true, prompt_sent: false, qualifies: "key and model availability only; not a retention or policy qualification" }));
} catch (e) {
  const status = e instanceof Anthropic.APIError ? e.status : undefined;
  console.log(JSON.stringify({ route: ROUTE_ID, available: false, status, error: (e as Error).message.slice(0, 200) }));
  process.exit(1);
}
