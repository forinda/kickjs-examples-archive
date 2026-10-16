import { serial, table, text, timestamp, varchar } from '@forinda/kickjs-db'

export const bookmarks = table('bookmarks', {
  id: serial().primaryKey(),
  url: text().notNull(),
  title: varchar(120).notNull(),
  createdAt: timestamp().notNull().defaultNow(),
})
