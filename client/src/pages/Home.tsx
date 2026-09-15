import { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, CalendarDays, Check, Clock3, Gamepad2, LogIn, MapPin, Phone, ShieldCheck, Sparkles, UserRound, Users, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const modeLabels = { single: "فردي", multi: "ثنائي", quad: "رباعي" } as const;
const defaults = {
  brandName: "PlayStation R2",
  tagline: "اللعب الحقيقي يبدأ من هنا",
  heroTitle: "ارفع مستوى لعبك",
  heroText: "صالة بلايستيشن مصممة للاعبين الذين يريدون شاشة أكبر، أجهزة أسرع، وتجربة لا تُنسى.",
  phone: "010 0000 0000",
  location: "القاهرة الجديدة · مفتوح يوميًا من 12 ظهرًا حتى 4 فجرًا",
  neonColor: "#E3293F",
  aboutText: "مساحة لعب فاخرة تجمع أحدث أجهزة PlayStation 5 مع أجواء تنافسية وخدمة سريعة.",
};

function formatCurrency(value: number) {
  return `${value.toLocaleString("ar-EG")} ج.م`;
}

export default function Home() {
  const { data: settings } = trpc.settings.get.useQuery(undefined, { refetchInterval: 3000 });
  const { data: devices = [] } = trpc.devices.list.useQuery(undefined, { refetchInterval: 3000 });
  const { data: customer } = trpc.customerAuth.me.useQuery();
  const { data: myBookings = [] } = trpc.bookings.mine.useQuery(undefined, { enabled: Boolean(customer) });
  const createBooking = trpc.bookings.create.useMutation();
  const register = trpc.customerAuth.register.useMutation();
  const login = trpc.customerAuth.login.useMutation();
  const logout = trpc.customerAuth.logout.useMutation();
  const utils = trpc.useUtils();
  const content = settings ?? defaults;
  const availableDevices = devices.filter(device => device.status === "available");
  const [selectedId, setSelectedId] = useState<number | undefined>(availableDevices[0]?.id);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountMode, setAccountMode] = useState<"login" | "register">("login");
  const [accountForm, setAccountForm] = useState({ name: "", phone: "", password: "" });
  const [form, setForm] = useState({ customerName: "", phone: "", deviceId: "", playMode: "multi" as "single" | "multi" | "quad", bookingDate: new Date().toISOString().slice(0, 10), startTime: "20:00", hours: 2 });
  const selectedDevice = devices.find(device => device.id === Number(form.deviceId || selectedId)) ?? availableDevices[0];
  const price = selectedDevice ? (form.playMode === "single" ? selectedDevice.singlePrice : form.playMode === "multi" ? selectedDevice.multiPrice : selectedDevice.quadPrice) : 0;
  const total = price * form.hours;
  const neonStyle = { "--neon": content.neonColor, "--neon-rgb": "227, 41, 63" } as React.CSSProperties;

  const setDevice = (id: string) => {
    setSelectedId(Number(id));
    setForm(current => ({ ...current, deviceId: id }));
  };

  const submitBooking = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedDevice) return toast.error("لا توجد أجهزة متاحة حاليًا");
    if (!customer) {
      setAccountOpen(true);
      toast.info("أنشئ حسابًا أو سجل دخولك أولًا لإتمام الحجز");
      return;
    }
    createBooking.mutate({ deviceId: selectedDevice.id, playMode: form.playMode, bookingDate: form.bookingDate, startTime: form.startTime, hours: form.hours }, {
      onSuccess: () => {
        toast.success("تم استلام طلب الحجز بنجاح");
        setForm(current => ({ ...current, customerName: "", phone: "" }));
        utils.bookings.mine.invalidate();
      },
      onError: error => toast.error(error.message || "تعذر إرسال الحجز"),
    });
  };

  const submitAccount = (event: React.FormEvent) => {
    event.preventDefault();
    const options = {
      onSuccess: () => { toast.success(accountMode === "login" ? "تم تسجيل الدخول" : "تم إنشاء الحساب"); setAccountOpen(false); setAccountForm({ name: "", phone: "", password: "" }); utils.customerAuth.me.invalidate(); },
      onError: (error: { message: string }) => toast.error(error.message),
    };
    if (accountMode === "login") login.mutate({ phone: accountForm.phone, password: accountForm.password }, options);
    else register.mutate(accountForm, options);
  };

  return (
    <div dir="rtl" className="min-h-screen overflow-x-hidden bg-[#08090d] text-white" style={neonStyle}>
      <div className="noise" />
      <header className="site-header">
        <div className="container flex items-center justify-between gap-5 py-5">
          <a href="#top" className="brand-mark">
            <span className="brand-icon"><Gamepad2 size={20} /></span>
            <span><strong>{content.brandName}</strong><small>R2 GAMING LOUNGE</small></span>
          </a>
          <nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
            <a href="#top" className="nav-link active">الرئيسية</a>
            <a href="#booking" className="nav-link">الحجز الفوري</a>
            <a href="#about" className="nav-link">عن الصالة</a>
          </nav>
          <div className="customer-actions">
            {customer ? <><a href="#my-bookings" className="account-link"><CalendarDays size={15} /> حجوزاتي</a><button className="account-link" onClick={() => { logout.mutate(); utils.customerAuth.me.invalidate(); }}><UserRound size={15} /> {customer.name}</button></> : <button className="account-link" onClick={() => setAccountOpen(true)}><LogIn size={15} /> دخول / حساب جديد</button>}
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero container">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-line" /> {content.tagline}</div>
            <h1>{content.heroTitle}<br /><span className="gradient-text">بطريقتك.</span></h1>
            <p>{content.heroText}</p>
            <div className="hero-actions">
              <a href="#booking" className="primary-button">احجز جلستك الآن <ArrowLeft size={18} /></a>
              <a href="#about" className="text-link">اكتشف التجربة <ArrowLeft size={16} /></a>
            </div>
            <div className="hero-stats">
              <div><strong>4K</strong><span>شاشات فائقة</span></div>
              <div><strong>120</strong><span>Hz سلاسة اللعب</span></div>
              <div><strong>24/7</strong><span>حماس مستمر</span></div>
            </div>
          </div>
          <div className="hero-art" aria-label="وحدة تحكم ثلاثية الأبعاد">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="controller-glow" />
            <div className="controller-card">
              <div className="controller-top"><span>R2 / CORE</span><span className="online-badge"><i /> ONLINE</span></div>
              <div className="controller-body">
                <div className="controller-wing left-wing"><span className="dpad horizontal" /><span className="dpad vertical" /></div>
                <div className="controller-center"><span className="controller-logo"><Gamepad2 size={28} /></span><span className="controller-bar" /></div>
                <div className="controller-wing right-wing"><span className="button-triangle">△</span><span className="button-circle">○</span><span className="button-cross">×</span><span className="button-square">□</span></div>
              </div>
              <div className="controller-bottom"><span>PLAY HARD</span><span>FEEL MORE</span></div>
            </div>
            <div className="floating-chip chip-top"><Zap size={13} /> LOW LATENCY</div>
            <div className="floating-chip chip-bottom"><Sparkles size={13} /> PREMIUM SETUP</div>
          </div>
        </section>

        <section className="quick-strip container">
          <div><span className="strip-icon"><ShieldCheck size={18} /></span><span><b>أجهزة أصلية</b><small>تجربة موثوقة</small></span></div>
          <div><span className="strip-icon"><Users size={18} /></span><span><b>حتى 4 لاعبين</b><small>نافس أصحابك</small></span></div>
          <div><span className="strip-icon"><Clock3 size={18} /></span><span><b>حجز مرن</b><small>بالساعة كما تحب</small></span></div>
          <div className="strip-contact"><Phone size={17} /><span>{content.phone}</span></div>
        </section>

        <section id="booking" className="booking-section container">
          <div className="section-heading"><div><span className="section-kicker">01 / QUICK BOOKING</span><h2>احجز <span>مكاني.</span></h2></div><p>اختر جهازك ووقتك، وسنجهز لك التجربة قبل وصولك.</p></div>
          <div className="booking-layout">
            <form className="booking-form glass-card" onSubmit={submitBooking}>
              <div className="form-head"><div><span className="form-number">01</span><h3>بيانات الحجز</h3></div><span className="live-tag"><i /> مباشر</span></div>
              <div className="form-grid">
                <div className="account-confirmed"><UserRound size={18} /><span><b>{customer ? `الحجز باسم ${customer.name}` : "الحجز يتطلب حسابًا"}</b><small>{customer ? customer.phone : "اضغط دخول / حساب جديد بالأعلى"}</small></span></div>
                <label>الجهاز / الغرفة<select required value={selectedDevice?.id ?? ""} onChange={e => setDevice(e.target.value)}>{availableDevices.length ? availableDevices.map(device => <option key={device.id} value={device.id}>{device.name} · {device.category}</option>) : <option value="">لا توجد أجهزة متاحة</option>}</select></label>
                <label>نمط اللعب<select value={form.playMode} onChange={e => setForm({ ...form, playMode: e.target.value as typeof form.playMode })}><option value="single">فردي · {selectedDevice?.singlePrice ?? 0} ج.م / ساعة</option><option value="multi">ثنائي · {selectedDevice?.multiPrice ?? 0} ج.م / ساعة</option><option value="quad">رباعي · {selectedDevice?.quadPrice ?? 0} ج.م / ساعة</option></select></label>
                <label>اليوم<input type="date" required min={new Date().toISOString().slice(0, 10)} value={form.bookingDate} onChange={e => setForm({ ...form, bookingDate: e.target.value })} /></label>
                <label>وقت البداية<input type="time" required value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} /></label>
              </div>
              <div className="hours-control"><span>عدد الساعات</span><div>{[1, 2, 3, 4].map(hour => <button type="button" key={hour} className={form.hours === hour ? "hour active" : "hour"} onClick={() => setForm({ ...form, hours: hour })}>{hour}<small>ساعة</small></button>)}</div></div>
              <button type="submit" className="submit-button" disabled={createBooking.isPending || !selectedDevice}>{createBooking.isPending ? "جارٍ التأكيد..." : "تأكيد الحجز"}<ArrowLeft size={18} /></button>
            </form>
            <aside className="booking-summary">
              <div className="summary-top"><span className="section-kicker">YOUR SESSION</span><span className="summary-live">LIVE PRICE</span></div>
              <h3>{selectedDevice?.name ?? "اختر جهازك"}</h3><p>{selectedDevice?.description ?? "ستظهر تفاصيل الجهاز المتاح هنا"}</p>
              <div className="summary-line"><span>سعر الساعة</span><b>{formatCurrency(price)}</b></div><div className="summary-line"><span>المدة</span><b>{form.hours} ساعات</b></div>
              <div className="total-line"><span>الإجمالي</span><strong>{formatCurrency(total)}</strong></div>
              <div className="summary-note"><Check size={15} /> السعر شامل كل شيء · بدون رسوم إضافية</div>
            </aside>
          </div>
        </section>

        <section className="devices-section container">
          <div className="section-heading"><div><span className="section-kicker">02 / THE LINEUP</span><h2>اختار <span>ساحتك.</span></h2></div><p>كل جهاز له شخصيته. أنت فقط اختر المستوى.</p></div>
          <div className="device-grid">{devices.map((device, index) => <article key={device.id} className={device.status === "available" ? "device-card available" : "device-card unavailable"}><div className="device-visual"><span className="device-index">0{index + 1}</span><Gamepad2 size={56} strokeWidth={1} /><span className="device-status"><i /> {device.status === "available" ? "متاح الآن" : device.status === "busy" ? "مشغول" : "صيانة"}</span></div><div className="device-info"><span>{device.category}</span><h3>{device.name}</h3><p>{device.description}</p><div className="device-prices"><span>يبدأ من <b>{formatCurrency(device.singlePrice)}</b> / ساعة</span>{device.status === "available" && <button type="button" onClick={() => { setDevice(String(device.id)); document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" }); }}>احجز <ArrowLeft size={15} /></button>}</div></div></article>)}</div>
        </section>

        {customer && <section id="my-bookings" className="my-bookings-section container"><div className="section-heading"><div><span className="section-kicker">MY BOOKINGS</span><h2>حجوزاتي <span>الخاصة.</span></h2></div><p>كل حجوزاتك محفوظة على حسابك ويمكنك متابعتها هنا.</p></div><div className="my-bookings-list">{myBookings.length ? myBookings.map(booking => <div className="my-booking-card" key={booking.id}><div><b>{booking.deviceName}</b><small>{booking.bookingDate} · {booking.startTime} · {booking.hours} ساعات</small></div><strong>{formatCurrency(booking.totalPrice)}</strong><span className={`status-pill ${booking.status}`}>{booking.status === "pending" ? "قيد المراجعة" : booking.status === "confirmed" ? "مؤكد" : booking.status === "cancelled" ? "ملغي" : "مكتمل"}</span></div>) : <div className="empty-bookings"><CalendarDays size={23} /> لا توجد حجوزات حتى الآن</div>}</div></section>}
        <section id="about" className="about-section container"><div className="about-copy"><span className="section-kicker">03 / THE R2 EXPERIENCE</span><h2>مش مجرد<br /><span>بلايستيشن.</span></h2><p>{content.aboutText}</p><div className="location"><MapPin size={18} /><span>{content.location}</span></div></div><div className="about-visual"><div className="grid-lines" /><span className="about-label">R2<br />HUB</span><div className="about-circle">R2 <span>EST. 2026</span></div></div></section>
      </main>

      {accountOpen && <div className="account-overlay" onClick={() => setAccountOpen(false)}><div className="account-modal" onClick={event => event.stopPropagation()}><button className="modal-close" onClick={() => setAccountOpen(false)}><X size={17} /></button><span className="section-kicker">R2 CUSTOMER ACCOUNT</span><h2>{accountMode === "login" ? "أهلاً بعودتك" : "أنشئ حسابك"}</h2><p>الحساب مطلوب لتأكيد الحجز ومتابعة حجوزاتك.</p><form onSubmit={submitAccount}>{accountMode === "register" && <label>الاسم الكامل<input required value={accountForm.name} onChange={e => setAccountForm({ ...accountForm, name: e.target.value })} placeholder="مثال: أحمد محمد" /></label>}<label>رقم الهاتف<input required value={accountForm.phone} onChange={e => setAccountForm({ ...accountForm, phone: e.target.value })} placeholder="01X XXXX XXXX" /></label><label>كلمة السر<input required minLength={6} type="password" value={accountForm.password} onChange={e => setAccountForm({ ...accountForm, password: e.target.value })} placeholder="6 أحرف أو أكثر" /></label><button className="submit-button" type="submit">{accountMode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}<ArrowLeft size={17} /></button></form><button className="switch-account" onClick={() => setAccountMode(accountMode === "login" ? "register" : "login")}>{accountMode === "login" ? "ليس لديك حساب؟ أنشئ حسابًا" : "لديك حساب بالفعل؟ سجل الدخول"}</button></div></div>}
      <footer className="site-footer"><div className="container flex justify-center py-7"><span className="text-sm text-white/35">كل الحقوق محفوظة © 2026</span></div></footer>
    </div>
  );
}
