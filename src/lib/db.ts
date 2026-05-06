import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// Gracefully handle DB connection errors (e.g. sandbox can't reach Supabase)
db.$connect().catch((err) => {
  console.warn('[DB] Could not connect to database:', err instanceof Error ? err.message : err)
  console.warn('[DB] App will run in offline mode — API routes that need DB will return errors')
})
