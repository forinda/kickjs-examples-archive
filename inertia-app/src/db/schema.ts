import { serial, table, text, timestamp, varchar } from '@forinda/kickjs-db'

export const notes = table('notes', {
  id: serial().primaryKey(),
  title: varchar(120).notNull(),
  body: text().notNull().default(''),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp().notNull().defaultNow(),
})
