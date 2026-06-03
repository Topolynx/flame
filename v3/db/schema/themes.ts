import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const themes = sqliteTable('themes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  colorsJson: text('colors_json').notNull(),
  isCustom: integer('is_custom', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type ThemeRow = typeof themes.$inferSelect;
export type NewThemeRow = typeof themes.$inferInsert;
