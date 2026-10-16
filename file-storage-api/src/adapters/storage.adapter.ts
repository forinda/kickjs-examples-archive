import { defineAdapter, getEnv } from '@forinda/kickjs'
import type { Storage } from '@forinda/kickjs-storage'
import { STORAGE } from '@forinda/kickjs-storage/adapter'
import { diskStorage } from '@forinda/kickjs-storage/disk'
import { S3Settings, s3FromSettings } from '@forinda/kickjs-storage/settings'

export { STORAGE }

/**
 * Owns the app's file storage: a folder on disk in development, an S3-compatible
 * bucket (AWS S3, R2, MinIO) in production — `STORAGE_DRIVER`. Binds it to
 * `STORAGE`, declares the `S3_*` settings section for the bucket (a missing
 * `S3_BUCKET` stops startup), and answers `GET /health/ready` with a one-key list.
 */
export const StorageAdapter = defineAdapter({
  name: 'StorageAdapter',
  build: () => {
    const storageDriver = getEnv('STORAGE_DRIVER')
    // Lazy: s3FromSettings reads its section on first use, after the app has bound it.
    const storage: Storage =
      storageDriver === 's3' ? s3FromSettings() : diskStorage({ root: getEnv('UPLOAD_DIR') })
    return {
      settings: () => (storageDriver === 's3' ? [S3Settings] : []),
      beforeStart({ container }) {
        container.registerInstance(STORAGE, storage)
      },
      async onHealthCheck() {
        try {
          await storage.list({ limit: 1 })
          return { name: `storage:${storageDriver}`, status: 'up' as const }
        } catch {
          return { name: `storage:${storageDriver}`, status: 'down' as const }
        }
      },
    }
  },
})
