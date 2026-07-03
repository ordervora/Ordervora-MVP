import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getStringEnv } from "../config/env";

// Deliberately the narrow, non-throwing getStringEnv here, not getEnv()'s
// full validated core schema: this module is imported (transitively, via
// service modules) by several test files that never touch a real
// database and don't mock this module out, so it must not throw at
// import time just because the rest of the app's config isn't set up in
// that test's process. The real enforcement point for "DATABASE_URL must
// actually be a valid connection string" is assertStartupEnv(), called
// once in src/index.ts before the server ever starts accepting requests.
const adapter = new PrismaPg({ connectionString: getStringEnv("DATABASE_URL", "") });

export const prisma = new PrismaClient({ adapter });
