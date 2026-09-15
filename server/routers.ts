import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { parse as parseCookie } from "cookie";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { bookings, customers, devices, venueSettings } from "../drizzle/schema";
import { ENV } from "./_core/env";
import { TRPCError } from "@trpc/server";

const scrypt = promisify(scryptCallback);
const CUSTOMER_COOKIE = "r2_customer_session";
const ADMIN_COOKIE = "r2_admin_session";
const ADMIN_PASSWORD = "123456";
const customerSecret = new TextEncoder().encode(ENV.cookieSecret || "playstation-r2-customer-secret");
const adminSecret = new TextEncoder().encode(ENV.cookieSecret || "playstation-r2-admin-secret");

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

async function customerToken(id: number) {
  return new SignJWT({ role: "customer" }).setProtectedHeader({ alg: "HS256" }).setSubject(String(id)).setIssuedAt().setExpirationTime("30d").sign(customerSecret);
}

async function adminToken() {
  return new SignJWT({ role: "admin", local: true }).setProtectedHeader({ alg: "HS256" }).setSubject("local-admin").setIssuedAt().setExpirationTime("30d").sign(adminSecret);
}

async function isLocalAdmin(req: { headers: { cookie?: string } }) {
  const raw = parseCookie(req.headers.cookie ?? "")[ADMIN_COOKIE];
  if (!raw) return false;
  try {
    const { payload } = await jwtVerify(raw, adminSecret);
    return payload.sub === "local-admin" && payload.role === "admin";
  } catch { return false; }
}

async function customerIdFromRequest(req: { headers: { cookie?: string } }) {
  const raw = parseCookie(req.headers.cookie ?? "")[CUSTOMER_COOKIE];
  if (!raw) return null;
  try {
    const { payload } = await jwtVerify(raw, customerSecret);
    return payload.sub ? Number(payload.sub) : null;
  } catch { return null; }
}

function setCustomerCookie(ctx: { req: any; res: any }, token: string) {
  ctx.res.cookie(CUSTOMER_COOKIE, token, { ...getSessionCookieOptions(ctx.req), maxAge: 30 * 24 * 60 * 60 * 1000 });
}

const adminProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!(await isLocalAdmin(ctx.req))) throw new TRPCError({ code: "UNAUTHORIZED", message: "سجل دخول المدير أولًا" });
  return next({ ctx });
});

type MemoryBooking = {
  id: number;
  customerId?: number | null;
  customerName: string;
  phone: string;
  deviceId: number;
  deviceName: string;
  playMode: "single" | "multi" | "quad";
  bookingDate: string;
  startTime: string;
  hours: number;
  totalPrice: number;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  createdAt: Date;
};

type MemoryDevice = {
  id: number;
  name: string;
  category: string;
  status: "available" | "busy" | "maintenance";
  singlePrice: number;
  multiPrice: number;
  quadPrice: number;
  description: string;
};

const fallbackSettings = {
  id: 1,
  brandName: "PlayStation R2",
  tagline: "اللعب الحقيقي يبدأ من هنا",
  heroTitle: "ارفع مستوى لعبك",
  heroText: "صالة بلايستيشن مصممة للاعبين الذين يريدون شاشة أكبر، أجهزة أسرع، وتجربة لا تُنسى.",
  phone: "010 0000 0000",
  location: "القاهرة الجديدة · مفتوح يوميًا من 12 ظهرًا حتى 4 فجرًا",
  neonColor: "#E3293F",
  aboutText: "مساحة لعب فاخرة تجمع أحدث أجهزة PlayStation 5 مع أجواء تنافسية وخدمة سريعة.",
};

const fallbackDevices = [
  { id: 1, name: "Arena 01", category: "PlayStation 5", status: "available" as const, singlePrice: 80, multiPrice: 120, quadPrice: 160, description: "شاشة 4K · يدان لاسلكيتان · FIFA و FC 26" },
  { id: 2, name: "VIP Room", category: "غرفة خاصة", status: "available" as const, singlePrice: 120, multiPrice: 160, quadPrice: 220, description: "خصوصية كاملة · صوت محيطي · حتى 4 لاعبين" },
  { id: 3, name: "Arena 02", category: "PlayStation 5", status: "busy" as const, singlePrice: 80, multiPrice: 120, quadPrice: 160, description: "شاشة 4K · تجربة تنافسية · إضاءة نيون" },
  { id: 4, name: "R2 Lounge", category: "PlayStation 5 Pro", status: "available" as const, singlePrice: 110, multiPrice: 150, quadPrice: 200, description: "PlayStation 5 Pro · شاشة 120Hz · كرسي احترافي" },
];

const fallbackBookings = [
  { id: 101, customerName: "أحمد محمد", phone: "01012345678", deviceId: 1, deviceName: "Arena 01", playMode: "multi" as const, bookingDate: "2026-09-13", startTime: "20:00", hours: 2, totalPrice: 240, status: "confirmed" as const, createdAt: new Date() },
  { id: 102, customerName: "سارة علي", phone: "01198765432", deviceId: 2, deviceName: "VIP Room", playMode: "quad" as const, bookingDate: "2026-09-13", startTime: "22:00", hours: 3, totalPrice: 660, status: "pending" as const, createdAt: new Date() },
];

const memory: {
  settings: typeof fallbackSettings;
  devices: MemoryDevice[];
  bookings: MemoryBooking[];
  customers: Array<{ id: number; name: string; phone: string; passwordHash: string; createdAt: Date }>;
} = {
  settings: { ...fallbackSettings },
  devices: [...fallbackDevices],
  bookings: [...fallbackBookings] as MemoryBooking[],
  customers: [],
};

async function getCustomer(req: { headers: { cookie?: string } }) {
  const id = await customerIdFromRequest(req);
  if (!id) return null;
  const db = await getDb();
  const row = db ? (await db.select().from(customers).where(eq(customers.id, id)).limit(1))[0] : memory.customers.find(customer => customer.id === id);
  return row ? { id: row.id, name: row.name, phone: row.phone } : null;
}

async function readSettings() {
  const db = await getDb();
  if (!db) return memory.settings;
  const rows = await db.select().from(venueSettings).limit(1);
  return rows[0] ?? memory.settings;
}

async function readDevices() {
  const db = await getDb();
  if (!db) return memory.devices;
  const rows = await db.select().from(devices);
  return rows.length ? rows : memory.devices;
}

async function readBookings() {
  const db = await getDb();
  if (!db) return memory.bookings;
  const rows = await db.select().from(bookings).orderBy(desc(bookings.createdAt));
  return rows.length ? rows : memory.bookings;
}

const deviceInput = z.object({
  name: z.string().min(2),
  category: z.string().min(2),
  status: z.enum(["available", "busy", "maintenance"]),
  singlePrice: z.number().int().min(0),
  multiPrice: z.number().int().min(0),
  quadPrice: z.number().int().min(0),
  description: z.string().min(3),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  adminAuth: router({
    me: publicProcedure.query(({ ctx }) => isLocalAdmin(ctx.req)),
    login: publicProcedure.input(z.object({ password: z.string().min(1) })).mutation(async ({ input, ctx }) => {
      if (input.password !== ADMIN_PASSWORD) throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة السر غير صحيحة" });
      ctx.res.cookie(ADMIN_COOKIE, await adminToken(), { ...getSessionCookieOptions(ctx.req), maxAge: 30 * 24 * 60 * 60 * 1000 });
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(ADMIN_COOKIE, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  customerAuth: router({
    me: publicProcedure.query(({ ctx }) => getCustomer(ctx.req)),
    register: publicProcedure.input(z.object({ name: z.string().min(2), phone: z.string().min(6), password: z.string().min(6) })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const passwordHash = await hashPassword(input.password);
      let customer: { id: number; name: string; phone: string };
      if (db) {
        const duplicate = await db.select().from(customers).where(eq(customers.phone, input.phone)).limit(1);
        if (duplicate[0]) throw new TRPCError({ code: "CONFLICT", message: "رقم الهاتف مسجل بالفعل" });
        const inserted = await db.insert(customers).values({ ...input, passwordHash });
        customer = { id: Number(inserted[0].insertId), name: input.name, phone: input.phone };
      } else {
        if (memory.customers.some(item => item.phone === input.phone)) throw new TRPCError({ code: "CONFLICT", message: "رقم الهاتف مسجل بالفعل" });
        customer = { id: Math.max(0, ...memory.customers.map(item => item.id)) + 1, name: input.name, phone: input.phone };
        memory.customers.push({ ...customer, passwordHash, createdAt: new Date() });
      }
      setCustomerCookie(ctx, await customerToken(customer.id));
      return customer;
    }),
    login: publicProcedure.input(z.object({ phone: z.string().min(6), password: z.string().min(6) })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const customer = db ? (await db.select().from(customers).where(eq(customers.phone, input.phone)).limit(1))[0] : memory.customers.find(item => item.phone === input.phone);
      if (!customer || !(await verifyPassword(input.password, customer.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "رقم الهاتف أو كلمة السر غير صحيحة" });
      setCustomerCookie(ctx, await customerToken(customer.id));
      return { id: customer.id, name: customer.name, phone: customer.phone };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.res.clearCookie(CUSTOMER_COOKIE, { ...getSessionCookieOptions(ctx.req), maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  settings: router({
    get: publicProcedure.query(() => readSettings()),
    update: adminProcedure.input(z.object({
      brandName: z.string().min(2), tagline: z.string().min(2), heroTitle: z.string().min(2), heroText: z.string().min(2), phone: z.string().min(3), location: z.string().min(2), neonColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/), aboutText: z.string().min(2),
    })).mutation(async ({ input }) => {
      memory.settings = { ...memory.settings, ...input };
      const db = await getDb();
      if (db) {
        const existing = await db.select().from(venueSettings).limit(1);
        if (existing[0]) await db.update(venueSettings).set(input).where(eq(venueSettings.id, existing[0].id));
        else await db.insert(venueSettings).values({ ...input });
      }
      return memory.settings;
    }),
  }),
  devices: router({
    list: publicProcedure.query(() => readDevices()),
    create: adminProcedure.input(deviceInput).mutation(async ({ input }) => {
      const db = await getDb();
      if (db) {
        await db.insert(devices).values(input);
        return (await db.select().from(devices).orderBy(desc(devices.id)).limit(1))[0];
      }
      const device = { ...input, id: Math.max(0, ...memory.devices.map(item => item.id)) + 1 };
      memory.devices = [device, ...memory.devices];
      return device;
    }),
    update: adminProcedure.input(deviceInput.extend({ id: z.number().int() })).mutation(async ({ input }) => {
      const { id, ...values } = input;
      const db = await getDb();
      if (db) {
        await db.update(devices).set(values).where(eq(devices.id, id));
        return (await db.select().from(devices).where(eq(devices.id, id)).limit(1))[0];
      }
      memory.devices = memory.devices.map(item => item.id === id ? { ...item, ...values } : item);
      return memory.devices.find(item => item.id === id);
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (db) {
        // Remove dependent bookings first so MySQL foreign-key constraints do not block the admin action.
        await db.delete(bookings).where(eq(bookings.deviceId, input.id));
        await db.delete(devices).where(eq(devices.id, input.id));
      }
      memory.devices = memory.devices.filter(item => item.id !== input.id);
      memory.bookings = memory.bookings.filter(item => item.deviceId !== input.id);
      return { success: true };
    }),
  }),
  bookings: router({
    list: adminProcedure.query(() => readBookings()),
    mine: publicProcedure.query(async ({ ctx }) => {
      const customer = await getCustomer(ctx.req);
      if (!customer) throw new TRPCError({ code: "UNAUTHORIZED", message: "سجل الدخول لعرض حجوزاتك" });
      const db = await getDb();
      if (db) return db.select().from(bookings).where(eq(bookings.customerId, customer.id)).orderBy(desc(bookings.createdAt));
      return memory.bookings.filter(item => item.customerId === customer.id);
    }),
    create: publicProcedure.input(z.object({ deviceId: z.number().int(), playMode: z.enum(["single", "multi", "quad"]), bookingDate: z.string().min(8), startTime: z.string().min(3), hours: z.number().int().min(1).max(12) })).mutation(async ({ input, ctx }) => {
      const customer = await getCustomer(ctx.req);
      if (!customer) throw new TRPCError({ code: "UNAUTHORIZED", message: "يجب إنشاء حساب أو تسجيل الدخول قبل الحجز" });
      const currentDevices = await readDevices();
      const device = currentDevices.find(item => item.id === input.deviceId);
      if (!device || device.status !== "available") throw new Error("الجهاز غير متاح حاليًا");
      const price = input.playMode === "single" ? device.singlePrice : input.playMode === "multi" ? device.multiPrice : device.quadPrice;
      const payload = { ...input, customerId: customer.id, customerName: customer.name, phone: customer.phone, deviceName: device.name, totalPrice: price * input.hours, status: "pending" as const };
      const db = await getDb();
      if (db) {
        const inserted = await db.insert(bookings).values(payload);
        const id = Number(inserted[0].insertId);
        return { ...payload, id };
      }
      const booking = { ...payload, id: Math.max(0, ...memory.bookings.map(item => item.id)) + 1, createdAt: new Date() };
      memory.bookings = [booking, ...memory.bookings];
      return booking;
    }),
    updateStatus: adminProcedure.input(z.object({ id: z.number().int(), status: z.enum(["pending", "confirmed", "cancelled", "completed"]) })).mutation(async ({ input }) => {
      const db = await getDb();
      if (db) await db.update(bookings).set({ status: input.status }).where(eq(bookings.id, input.id));
      memory.bookings = memory.bookings.map(item => item.id === input.id ? { ...item, status: input.status } : item);
      return { success: true };
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (db) await db.delete(bookings).where(eq(bookings.id, input.id));
      memory.bookings = memory.bookings.filter(item => item.id !== input.id);
      return { success: true };
    }),
  }),
  dashboard: router({
    stats: adminProcedure.query(async () => {
      const [currentDevices, currentBookings] = await Promise.all([readDevices(), readBookings()]);
      const active = currentBookings.filter(item => item.status !== "cancelled");
      return {
        totalDevices: currentDevices.length,
        availableDevices: currentDevices.filter(item => item.status === "available").length,
        todayBookings: active.length,
        todayRevenue: active.reduce((sum, item) => sum + item.totalPrice, 0),
        occupancy: Math.round((currentDevices.filter(item => item.status === "busy").length / Math.max(currentDevices.length, 1)) * 100),
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
