import { createToken } from '@forinda/kickjs'
import type { Redis } from 'ioredis'

const key = (room: string) => `ws-chat:presence:${room}`

/**
 * Who is in which room, as `room → socketId → user name`. A user with two tabs
 * open is listed once. With Redis the map is shared by every instance; without
 * it, it lives in this process — the same reach as the WsAdapter without a broker.
 */
export function createPresenceRepository(redis: Redis | null) {
  if (redis) {
    return {
      async add(room: string, socketId: string, name: string) {
        await redis.hset(key(room), socketId, name)
      },
      async remove(room: string, socketId: string) {
        await redis.hdel(key(room), socketId)
      },
      async users(room: string) {
        return [...new Set(await redis.hvals(key(room)))].sort()
      },
    }
  }
  // ponytail: entries of an instance that crashes stay in Redis until those socket ids are removed;
  // per-instance hashes with a TTL refreshed on the heartbeat fix that if instances die often.
  const rooms = new Map<string, Map<string, string>>()
  return {
    async add(room: string, socketId: string, name: string) {
      const members = rooms.get(room) ?? new Map<string, string>()
      rooms.set(room, members.set(socketId, name))
    },
    async remove(room: string, socketId: string) {
      rooms.get(room)?.delete(socketId)
      if (rooms.get(room)?.size === 0) rooms.delete(room)
    },
    async users(room: string) {
      return [...new Set(rooms.get(room)?.values())].sort()
    },
  }
}

export type PresenceRepository = ReturnType<typeof createPresenceRepository>
export const PRESENCE_REPOSITORY = createToken<PresenceRepository>('app/Presence/repository')
