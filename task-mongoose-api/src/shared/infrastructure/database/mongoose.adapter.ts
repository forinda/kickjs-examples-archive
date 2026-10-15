import mongoose from 'mongoose'
import { defineAdapter, Logger } from '@forinda/kickjs'
import { TOKENS } from '@/shared/constants/tokens'

const logger = Logger.for('MongooseAdapter')

/** Connects mongoose before the app starts and registers the connection under `TOKENS.MONGOOSE`. */
export const MongooseAdapter = defineAdapter<{ uri: string }>({
  name: 'MongooseAdapter',
  build: ({ uri }) => ({
    async beforeStart({ container }) {
      logger.info('Connecting to MongoDB...')
      await mongoose.connect(uri)
      container.registerInstance(TOKENS.MONGOOSE, mongoose.connection)
      logger.info('MongoDB connected')
    },
    // Feeds GET /health/ready.
    async onHealthCheck() {
      try {
        await mongoose.connection.db?.admin().ping()
        return { name: 'mongodb', status: 'up' as const }
      } catch {
        return { name: 'mongodb', status: 'down' as const }
      }
    },
    async shutdown() {
      await mongoose.disconnect()
      logger.info('MongoDB disconnected')
    },
  }),
})
