import { APPLICATION, defineAdapter, watch } from '@forinda/kickjs'
import { WS_ROOM_MANAGER } from '@forinda/kickjs-ws'

/**
 * Tells this instance's clients `server:draining` the moment the app starts
 * shutting down — before WsAdapter closes their sockets (1001) — so they can
 * reconnect now, through the load balancer, to an instance that is staying up.
 *
 * `app.status` is the lifecycle as a reactive value; `watch` runs on each change.
 * Every signed-in socket is in its `user:<id>` room. `deliver`, not `broadcast`:
 * with Redis, a broadcast would reach other instances' clients, which aren't going anywhere.
 */
export const DrainNoticeAdapter = defineAdapter({
  name: 'DrainNoticeAdapter',
  build: () => {
    let stop: (() => void) | undefined
    return {
      afterStart({ container }) {
        const app = container.resolve(APPLICATION)
        const rooms = container.resolve(WS_ROOM_MANAGER)
        stop = watch(app.status, (status) => {
          if (status !== 'draining') return
          for (const room of Object.keys(rooms.getAllRooms())) {
            if (room.startsWith('user:')) rooms.deliver(room, 'server:draining', {})
          }
        })
      },
      shutdown() {
        stop?.()
      },
    }
  },
})
