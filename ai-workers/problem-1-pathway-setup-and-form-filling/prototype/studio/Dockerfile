# syntax=docker/dockerfile:1
# PF-7 (walking skeleton, contracts 2026-11-14 §1.3): the Product Studio as one container image — the NestJS API run by
# tsx, serving the web app Vite built, against PostgreSQL given by DATABASE_URL at run time. US$0, live AI off.
#
# Build from the REPOSITORY ROOT (the API reads files beside studio/: prototype/contracts, p2, p3, p5, expected and the
# official sources, by paths relative to its own folder, api/src/core.ts):
#   docker build -f ai-workers/problem-1-pathway-setup-and-form-filling/prototype/studio/Dockerfile -t studio:local .
# The ignore list is this file's own, Dockerfile.dockerignore beside it (BuildKit reads it in place of a .dockerignore at
# the context root, so nothing is added outside studio/): an allow-list, so a new folder never enters the image unseen.
#
# Choices (recorded for the reviewer and PF-8):
#  * Base: node 24.21.0 (package.json "engines"), Debian bookworm-slim (glibc: Prisma's engines and pg as on the
#    runners), pinned by the multi-platform index digest of node:24.21.0-bookworm-slim read on 13 Nov 2026.
#  * Two stages: "build" installs both lockfiles with npm ci (studio, and prototype/env/node for the contracts' ajv,
#    AIW-D259), builds the web app (vite build) and generates the Prisma client; "run" copies the result, owned by root
#    and read-only for the app, with only var/ writable.
#  * Dev packages stay in the image: the API runs from TypeScript with tsx and migrations use the prisma CLI, both dev
#    dependencies today. A compiled, pruned image is PF-8's to weigh (size, start time); nothing here blocks it.
#  * Non-root: the base image's "node" user (uid 1000). No secret in any layer or in ENV: DATABASE_URL comes from the
#    compose file or the deploy at run time (the smoke script checks docker history and the image's environment).
#  * The API listens on 127.0.0.1 (api/src/main.ts); deploy/container-entry.mjs forwards 0.0.0.0:8080 to it in the same
#    process, so main.ts is unchanged (PF-7 touches new files only). A STUDIO_HOST line in main.ts would retire it.
#  * No Python, poppler or qpdf: form filling (fill-case.ts) and PDF reading are not part of the skeleton; the image
#    answers health, pages and the API. Adding them is a later row with its own size and gate.
FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS build
ENV NPM_CONFIG_FUND=false NPM_CONFIG_AUDIT=false NPM_CONFIG_UPDATE_NOTIFIER=false
ARG P=ai-workers/problem-1-pathway-setup-and-form-filling
WORKDIR /app
# Lockfiles first, so a code change reuses the installed packages.
COPY ${P}/prototype/studio/package.json ${P}/prototype/studio/package-lock.json ${P}/prototype/studio/
COPY ${P}/prototype/env/node/package.json ${P}/prototype/env/node/package-lock.json ${P}/prototype/env/node/
RUN cd ${P}/prototype/studio && npm ci \
 && mkdir -p /app/${P}/prototype/node_modules-src && cp ../env/node/package.json ../env/node/package-lock.json /app/${P}/prototype/node_modules-src/ \
 && cd /app/${P}/prototype/node_modules-src && npm ci --omit=dev \
 && mv node_modules ../node_modules && cd .. && rm -rf node_modules-src
COPY ${P}/prototype ${P}/prototype
COPY ${P}/official-sources ${P}/official-sources
RUN cd ${P}/prototype/studio \
 && ./node_modules/.bin/prisma generate \
 && (cd web && ../node_modules/.bin/vite build) \
 && rm -rf var && mkdir var

FROM node:24.21.0-bookworm-slim@sha256:d6aa754f16b3197301076f047b5def2f02ea1dbbc2ca920407d46d7ec7f87b20 AS run
ARG P=ai-workers/problem-1-pathway-setup-and-form-filling
ENV STUDIO_PORT=4400 STUDIO_PUBLIC_PORT=8080 NPM_CONFIG_UPDATE_NOTIFIER=false
COPY --from=build /app /app
RUN chown node:node /app/${P}/prototype/studio/var
WORKDIR /app/${P}/prototype/studio
USER node
EXPOSE 8080
# Migrations are their own step (compose's "migrate" service, the deploy's release step): this command only serves.
CMD ["./node_modules/.bin/tsx", "--tsconfig", "api/tsconfig.json", "deploy/container-entry.mjs"]
