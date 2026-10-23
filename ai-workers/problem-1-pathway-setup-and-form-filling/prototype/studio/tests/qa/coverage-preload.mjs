// QA harness only (P-69): lets a server started with NODE_V8_COVERAGE write its coverage when it is stopped by a signal
// (tools/isolated.sh stops servers with SIGTERM). Loaded with NODE_OPTIONS="--import <this file>"; changes no app behaviour.
for (const s of ["SIGTERM", "SIGINT", "SIGHUP"]) process.on(s, () => process.exit(0));
