import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({ getDb: async () => null }));

import { appRouter } from "./routers";

const adminUser = { id: 1, openId: "admin", name: "Admin", email: "admin@example.com", loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as any;

function makeContext(user: any = null, cookie = "") {
  let issuedCookie = cookie;
  return {
    ctx: { user, req: { protocol: "https", headers: { cookie } }, res: { cookie: (_name: string, value: string) => { issuedCookie = value; }, clearCookie: vi.fn() } } as any,
    getCookie: () => issuedCookie,
  };
}

describe("PlayStation R2 customer and admin access", () => {
  it("keeps public settings and devices readable", async () => {
    const caller = appRouter.createCaller(makeContext().ctx);
    const settings = await caller.settings.get();
    const devices = await caller.devices.list();
    expect(settings.brandName).toBe("PlayStation R2");
    expect(settings.neonColor).toMatch(/^#/);
    expect(devices.some(device => device.status === "available")).toBe(true);
  });

  it("requires an account and calculates a booking total for that account", async () => {
    const first = makeContext();
    const publicCaller = appRouter.createCaller(first.ctx);
    const devices = await publicCaller.devices.list();
    const available = devices.find(device => device.status === "available");
    expect(available).toBeDefined();
    const account = await publicCaller.customerAuth.register({ name: "عميل اختبار", phone: `010${Date.now().toString().slice(-8)}`, password: "secret123" });
    expect(account.name).toBe("عميل اختبار");
    expect(first.getCookie()).toBeTruthy();
    const customerCaller = appRouter.createCaller(makeContext(null, `r2_customer_session=${first.getCookie()}`).ctx);
    expect((await customerCaller.customerAuth.me())?.id).toBe(account.id);
    const booking = await customerCaller.bookings.create({ deviceId: available!.id, playMode: "quad", bookingDate: "2026-09-13", startTime: "20:00", hours: 3 });
    expect(booking.totalPrice).toBe(available!.quadPrice * 3);
    expect(booking.customerId).toBe(account.id);
    expect((await customerCaller.bookings.mine()).some(item => item.id === booking.id)).toBe(true);
  });

  it("allows only the admin to update site appearance", async () => {
    const adminSession = makeContext();
    const loginCaller = appRouter.createCaller(adminSession.ctx);
    await loginCaller.adminAuth.login({ password: "123456" });
    const admin = appRouter.createCaller(makeContext(null, `r2_admin_session=${adminSession.getCookie()}`).ctx);
    const updated = await admin.settings.update({ brandName: "R2 NIGHT SHIFT", tagline: "نلعب بعد منتصف الليل", heroTitle: "اللعب يبدأ الآن", heroText: "محتوى جديد يظهر للعملاء فورًا.", phone: "01111111111", location: "المعادي · حتى الفجر", neonColor: "#7A5CFF", aboutText: "تجربة مختلفة كل ليلة." });
    expect(updated.brandName).toBe("R2 NIGHT SHIFT");
    expect((await admin.settings.get()).heroTitle).toBe("اللعب يبدأ الآن");
    await expect(appRouter.createCaller(makeContext().ctx).settings.update(updated as any)).rejects.toThrow();
  });

  it("logs the admin in with the local password", async () => {
    const first = makeContext();
    const caller = appRouter.createCaller(first.ctx);
    await expect(caller.adminAuth.login({ password: "wrong-password" })).rejects.toThrow();
    await caller.adminAuth.login({ password: "123456" });
    expect(first.getCookie()).toBeTruthy();
    const adminCaller = appRouter.createCaller(makeContext(null, `r2_admin_session=${first.getCookie()}`).ctx);
    expect(await adminCaller.adminAuth.me()).toBe(true);
    expect((await adminCaller.devices.list()).length).toBeGreaterThan(0);
  });
});
