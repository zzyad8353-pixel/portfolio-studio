import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"), email: varchar("email", { length: 320 }), loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(), lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const customers = mysqlTable("customers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const venueSettings = mysqlTable("venue_settings", {
  id: int("id").autoincrement().primaryKey(), brandName: varchar("brandName", { length: 120 }).notNull().default("PlayStation R2"), tagline: varchar("tagline", { length: 180 }).notNull().default("اللعب الحقيقي يبدأ من هنا"), heroTitle: varchar("heroTitle", { length: 220 }).notNull().default("ارفع مستوى لعبك"), heroText: text("heroText").notNull(), phone: varchar("phone", { length: 40 }).notNull().default("010 0000 0000"), location: varchar("location", { length: 180 }).notNull().default("القاهرة الجديدة · مفتوح يوميًا"), neonColor: varchar("neonColor", { length: 20 }).notNull().default("#E3293F"), aboutText: text("aboutText").notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const devices = mysqlTable("devices", {
  id: int("id").autoincrement().primaryKey(), name: varchar("name", { length: 120 }).notNull(), category: varchar("category", { length: 80 }).notNull().default("PlayStation 5"), status: mysqlEnum("status", ["available", "busy", "maintenance"]).notNull().default("available"), singlePrice: int("singlePrice").notNull().default(80), multiPrice: int("multiPrice").notNull().default(120), quadPrice: int("quadPrice").notNull().default(160), description: text("description").notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(), customerId: int("customerId"), customerName: varchar("customerName", { length: 120 }).notNull(), phone: varchar("phone", { length: 40 }).notNull(), deviceId: int("deviceId").notNull(), deviceName: varchar("deviceName", { length: 120 }).notNull(), playMode: mysqlEnum("playMode", ["single", "multi", "quad"]).notNull(), bookingDate: varchar("bookingDate", { length: 20 }).notNull(), startTime: varchar("startTime", { length: 10 }).notNull(), hours: int("hours").notNull(), totalPrice: int("totalPrice").notNull(), status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).notNull().default("pending"), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type VenueSettings = typeof venueSettings.$inferSelect;
export type Device = typeof devices.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type InsertDevice = typeof devices.$inferInsert;
export type InsertBooking = typeof bookings.$inferInsert;
export type InsertVenueSettings = typeof venueSettings.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
