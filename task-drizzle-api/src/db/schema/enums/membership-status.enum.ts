import { pgEnum } from 'drizzle-orm/pg-core'

/** A workspace membership is `pending` (an invite) until the invitee accepts it. */
export const membershipStatusEnum = pgEnum('membership_status', ['pending', 'accepted'])
