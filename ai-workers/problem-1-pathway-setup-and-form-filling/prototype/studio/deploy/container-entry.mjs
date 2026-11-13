// PF-7: the container's one process. api/src/main.ts listens on 127.0.0.1 only (right for the Mac and lane copies);
// inside a container that address is unreachable from outside, so this forwards 0.0.0.0:STUDIO_PUBLIC_PORT (8080) to
// 127.0.0.1:STUDIO_PORT (4400) in the same process, then starts the API. main.ts stays unchanged (new files only); a
// STUDIO_HOST line in main.ts, with the tech lead's OK, would retire this file. Run by tsx with api/tsconfig.json.
import net from "node:net";

const inner = Number(process.env.STUDIO_PORT ?? 4400);
const outer = Number(process.env.STUDIO_PUBLIC_PORT ?? 8080);
net.createServer((client) => {
  const api = net.connect(inner, "127.0.0.1");
  client.pipe(api).pipe(client);
  // A dropped side closes the other; an API not yet listening refuses the connection like a closed port would.
  api.on("error", () => client.destroy());
  client.on("error", () => api.destroy());
}).listen(outer, "0.0.0.0", () => console.log(`container entry: 0.0.0.0:${outer} -> 127.0.0.1:${inner}`));

// The container stops cleanly on docker stop (compose runs it with init, so the signal reaches this process).
for (const s of ["SIGTERM", "SIGINT"]) process.on(s, () => process.exit(0));

await import("../api/src/main.ts");
