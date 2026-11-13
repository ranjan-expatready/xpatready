// Prisma 7 configuration: the schema folder (prisma/schema/*.prisma, one file per area) and the local demo database (127.0.0.1:54329, started by studio/start.sh).
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema",   // a folder, one file per area (DB-SPLIT; DEVELOPING.md)
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DATABASE_URL ?? "postgresql://xr_studio@127.0.0.1:54329/xr_studio_demo" },
});
