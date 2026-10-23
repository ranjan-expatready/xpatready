// No-network guard for the free scoring set (E1a). Loaded with `node --import` before any scoring script; every
// way out of the process to the network throws, so a script that tried to call a model or any web service
// fails loudly instead of spending. run.sh also clears the environment (no API key) and runs Node's permission
// model (reads and writes only inside the throwaway copy, no child processes, no workers).
import dgram from "node:dgram";
import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import { syncBuiltinESMExports } from "node:module";
import net from "node:net";
import tls from "node:tls";

const blocked = (what) => () => { throw new Error(`scoring set: network blocked (${what}); scoring is offline and free`); };
globalThis.fetch = blocked("fetch");
globalThis.WebSocket = blocked("WebSocket");
globalThis.EventSource = blocked("EventSource");
for (const [mod, names, label] of [
  [net, ["connect", "createConnection", "createServer"], "net"],
  [tls, ["connect", "createServer"], "tls"],
  [http, ["request", "get", "createServer"], "http"],
  [https, ["request", "get", "createServer"], "https"],
  [dns, ["lookup", "resolve", "resolve4", "resolve6", "resolveAny"], "dns"],
  [dns.promises, ["lookup", "resolve", "resolve4", "resolve6", "resolveAny"], "dns"],
  [dgram, ["createSocket"], "udp"],
]) for (const n of names) mod[n] = blocked(`${label}.${n}`);
net.Socket.prototype.connect = blocked("net.Socket.connect");
syncBuiltinESMExports();
process.env.SCORING_SET_GUARD = "on";
