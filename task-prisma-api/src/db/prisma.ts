/**
 * Prisma wired directly — replaces the removed `@forinda/kickjs-prisma`.
 * The adapter owns the client: registers it under PRISMA_CLIENT before the
 * app starts, pings it for /health/ready, and disconnects it on shutdown.
 */
import { createToken, defineAdapter, Logger } from '@forinda/kickjs'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@/generated/prisma/client'

export const PRISMA_CLIENT = createToken<PrismaClient>('app/Prisma/client')

const log = Logger.for('PrismaAdapter')

export const PrismaAdapter = defineAdapter<{ connectionString: string }>({
  name: 'PrismaAdapter',
  build: ({ connectionString }) => {
    const client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
      // Never serialise password hashes. Login opts back in on its one query.
      omit: { user: { passwordHash: true } },
    })
    return {
      beforeStart: ({ container }) => {
        container.registerInstance(PRISMA_CLIENT, client)
      },
      // Feeds GET /health/ready.
      async onHealthCheck() {
        try {
          await client.$queryRaw`SELECT 1`
          return { name: 'postgres', status: 'up' as const }
        } catch {
          return { name: 'postgres', status: 'down' as const }
        }
      },
      async shutdown() {
        await client.$disconnect()
        log.info('PrismaClient disconnected')
      },
    }
  },
})
