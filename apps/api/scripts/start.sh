#!/bin/sh
# Production startup entrypoint (Production Hardening Phase 4).
#
# Deliberately execs node directly rather than being invoked via
# `pnpm start`/`npm start`: npm/pnpm's process wrapper does not reliably
# forward SIGTERM to its child, which would silently defeat the graceful-
# shutdown handling in src/index.ts (server.close() + Prisma disconnect on
# SIGTERM) and turn every rolling deploy into a hard kill instead of a
# drain. `exec` replaces this shell process with node in place (same PID),
# so the container's PID 1 is node itself and orchestrator signals reach
# it directly.
set -e
exec node dist/src/index.js
