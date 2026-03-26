"use client";

import { useState, useEffect, useRef } from "react";
import {
  FileText, CheckSquare, Mail, DollarSign, TrendingUp, TrendingDown,
  Landmark, Loader2, Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog,
  Droplets, Wind, ImagePlus, X, Sparkles, Heart, AlertTriangle,
  ChevronLeft, ChevronRight, Plus, ArrowUpRight, Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const QUOTES = [
  { text: "You're working hard for the baby today too. Let's go!", emoji: "💪" },
  { text: "Small progress is still progress. One step at a time!", emoji: "🚀" },
  { text: "Make today a day your baby will be proud of", emoji: "👶" },
  { text: "Grab a coffee and crush it today!", emoji: "☕" },
  { text: "You're already doing better than yesterday", emoji: "🌟" },
  { text: "Your hard work becomes your family's smile", emoji: "😊" },
  { text: "Even when it feels impossible, just try. You got this!", emoji: "✨" },
  { text: "The hardest working person in the world? That's you!", emoji: "🏆" },
  { text: "Think of baby's face and power through the day!", emoji: "👼" },
  { text: "Happiness isn't far away. It's right here, right now", emoji: "🍀" },
  { text: "After the rain comes a rainbow. Better days ahead!", emoji: "🌈" },
  { text: "You're someone's superhero. Never forget that", emoji: "🦸" },
  { text: "Every email you send, every deal you close — it's all for them", emoji: "💼" },
  { text: "Tough day? Remember why you started. Keep going!", emoji: "🔥" },
  { text: "Your baby is cheering for you right now!", emoji: "📣" },
];

function getTodayQuote() {
  const d = new Date();
  return QUOTES[(d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate()) % QUOTES.length];
}

function getWeatherIcon(code: string, size = "h-8 w-8") {
  const c = parseInt(code);
  if (c === 113) return <Sun className={`${size} text-amber-400`} />;
  if (c === 116 || c === 119) return <Cloud className={`${size} text-gray-400`} />;
  if (c === 122) return <CloudFog className={`${size} text-gray-400`} />;
  if ([176, 263, 266, 293, 296, 299, 302, 305, 308, 353, 356, 359].includes(c)) return <CloudRain className={`${size} text-blue-400`} />;
  if ([200, 386, 389].includes(c)) return <CloudLightning className={`${size} text-yellow-500`} />;
  if ([179, 182, 227, 230, 323, 326, 329, 332, 335, 338].includes(c)) return <CloudSnow className={`${size} text-blue-300`} />;
  return <Sun className={`${size} text-amber-400`} />;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 18) return "Good Afternoon";
  return "Good Evening";
}

interface Weather { temp: string; feelsLike: string; desc: string; humidity: string; windSpeed: string; city: string; weatherCode: string; }
interface DashData { pendingOrders: number; unpaidInvoices: number; overdueInvoices: number; overdueAmount: number; cashBalance: number; openTodos: number; urgentTodos: number; openClaims: number; recentEmails: number; incomingPayments30d: number; outgoingPayments30d: number; monthlyPayroll: number; }

function MiniCalendar() {
  const [date, setDate] = useState(new Date());
  const today = new Date();
  const year = date.getFullYear(), month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();
  const days: { day: number; curr: boolean; isToday: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) days.push({ day: daysInPrev - i, curr: false, isToday: false });
  for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, curr: true, isToday: i === today.getDate() && month === today.getMonth() && year === today.getFullYear() });
  while (days.length < 42) days.push({ day: days.length - daysInMonth - firstDay + 1, curr: false, isToday: false });
  const mNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setDate(new Date(year, month - 1))} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><ChevronLeft className="h-4 w-4" /></button>
        <span className="text-sm font-semibold text-gray-800">{mNames[month]} {year}</span>
        <button onClick={() => setDate(new Date(year, month + 1))} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400"><ChevronRight className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i} className="text-[10px] font-semibold text-gray-400 py-1">{d}</div>)}
        {days.map((d, i) => <div key={i} className={cn("text-[11px] py-1.5 rounded-lg", d.isToday ? "bg-gray-900 text-white font-bold" : d.curr ? "text-gray-600" : "text-gray-300")}>{d.day}</div>)}
      </div>
    </div>
  );
}

function InvoiceBar({ label, count, amount, color, pct }: { label: string; count: number; amount: number; color: string; pct: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-24 font-medium">{label}</span>
      <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full progress-animated", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-gray-400 w-20 text-right">{count} · ${amount.toLocaleString()}</span>
    </div>
  );
}

export default function DashboardPage() {
  const defaultData: DashData = { pendingOrders: 0, unpaidInvoices: 0, overdueInvoices: 0, overdueAmount: 0, cashBalance: 0, openTodos: 0, urgentTodos: 0, openClaims: 0, recentEmails: 0, incomingPayments30d: 0, outgoingPayments30d: 0, monthlyPayroll: 0 };
  const [data, setData] = useState<DashData>(defaultData);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [todos, setTodos] = useState<{ id: string; title: string; priority: string; isCompleted: boolean }[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const quote = getTodayQuote();

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(d => { if (d && !d.error) setData(d); }).catch(() => {});
    // Get browser location for accurate weather
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`).then(r => r.json()).then(setWeather).catch(() => {}),
        () => fetch("/api/weather").then(r => r.json()).then(setWeather).catch(() => {}) // fallback to IP
      );
    } else {
      fetch("/api/weather").then(r => r.json()).then(setWeather).catch(() => {});
    }
    fetch("/api/baby-photo").then(r => r.json()).then(r => { if (Array.isArray(r)) setPhotos(r); }).catch(() => {});
    fetch("/api/todos").then(r => r.json()).then((d: unknown) => { if (Array.isArray(d)) setTodos(d.slice(0, 4)); }).catch(() => {});
  }, []);

  // Auto slideshow every 10 seconds
  useEffect(() => {
    if (photos.length <= 1) return;
    const timer = setInterval(() => {
      setPhotoIndex(prev => (prev + 1) % photos.length);
    }, 10000);
    return () => clearInterval(timer);
  }, [photos.length]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (photos.length >= 20) { alert("Maximum 20 photos allowed"); return; }
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/baby-photo", { method: "POST", body: form });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
    } else if (data.url) {
      setPhotos(prev => [{ id: data.id, url: data.url }, ...prev]);
      setPhotoIndex(0);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleDeletePhoto = async (photo: { id: string; url: string }) => {
    await fetch("/api/baby-photo", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: photo.id }) });
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
    setPhotoIndex(0);
  };

  const taskColors = ["bg-rose-50 border-rose-200", "bg-blue-50 border-blue-200", "bg-amber-50 border-amber-200", "bg-emerald-50 border-emerald-200"];
  const taskDots = ["bg-rose-400", "bg-blue-400", "bg-amber-400", "bg-emerald-400"];

  return (
    <div className="max-w-[1300px] mx-auto space-y-5">
      {/* HEADER + Motivation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">{getGreeting()}, Paul</h1>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            {quote.emoji} {quote.text}
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input placeholder="Search..." className="w-full md:w-56 rounded-xl bg-white border border-gray-200 py-2 pl-9 pr-4 text-sm text-gray-700 focus:outline-none focus:border-gray-400" />
        </div>
      </div>

      {/* ROW 1 — Family + Weather + Calendar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Family Photos */}
        <div className="md:col-span-4 card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5"><Heart className="h-3.5 w-3.5 text-pink-400" />Family</span>
            <div className="flex items-center gap-2">
              {photos.length > 0 && <span className="text-[10px] text-gray-300">{photoIndex + 1}/{photos.length}</span>}
              <label className="text-[10px] font-semibold text-pink-500 cursor-pointer flex items-center gap-0.5 hover:text-pink-600">
                {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </div>
          </div>
          {photos.length === 0 ? (
            <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-pink-200 bg-pink-50/50 py-8 cursor-pointer hover:bg-pink-50">
              <ImagePlus className="h-6 w-6 text-pink-300 mb-1.5" />
              <p className="text-[11px] text-pink-400">Upload photos (max 20)</p>
              <input type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={handleUpload} />
            </label>
          ) : (
            <div className="relative group rounded-xl overflow-hidden">
              <img
                src={photos[photoIndex % photos.length]?.url}
                alt="family"
                className="w-full aspect-[4/3] object-cover rounded-xl transition-opacity duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" />
              <button onClick={() => handleDeletePhoto(photos[photoIndex % photos.length])} className="absolute top-2 right-2 rounded-full bg-black/40 backdrop-blur-sm p-1 text-white opacity-0 group-hover:opacity-100 transition-all"><X className="h-3 w-3" /></button>
              {/* Dots indicator */}
              {photos.length > 1 && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                  {photos.slice(0, 20).map((_, i) => (
                    <button key={i} onClick={() => setPhotoIndex(i)} className={cn("h-1.5 rounded-full transition-all", i === photoIndex % photos.length ? "w-4 bg-white" : "w-1.5 bg-white/50")} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Weather */}
        <WeatherCard weather={weather} />

        {/* Calendar */}
        <div className="md:col-span-4 card p-5">
          <MiniCalendar />
        </div>
      </div>

      {/* ROW 2 — Stats Cards */}
      {(
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <StatCard icon={<Landmark className="h-4 w-4 text-blue-500" />} label="Cash Balance" value={`$${data.cashBalance.toLocaleString()}`} />
          <StatCard icon={<Mail className="h-4 w-4 text-violet-500" />} label="Unread Emails" value={`${data.recentEmails}`} />
          <StatCard icon={<CheckSquare className="h-4 w-4 text-emerald-500" />} label="Open Tasks" value={`${data.openTodos}`} badge={data.urgentTodos > 0 ? `${data.urgentTodos} urgent` : undefined} />
          <StatCard icon={<FileText className="h-4 w-4 text-rose-500" />} label="Unpaid Invoices" value={`${data.unpaidInvoices}`} badge={data.overdueInvoices > 0 ? `${data.overdueInvoices} overdue` : undefined} />
          <StatCard icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} label="Open Claims" value={`${data.openClaims}`} />
        </div>
      )}

      {/* ROW 3 — Tasks + Invoice Overview + Cash Flow */}
      {(
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Tasks */}
          <div className="md:col-span-3 card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">My Tasks</h3>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-100 text-[10px] font-bold text-gray-500">{todos.length}</span>
            </div>
            <div className="space-y-2">
              {todos.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">No tasks yet</p>
              ) : todos.map((todo, i) => (
                <div key={todo.id} className={cn("rounded-xl border p-3", taskColors[i % taskColors.length])}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={cn("h-1.5 w-1.5 rounded-full", taskDots[i % taskDots.length])} />
                    <span className="text-[10px] text-gray-400 uppercase">{todo.priority}</span>
                  </div>
                  <p className="text-[13px] font-medium text-gray-800 leading-tight">{todo.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Invoice Overview */}
          <div className="md:col-span-5 card p-5">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-sm font-semibold text-gray-900">Invoice Overview</h3>
              <ArrowUpRight className="h-4 w-4 text-gray-300" />
            </div>
            <div className="space-y-3.5">
              <InvoiceBar label="Overdue" count={data.overdueInvoices} amount={data.overdueAmount} color="bg-purple-500" pct={data.overdueInvoices > 0 ? 60 : 0} />
              <InvoiceBar label="Not Paid" count={data.unpaidInvoices} amount={0} color="bg-rose-500" pct={data.unpaidInvoices > 0 ? 45 : 0} />
              <InvoiceBar label="Partial" count={0} amount={0} color="bg-blue-500" pct={0} />
              <InvoiceBar label="Fully Paid" count={0} amount={0} color="bg-emerald-500" pct={0} />
            </div>
          </div>

          {/* Cash Flow */}
          <div className="md:col-span-4 card p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Cash Flow · 30 Days</h3>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2.5">
                <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-emerald-500" /><span className="text-sm text-gray-700">Income</span></div>
                <span className="text-base font-bold text-emerald-600">${data.incomingPayments30d.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-rose-50 px-4 py-2.5">
                <div className="flex items-center gap-2"><TrendingDown className="h-4 w-4 text-rose-500" /><span className="text-sm text-gray-700">Expense</span></div>
                <span className="text-base font-bold text-rose-500">${data.outgoingPayments30d.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-gray-50 border border-gray-100 px-4 py-2.5">
                <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-gray-500" /><span className="text-sm text-gray-700">Net</span></div>
                <span className={cn("text-base font-bold", data.incomingPayments30d - data.outgoingPayments30d >= 0 ? "text-emerald-600" : "text-rose-500")}>
                  ${(data.incomingPayments30d - data.outgoingPayments30d).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-amber-50 px-4 py-2.5">
                <span className="text-sm text-gray-700">Payroll</span>
                <span className="text-base font-bold text-gray-800">${data.monthlyPayroll.toLocaleString()}/mo</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WeatherCard({ weather }: { weather: Weather | null }) {
  const hour = new Date().getHours();
  const isNight = hour < 6 || hour >= 19;
  const code = parseInt(weather?.weatherCode || "113");

  // Sky gradient based on time + weather
  const getSkyGradient = () => {
    if (isNight) {
      if ([176, 263, 266, 293, 296, 299, 302, 305, 308].includes(code)) return "from-[#1a1a2e] via-[#2d2d44] to-[#3a3a5c]"; // rainy night
      if ([200, 386, 389].includes(code)) return "from-[#0f0f23] via-[#1a1a3e] to-[#2a2a4e]"; // storm night
      return "from-[#0f0f23] via-[#1a1a3e] to-[#2d2b55]"; // clear night
    }
    if ([176, 263, 266, 293, 296, 299, 302, 305, 308, 353, 356, 359].includes(code)) return "from-[#667eaa] via-[#7b8eb8] to-[#94a3b8]"; // rainy
    if ([200, 386, 389].includes(code)) return "from-[#374151] via-[#4b5563] to-[#6b7280]"; // storm
    if ([179, 182, 227, 230, 323, 326, 329, 332, 335, 338].includes(code)) return "from-[#e2e8f0] via-[#cbd5e1] to-[#94a3b8]"; // snow
    if (code === 122) return "from-[#94a3b8] via-[#a8b5c4] to-[#b8c4d0]"; // overcast
    if (code === 116 || code === 119) return "from-[#60a5fa] via-[#7bb8f5] to-[#93c5fd]"; // partly cloudy
    if (hour < 8) return "from-[#fda085] via-[#f6d365] to-[#87CEEB]"; // sunrise
    if (hour >= 17) return "from-[#fa709a] via-[#f6d365] to-[#fee140]"; // sunset
    return "from-[#3b82f6] via-[#60a5fa] to-[#93c5fd]"; // clear day
  };

  const isLightSky = [179, 182, 227, 230, 323, 326, 329, 332, 335, 338, 122].includes(code) && !isNight;
  const textColor = isLightSky ? "text-gray-800" : "text-white";
  const subTextColor = isLightSky ? "text-gray-600" : "text-white/70";

  return (
    <div className={cn("md:col-span-4 rounded-2xl p-5 bg-gradient-to-br overflow-hidden relative", getSkyGradient())}>
      {/* Stars for night */}
      {isNight && (
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div key={i} className="absolute h-0.5 w-0.5 bg-white rounded-full animate-pulse" style={{ top: `${10 + (i * 7) % 80}%`, left: `${5 + (i * 13) % 90}%`, animationDelay: `${i * 0.3}s`, opacity: 0.4 + (i % 3) * 0.3 }} />
          ))}
          {/* Moon */}
          <div className="absolute top-3 right-4 h-8 w-8 rounded-full bg-yellow-100 shadow-[0_0_15px_rgba(253,224,71,0.4)]" />
        </div>
      )}

      {/* Sun glow for daytime clear */}
      {!isNight && code === 113 && (
        <div className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-yellow-300/30 blur-2xl" />
      )}

      {/* Rain drops */}
      {[176, 263, 266, 293, 296, 299, 302, 305, 308, 353, 356, 359].includes(code) && (
        <div className="absolute inset-0 overflow-hidden opacity-30">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="absolute w-px bg-gradient-to-b from-transparent to-white/60" style={{ height: `${15 + i * 3}px`, top: `${(i * 11) % 60}%`, left: `${10 + (i * 12) % 80}%`, transform: "rotate(15deg)" }} />
          ))}
        </div>
      )}

      {/* Cloud overlay for cloudy weather */}
      {(code === 116 || code === 119 || code === 122) && !isNight && (
        <div className="absolute top-2 right-8 h-10 w-20 rounded-full bg-white/20 blur-md" />
      )}

      <div className="relative z-10">
        <span className={cn("text-[11px] font-semibold uppercase tracking-wider", subTextColor)}>Weather</span>
        {weather ? (
          <div className="mt-3">
            <div className="flex items-center gap-4">
              {getWeatherIcon(weather.weatherCode, "h-12 w-12")}
              <div>
                <p className={cn("text-4xl font-bold", textColor)}>{weather.temp}°</p>
                <p className={cn("text-sm", subTextColor)}>{weather.desc}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <p className={cn("text-xs flex items-center gap-1.5", subTextColor)}><Droplets className="h-3.5 w-3.5" />{weather.humidity}%</p>
              <p className={cn("text-xs flex items-center gap-1.5", subTextColor)}><Wind className="h-3.5 w-3.5" />{weather.windSpeed}km/h</p>
              <p className={cn("text-xs flex items-center gap-1.5", subTextColor)}><Sun className="h-3.5 w-3.5" />Feels {weather.feelsLike}°</p>
              <p className={cn("text-xs", subTextColor)}>📍 {weather.city}</p>
            </div>
          </div>
        ) : <div className="flex items-center gap-2 text-white/50 py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, badge }: { icon: React.ReactNode; label: string; value: string; badge?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-2">{icon}<span className="text-[11px] text-gray-400 font-semibold uppercase">{label}</span></div>
      <div className="flex items-center gap-2">
        <p className="text-xl font-bold text-gray-900">{value}</p>
        {badge && <span className="text-[10px] font-semibold bg-rose-100 text-rose-600 rounded-full px-1.5 py-0.5">{badge}</span>}
      </div>
    </div>
  );
}
