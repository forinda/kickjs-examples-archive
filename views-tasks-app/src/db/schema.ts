import { boolean, date, integer, serial, table, text, timestamp, varchar } from '@forinda/kickjs-db'

export const users = table('users', {
  id: serial().primaryKey(),
  email: varchar(255).notNull().unique(),
  passwordHash: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
})

export const categories = table('categories', {
  id: serial().primaryKey(),
  userId: integer()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar(60).notNull(),
  color: varchar(7).notNull().default('#6b7280'),
  createdAt: timestamp().notNull().defaultNow(),
})

export const tasks = table('tasks', {
  id: serial().primaryKey(),
  userId: integer()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Deleting a category keeps its tasks, uncategorised.
  categoryId: integer().references(() => categories.id, { onDelete: 'set_null' }),
  title: varchar(200).notNull(),
  notes: text(),
  done: boolean().notNull().default(false),
  dueDate: date(),
  createdAt: timestamp().notNull().defaultNow(),
})
