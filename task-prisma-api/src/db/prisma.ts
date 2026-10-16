import { createToken } from '@forinda/kickjs'
import type { PrismaClient } from '@/generated/prisma/client'

/** DI token for the PrismaClient that `PrismaAdapter` (src/adapters) registers. */
export const PRISMA_CLIENT = createToken<PrismaClient>('app/Prisma/client')
