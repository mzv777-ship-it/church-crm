import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const KEYS = { people: "crm_people", attendance: "crm_attendance", metrics: "crm_metrics" };
async function load(key) { try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; } }
async function save(key, val) { try { await window.storage.set(key, JSON.stringify(val)); } catch {} }

const SEED_PEOPLE = [
  { id: "p1", name: "Мария Ковальчук", phone: "+380501234567", address: "ул. Садовая 12", joinDate: "2024-10-01", notes: "Записана на школу ученичества", registeredAid: true, baptized: true, discipleship: true, ppo: false, savedDate: "2024-09-15" },
  { id: "p2", name: "Андрей Бондаренко", phone: "+380671112233", address: "ул. Лесная 5", joinDate: "2024-11-10", notes: "", registeredAid: true, baptized: false, discipleship: false, ppo: false, savedDate: "2024-11-10" },
  { id: "p3", name: "Татьяна Мельник", phone: "+380931234568", address: "пр. Мира 33", joinDate: "2024-12-05", notes: "Нуждается в помощи продуктами", registeredAid: true, baptized: false, discipleship: true, ppo: true, savedDate: "2024-12-01" },
];
const SEED_METRICS = [
  { id: "m1", week: "2025-W01", date: "2025-01-05", flyers: 120, visitors: 18, saved: 3, registeredAid: 5, baptisms: 1, discipleship: 12, ppo: 8 },
  { id: "m2", week: "2025-W02", date: "2025-01-12", flyers: 85, visitors: 22, saved: 2, registeredAid: 3, baptisms: 0, discipleship: 14, ppo: 9 },
  { id: "m3", week: "2025-W03", date: "2025-01-19", flyers: 200, visitors: 35, saved: 7, registeredAid: 8, baptisms: 2, discipleship: 15, ppo: 11 },
  { id: "m4", week: "2025-W04", date: "2025-01-26", flyers: 150, visitors: 28, saved: 4, registeredAid: 6, baptisms: 1, discipleship: 17, ppo: 12 },
  { id: "m5", week: "2025-W05", date: "2025-02-02", flyers: 170, visitors: 31, saved: 5, registeredAid: 7, baptisms: 3, discipleship: 19, ppo: 14 },
  { id: "m6", week: "2025-W06", date: "2025-02-09", flyers: 210, visitors: 40, saved: 8, registeredAid: 10, baptisms: 2, discipleship: 21, ppo: 16 },
];
const SEED_ATTENDANCE = [
  { id: "a1", personId: "p1", date: "2025-02-02", service: "Воскресное служение", signed: true, signedBy: "Пастор Иван" },
  { id: "a2", personId: "p1", date: "2025-02-05", service: "Среда", signed: true, signedBy: "Дьякон Петр" },
  { id: "a3", personId: "p1", date: "2025-02-09", service: "Воскресное служение", signed: true, signedBy: "Пастор Иван" },
  { id: "a4", personId: "p2", date: "2025-02-02", service: "Воскресное служение", signed: true, signedBy: "Пастор Иван" },
  { id: "a5", personId: "p3", date: "2025-02-05", service: "Среда", signed: true, signedBy: "Дьякон Петр" },
  { id: "a6", personId: "p3", date: "2025-02-09", service: "Воскресное служение", signed: true, signedBy: "Пастор Иван" },
];

function getWeek(dateStr) {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - start) / 86400000 + start.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2,"0")}`;
}
function getAttendanceStats(personId, attendance) {
  const personAtt = attendance.filter(a => a.personId === personId && a.signed);
  const weeks = {};
  personAtt.forEach(a => { const w = getWeek(a.date); weeks[w] = (weeks[w] || 0) + 1; });
  return { total: personAtt.length, totalWeeks: Object.keys(weeks).length, qualifiedWeeks: Object.values(weeks).filter(c => c >= 2).length };
}
function isEligibleForAid(personId, attendance) { return getAttendanceStats(personId, attendance).qualifiedWeeks >= 1; }
function formatDate(d) { try { return new Date(d).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return "—"; } }

const COLORS = ["#4F46E5","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];
const INPUT = { width: "100%", padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10, fontSize: 14, outline: "none", boxSizing: "border-box", background: "#fafafa", color: "#1e293b" };

function StatCard({ icon, label, value, color="#4F46E5", sub }) {
  return (
    <div style={{ background:"#fff", borderRadius:16, padding:"20px 24px", boxShadow:"0 2px 12px rgba(0,0,0,0.07)", borderLeft:`5px solid ${color}`, display:"flex", alignItems:"center", gap:16 }}>
      <div style={{ fontSize:36 }}>{icon}</div>
      <div>
        <div style={{ fontSize:28, fontWeight:800, color:"#1e293b", lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:13, color:"#64748b", marginTop:4, fontWeight:500 }}>{label}</div>
        {sub && <div style={{ fontSize:12, color, marginTop:2 }}>{sub}</div>}
      </div>
    </div>
  );
}

function Badge({ color, label }) {
  const map = { green:"#d1fae5:#065f46", blue:"#dbeafe:#1e40af", yellow:"#fef3c7:#92400e", red:"#fee2e2:#991b1b", gray:"#f1f5f9:#475569" };
  const [bg, text] = (map[color]||map.gray).split(":");
  return <span style={{ background:bg, color:text, fontSize:11, fontWeight:700, padding:"2px 10px", borderRadius:99, whiteSpace:"nowrap" }}>{label}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:600, maxHeight:"90vh", overflow:"auto", boxShadow:"0 24px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"20px 24px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ margin:0, fontSize:18, fontWeight:700 }}>{title}</h3>
          <button onClick={onClose} style={{ border:"none", background:"#f1f5f9", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:18 }}>✕</button>
        </div>
        <div style={{ padding:24 }}>{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, children, required }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:6 }}>{label}{required && <span style={{ color:"#ef4444" }}> *</span>}</label>
      {children}
    </div>
  );
}

// ── СЧЁТЧИК ПОСЕТИТЕЛЕЙ (правая панель) ────────────────────────────────────
function VisitorCounter({ people, attendance, onSaveToMetrics }) {
  const [count, setCount] = useState(0);
  const [maxCount, setMaxCount] = useState(0);
  const [totalIn, setTotalIn] = useState(0);
  const [log, setLog] = useState([]);
  const [serviceName, setServiceName] = useState("Воскресное служение");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().slice(0,10));
  const [extraForm, setExtraForm] = useState({ flyers:"", saved_count:"", registered_aid:"", baptisms:"", discipleship:"", ppo:"" });

  const addEntry = (dir) => {
    const newCount = dir === "in" ? count + 1 : Math.max(0, count - 1);
    const newTotal = dir === "in" ? totalIn + 1 : totalIn;
    setCount(newCount);
    setTotalIn(newTotal);
    if (newCount > maxCount) setMaxCount(newCount);
    setLog(l => [{ time: new Date().toLocaleTimeString("ru-RU", { hour:"2-digit", minute:"2-digit" }), dir, count: newCount, id: Date.now() }, ...l].slice(0, 15));
    setSaved(false);
  };

  const reset = () => { if (!confirm("Сбросить счётчик? Данные удалятся.")) return; setCount(0); setMaxCount(0); setTotalIn(0); setLog([]); setSaved(false); };
  const todayAtt = attendance.filter(a => a.date === new Date().toISOString().slice(0,10) && a.signed).length;

  const handleSave = () => {
    const week = getWeek(serviceDate);
    onSaveToMetrics({
      week,
      date: serviceDate,
      visitors: totalIn,
      flyers: +extraForm.flyers || 0,
      saved: +extraForm.saved_count || 0,
      registeredAid: +extraForm.registered_aid || 0,
      baptisms: +extraForm.baptisms || 0,
      discipleship: serviceName === "Школа ученичества" ? totalIn : (+extraForm.discipleship || 0),
      ppo: serviceName === "Школа ППО" ? totalIn : (+extraForm.ppo || 0),
    });
    setShowSaveModal(false);
    setSaved(true);
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      {/* Заголовок */}
      <div style={{ background:"linear-gradient(135deg,#1e1b4b,#4338ca)", borderRadius:16, padding:"16px 18px", color:"#fff" }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, opacity:0.7, textTransform:"uppercase", marginBottom:4 }}>Сегодня</div>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:10, opacity:0.9 }}>{serviceName}</div>
        <div style={{ fontSize:56, fontWeight:900, lineHeight:1, textAlign:"center" }}>{count}</div>
        <div style={{ fontSize:13, textAlign:"center", opacity:0.7, marginTop:4 }}>человек в зале</div>
        <div style={{ display:"flex", justifyContent:"space-around", marginTop:12, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.15)" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:18, fontWeight:800 }}>{totalIn}</div>
            <div style={{ fontSize:10, opacity:0.7 }}>вошло всего</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:18, fontWeight:800 }}>{maxCount}</div>
            <div style={{ fontSize:10, opacity:0.7 }}>максимум</div>
          </div>
        </div>
      </div>

      {/* Дата и тип служения */}
      <input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} style={{ ...INPUT, fontSize:13 }} />
      <select value={serviceName} onChange={e => setServiceName(e.target.value)} style={{ ...INPUT, fontSize:13 }}>
        {["Воскресное служение","Среда (молитва)","Пятница","Ячейка","Школа ученичества","Школа ППО"].map(s => <option key={s}>{s}</option>)}
      </select>

      {/* Кнопки +/- */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <button onClick={() => addEntry("in")} style={{ background:"#10B981", color:"#fff", border:"none", borderRadius:14, padding:"20px 0", fontSize:28, cursor:"pointer", fontWeight:900, boxShadow:"0 4px 12px rgba(16,185,129,0.4)" }}>
          +<div style={{ fontSize:11, fontWeight:600, marginTop:2, opacity:0.9 }}>ВОШЁЛ</div>
        </button>
        <button onClick={() => addEntry("out")} style={{ background:"#f97316", color:"#fff", border:"none", borderRadius:14, padding:"20px 0", fontSize:28, cursor:"pointer", fontWeight:900, boxShadow:"0 4px 12px rgba(249,115,22,0.4)" }}>
          −<div style={{ fontSize:11, fontWeight:600, marginTop:2, opacity:0.9 }}>ВЫШЕЛ</div>
        </button>
      </div>

      {/* КНОПКА СОХРАНИТЬ В МЕТРИКИ */}
      <button onClick={() => setShowSaveModal(true)}
        style={{ background: saved ? "#d1fae5" : "linear-gradient(135deg,#4F46E5,#7C3AED)", color: saved ? "#065f46" : "#fff", border:"none", borderRadius:12, padding:"14px", fontWeight:800, cursor:"pointer", fontSize:14, boxShadow: saved ? "none" : "0 4px 14px rgba(79,70,229,0.4)", transition:"all 0.2s" }}>
        {saved ? "✅ Сохранено в метрики!" : "💾 Сохранить итог служения"}
      </button>

      <button onClick={reset} style={{ background:"#f1f5f9", border:"none", borderRadius:10, padding:"9px", cursor:"pointer", fontWeight:700, fontSize:12, color:"#64748b" }}>
        🔄 Сбросить счётчик
      </button>

      {/* Статистика */}
      <div style={{ background:"#fff", borderRadius:12, padding:"12px 14px", boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Статистика дня</div>
        {[["Сейчас в зале:", count, "#4F46E5"], ["Вошло всего:", totalIn, "#10B981"], ["Максимум:", maxCount, "#F59E0B"], ["Отмечено в CRM:", todayAtt, "#8B5CF6"], ["Людей в базе:", people.length, "#1e293b"]].map(([label, val, color]) => (
          <div key={label} style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:5 }}>
            <span style={{ color:"#64748b" }}>{label}</span>
            <span style={{ fontWeight:800, color }}>{val}</span>
          </div>
        ))}
      </div>

      {/* Лог */}
      {log.length > 0 && (
        <div style={{ background:"#fff", borderRadius:12, padding:"12px 14px", boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#64748b", marginBottom:8, textTransform:"uppercase", letterSpacing:1 }}>Последние движения</div>
          {log.slice(0,8).map(e => (
            <div key={e.id} style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, marginBottom:4 }}>
              <span>{e.dir==="in" ? "🟢" : "🔴"}</span>
              <span style={{ color:"#64748b" }}>{e.time}</span>
              <span style={{ color:e.dir==="in"?"#10B981":"#f97316", fontWeight:600 }}>{e.dir==="in"?"вошёл":"вышел"}</span>
              <span style={{ marginLeft:"auto", fontWeight:700, color:"#1e293b" }}>{e.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Модал сохранения */}
      {showSaveModal && (
        <Modal title="💾 Сохранить итог служения" onClose={() => setShowSaveModal(false)}>
          {/* Итоги счётчика */}
          <div style={{ background:"linear-gradient(135deg,#1e1b4b,#4338ca)", borderRadius:14, padding:16, color:"#fff", marginBottom:20 }}>
            <div style={{ fontSize:13, fontWeight:600, opacity:0.8, marginBottom:10 }}>{serviceName} · {serviceDate}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, textAlign:"center" }}>
              <div><div style={{ fontSize:28, fontWeight:900 }}>{totalIn}</div><div style={{ fontSize:11, opacity:0.7 }}>вошло</div></div>
              <div><div style={{ fontSize:28, fontWeight:900 }}>{maxCount}</div><div style={{ fontSize:11, opacity:0.7 }}>максимум</div></div>
              <div><div style={{ fontSize:28, fontWeight:900 }}>{count}</div><div style={{ fontSize:11, opacity:0.7 }}>в зале</div></div>
            </div>
          </div>

          <p style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>Дополни данные служения — они попадут на графики дашборда:</p>

          {[["flyers","📋 Роздано флаеров сегодня"],["saved_count","✝️ Приняли Иисуса"],["registered_aid","🎁 Записалось на помощь"],["baptisms","💧 Крестилось"],["discipleship","📖 Школа ученичества (чел.)"],["ppo","🕊️ Школа ППО (чел.)"]].map(([k, label]) => (
            <div key={k} style={{ marginBottom:12 }}>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:4 }}>{label}</label>
              <input type="number" min="0" placeholder="0" value={extraForm[k]}
                onChange={e => setExtraForm(f => ({ ...f, [k]: e.target.value }))}
                style={{ ...INPUT, fontSize:18, fontWeight:700, textAlign:"center" }} />
            </div>
          ))}

          <div style={{ display:"flex", gap:10, marginTop:8 }}>
            <button onClick={() => setShowSaveModal(false)} style={{ flex:1, padding:12, border:"1.5px solid #e2e8f0", borderRadius:10, background:"#fff", cursor:"pointer", fontWeight:600 }}>Отмена</button>
            <button onClick={handleSave} style={{ flex:2, padding:12, background:"#4F46E5", color:"#fff", border:"none", borderRadius:10, fontWeight:800, cursor:"pointer", fontSize:15 }}>
              ✅ Сохранить в метрики
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function Dashboard({ people, attendance, metrics }) {
  const totalFlyers = metrics.reduce((s, m) => s + (m.flyers||0), 0);
  const totalVisitors = metrics.reduce((s, m) => s + (m.visitors||0), 0);
  const totalSaved = metrics.reduce((s, m) => s + (m.saved||0), 0);
  const totalBaptisms = metrics.reduce((s, m) => s + (m.baptisms||0), 0);
  const registeredAid = people.filter(p => p.registeredAid).length;
  const discipleship = people.filter(p => p.discipleship).length;
  const ppo = people.filter(p => p.ppo).length;
  const activeMonth = people.filter(p => getAttendanceStats(p.id, attendance).qualifiedWeeks >= 3).length;
  const chartData = metrics.slice(-8).map(m => ({ week: m.week?.split("-W")[1] ? `Нед.${m.week.split("-W")[1]}` : m.date?.slice(5), "Флаеры":m.flyers, "Посетители":m.visitors, "Приняли Иисуса":m.saved, "Крещения":m.baptisms, "Ученичество":m.discipleship, "ППО":m.ppo }));
  const pieData = [{ name:"Посетители", value:totalVisitors },{ name:"Приняли Иисуса", value:totalSaved },{ name:"Крещены", value:totalBaptisms },{ name:"Помощь", value:registeredAid }];
  return (
    <div>
      <h2 style={{ fontSize:24, fontWeight:800, color:"#1e293b", marginBottom:8 }}>📊 Дашборд роста церкви</h2>
      <p style={{ color:"#64748b", marginBottom:24 }}>Общая картина служения — всё в одном месте</p>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(200px, 1fr))", gap:14, marginBottom:28 }}>
        <StatCard icon="📋" label="Роздано флаеров" value={totalFlyers.toLocaleString()} color="#4F46E5" />
        <StatCard icon="🙏" label="Посетили служение" value={totalVisitors} color="#10B981" />
        <StatCard icon="✝️" label="Приняли Иисуса" value={totalSaved} color="#F59E0B" />
        <StatCard icon="💧" label="Крестилось" value={totalBaptisms} color="#06B6D4" />
        <StatCard icon="🎁" label="На постоянной помощи" value={registeredAid} color="#8B5CF6" />
        <StatCard icon="📅" label="Ходят 1+ месяц" value={activeMonth} color="#EC4899" sub="2+ посещ/нед × 3 нед" />
        <StatCard icon="📖" label="Школа ученичества" value={discipleship} color="#EF4444" />
        <StatCard icon="🕊️" label="Школа ППО" value={ppo} color="#10B981" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:20, marginBottom:20 }}>
        <div style={{ background:"#fff", borderRadius:16, padding:20, boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
          <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700 }}>📈 Динамика по неделям</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="week" style={{ fontSize:11 }} /><YAxis style={{ fontSize:11 }} /><Tooltip /><Legend />
              <Line type="monotone" dataKey="Посетители" stroke="#4F46E5" strokeWidth={2} dot={{ r:3 }} />
              <Line type="monotone" dataKey="Приняли Иисуса" stroke="#10B981" strokeWidth={2} dot={{ r:3 }} />
              <Line type="monotone" dataKey="Ученичество" stroke="#F59E0B" strokeWidth={2} dot={{ r:3 }} />
              <Line type="monotone" dataKey="ППО" stroke="#8B5CF6" strokeWidth={2} dot={{ r:3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ background:"#fff", borderRadius:16, padding:20, boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
          <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700 }}>🥧 Конверсия</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ value }) => value}>{pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Pie><Tooltip /><Legend /></PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{ background:"#fff", borderRadius:16, padding:20, boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
        <h3 style={{ margin:"0 0 16px", fontSize:15, fontWeight:700 }}>📊 Флаеры и посещения</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="week" style={{ fontSize:11 }} /><YAxis style={{ fontSize:11 }} /><Tooltip /><Legend />
            <Bar dataKey="Флаеры" fill="#4F46E5" radius={[4,4,0,0]} /><Bar dataKey="Посетители" fill="#10B981" radius={[4,4,0,0]} /><Bar dataKey="Крещения" fill="#06B6D4" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── ЛЮДИ ──────────────────────────────────────────────────────────────────────
function PeopleList({ people, attendance, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState(""); const [filter, setFilter] = useState("all");
  const filtered = people.filter(p => { const q = search.toLowerCase(); const match = p.name?.toLowerCase().includes(q) || p.phone?.includes(q); if (filter==="aid") return match && p.registeredAid; if (filter==="discipleship") return match && p.discipleship; if (filter==="baptized") return match && p.baptized; return match; });
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20, flexWrap:"wrap", gap:12 }}>
        <div><h2 style={{ fontSize:24, fontWeight:800, color:"#1e293b", margin:0 }}>👥 Люди</h2><p style={{ color:"#64748b", margin:"4px 0 0" }}>Карточки прихожан</p></div>
        <button onClick={onAdd} style={{ background:"#4F46E5", color:"#fff", border:"none", borderRadius:12, padding:"12px 24px", fontWeight:700, cursor:"pointer", fontSize:14 }}>+ Добавить</button>
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:18, flexWrap:"wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Поиск..." style={{ ...INPUT, flex:1, minWidth:180 }} />
        {["all","aid","discipleship","baptized"].map(f => (<button key={f} onClick={() => setFilter(f)} style={{ padding:"9px 14px", borderRadius:10, border:"1.5px solid", borderColor:filter===f?"#4F46E5":"#e2e8f0", background:filter===f?"#4F46E5":"#fff", color:filter===f?"#fff":"#64748b", fontWeight:600, cursor:"pointer", fontSize:12 }}>{{ all:"Все", aid:"Помощь", discipleship:"Ученичество", baptized:"Крещёные" }[f]}</button>))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(300px, 1fr))", gap:14 }}>
        {filtered.map(p => { const stats = getAttendanceStats(p.id, attendance); const eligible = isEligibleForAid(p.id, attendance); return (
          <div key={p.id} style={{ background:"#fff", borderRadius:16, padding:18, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", border:"1.5px solid #f1f5f9" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,#4F46E5,#8B5CF6)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:18 }}>{p.name?.charAt(0)}</div>
                <div><div style={{ fontWeight:700, fontSize:14 }}>{p.name}</div><div style={{ fontSize:12, color:"#64748b" }}>{p.phone}</div></div>
              </div>
              <div style={{ display:"flex", gap:5 }}>
                <button onClick={() => onEdit(p)} style={{ background:"#f1f5f9", border:"none", borderRadius:7, width:30, height:30, cursor:"pointer" }}>✏️</button>
                <button onClick={() => onDelete(p.id)} style={{ background:"#fee2e2", border:"none", borderRadius:7, width:30, height:30, cursor:"pointer" }}>🗑️</button>
              </div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
              {p.registeredAid && <Badge color="blue" label="🎁 Помощь" />}
              {p.baptized && <Badge color="blue" label="💧 Крещён" />}
              {p.discipleship && <Badge color="green" label="📖 Ученичество" />}
              {p.ppo && <Badge color="yellow" label="🕊️ ППО" />}
              {p.savedDate && <Badge color="green" label="✝️ Спасён" />}
              {eligible ? <Badge color="green" label="✅ Право на помощь" /> : <Badge color="red" label="❌ Нет права" />}
            </div>
            <div style={{ background:"#f8fafc", borderRadius:10, padding:"9px 12px", fontSize:12 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ color:"#64748b" }}>Посещений:</span><span style={{ fontWeight:700 }}>{stats.total}</span></div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ color:"#64748b" }}>Недель с 2+:</span><span style={{ fontWeight:700, color:stats.qualifiedWeeks>=1?"#10B981":"#ef4444" }}>{stats.qualifiedWeeks}</span></div>
              <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:"#64748b" }}>С нами с:</span><span style={{ fontWeight:600 }}>{formatDate(p.joinDate)}</span></div>
            </div>
            {p.notes && <div style={{ marginTop:8, fontSize:12, color:"#64748b", fontStyle:"italic" }}>💬 {p.notes}</div>}
          </div>
        );})}
      </div>
      {filtered.length===0 && <div style={{ textAlign:"center", padding:48, color:"#94a3b8" }}>Никого не найдено</div>}
    </div>
  );
}

function PersonForm({ person, onSave, onClose }) {
  const [form, setForm] = useState(person || { name:"", phone:"", address:"", joinDate:new Date().toISOString().slice(0,10), notes:"", registeredAid:false, baptized:false, discipleship:false, ppo:false, savedDate:"" });
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
      <FormField label="Имя и фамилия" required><input style={INPUT} value={form.name} onChange={e => set("name", e.target.value)} required /></FormField>
      <FormField label="Телефон"><input style={INPUT} value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+380..." /></FormField>
      <FormField label="Адрес"><input style={INPUT} value={form.address} onChange={e => set("address", e.target.value)} /></FormField>
      <FormField label="Дата прихода"><input style={INPUT} type="date" value={form.joinDate} onChange={e => set("joinDate", e.target.value)} /></FormField>
      <FormField label="Дата принятия Иисуса"><input style={INPUT} type="date" value={form.savedDate} onChange={e => set("savedDate", e.target.value)} /></FormField>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        {[["registeredAid","🎁 Записан на помощь"],["baptized","💧 Крещён"],["discipleship","📖 Школа ученичества"],["ppo","🕊️ Школа ППО"]].map(([k,label]) => (
          <label key={k} style={{ display:"flex", alignItems:"center", gap:8, background:"#f8fafc", borderRadius:10, padding:"10px 12px", cursor:"pointer", fontWeight:600, fontSize:13 }}>
            <input type="checkbox" checked={!!form[k]} onChange={e => set(k, e.target.checked)} style={{ width:16, height:16 }} />{label}
          </label>
        ))}
      </div>
      <FormField label="Заметки"><textarea style={{ ...INPUT, height:70, resize:"vertical" }} value={form.notes} onChange={e => set("notes", e.target.value)} /></FormField>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <button type="button" onClick={onClose} style={{ padding:"10px 18px", border:"1.5px solid #e2e8f0", borderRadius:10, background:"#fff", cursor:"pointer", fontWeight:600 }}>Отмена</button>
        <button type="submit" style={{ padding:"10px 22px", background:"#4F46E5", color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer" }}>Сохранить</button>
      </div>
    </form>
  );
}

// ── КАРТОЧКИ ПОСЕЩАЕМОСТИ ─────────────────────────────────────────────────────
function AttendanceCards({ people, attendance, onSign }) {
  const [selected, setSelected] = useState(null);
  const [showSign, setShowSign] = useState(false);
  const [signForm, setSignForm] = useState({ date:new Date().toISOString().slice(0,10), service:"Воскресное служение", signedBy:"" });
  const aidPeople = people.filter(p => p.registeredAid);
  const person = people.find(p => p.id === selected);
  const getWeeks = (pid) => { const att = attendance.filter(a => a.personId === pid); const weeks = {}; att.forEach(a => { const w = getWeek(a.date); if (!weeks[w]) weeks[w]=[]; weeks[w].push(a); }); return Object.entries(weeks).sort((a,b) => b[0].localeCompare(a[0])).slice(0,8); };

  if (selected && person) {
    const weeks = getWeeks(selected); const eligible = isEligibleForAid(selected, attendance); const stats = getAttendanceStats(selected, attendance);
    return (
      <div>
        <button onClick={() => setSelected(null)} style={{ background:"#f1f5f9", border:"none", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontWeight:600, marginBottom:18 }}>← Назад</button>
        <div style={{ background:"#fff", borderRadius:20, padding:24, boxShadow:"0 4px 24px rgba(0,0,0,0.10)", border:"2px solid #e2e8f0", maxWidth:680 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:20, flexWrap:"wrap", gap:10 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:"#8B5CF6", textTransform:"uppercase", marginBottom:4 }}>Карточка посещаемости</div>
              <div style={{ fontSize:20, fontWeight:800 }}>{person.name}</div>
              <div style={{ fontSize:13, color:"#64748b", marginTop:2 }}>{person.phone} · С {formatDate(person.joinDate)}</div>
            </div>
            <div style={{ textAlign:"right" }}>
              {eligible ? <div style={{ background:"#d1fae5", color:"#065f46", padding:"8px 16px", borderRadius:12, fontWeight:800, fontSize:13 }}>✅ ПРАВО НА ПОМОЩЬ</div>
                        : <div style={{ background:"#fee2e2", color:"#991b1b", padding:"8px 16px", borderRadius:12, fontWeight:800, fontSize:13 }}>❌ НЕТ ПРАВА НА ПОМОЩЬ</div>}
              <div style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>Нужно 2 посещения в неделю</div>
            </div>
          </div>
          <div style={{ background:"#f8fafc", borderRadius:12, padding:14, marginBottom:18, display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, textAlign:"center" }}>
            <div><div style={{ fontSize:22, fontWeight:800, color:"#4F46E5" }}>{stats.total}</div><div style={{ fontSize:11, color:"#64748b" }}>Всего посещений</div></div>
            <div><div style={{ fontSize:22, fontWeight:800, color:"#10B981" }}>{stats.qualifiedWeeks}</div><div style={{ fontSize:11, color:"#64748b" }}>Недель с 2+</div></div>
            <div><div style={{ fontSize:22, fontWeight:800, color:"#F59E0B" }}>{stats.totalWeeks}</div><div style={{ fontSize:11, color:"#64748b" }}>Всего недель</div></div>
          </div>
          <div style={{ marginBottom:18 }}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:10 }}>📅 История по неделям</div>
            {weeks.length===0 && <div style={{ color:"#94a3b8", textAlign:"center", padding:20 }}>Посещений пока нет</div>}
            {weeks.map(([week, records]) => { const q = records.length >= 2; return (
              <div key={week} style={{ background:q?"#f0fdf4":"#fff7ed", border:`1.5px solid ${q?"#bbf7d0":"#fed7aa"}`, borderRadius:12, padding:"10px 14px", marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>Неделя {week}</div>
                  <Badge color={q?"green":"yellow"} label={q?`✅ ${records.length}/2 ВЫПОЛНЕНО`:`⚠️ ${records.length}/2`} />
                </div>
                {records.map(r => (<div key={r.id} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 0", borderTop:"1px solid rgba(0,0,0,0.05)", fontSize:12 }}><span>✍️</span><span>{formatDate(r.date)}</span><span style={{ color:"#64748b" }}>{r.service}</span><span style={{ marginLeft:"auto", color:"#94a3b8", fontStyle:"italic" }}>Подпись: {r.signedBy||"—"}</span></div>))}
              </div>
            );})}
          </div>
          <button onClick={() => setShowSign(true)} style={{ width:"100%", background:"#4F46E5", color:"#fff", border:"none", borderRadius:12, padding:13, fontWeight:800, cursor:"pointer", fontSize:15 }}>✍️ Поставить подпись о посещении</button>
        </div>
        {showSign && (
          <Modal title="✍️ Отметить посещение" onClose={() => setShowSign(false)}>
            <div style={{ background:"#f0f9ff", borderRadius:12, padding:14, marginBottom:18, fontSize:13 }}><strong>Человек:</strong> {person.name}</div>
            <FormField label="Дата" required><input style={INPUT} type="date" value={signForm.date} onChange={e => setSignForm(f => ({ ...f, date:e.target.value }))} /></FormField>
            <FormField label="Тип служения"><select style={INPUT} value={signForm.service} onChange={e => setSignForm(f => ({ ...f, service:e.target.value }))}>{["Воскресное служение","Среда (молитва)","Пятница","Ячейка","Школа ученичества","Школа ППО"].map(s => <option key={s}>{s}</option>)}</select></FormField>
            <FormField label="Кто подписывает"><input style={INPUT} value={signForm.signedBy} onChange={e => setSignForm(f => ({ ...f, signedBy:e.target.value }))} placeholder="Имя пастора / дьякона..." /></FormField>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setShowSign(false)} style={{ flex:1, padding:11, border:"1.5px solid #e2e8f0", borderRadius:10, background:"#fff", cursor:"pointer", fontWeight:600 }}>Отмена</button>
              <button onClick={() => { onSign({ personId:selected, ...signForm, signed:true, id:`a${Date.now()}` }); setShowSign(false); }} style={{ flex:2, padding:11, background:"#10B981", color:"#fff", border:"none", borderRadius:10, fontWeight:800, cursor:"pointer" }}>✅ Подтвердить</button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize:24, fontWeight:800, color:"#1e293b", marginBottom:8 }}>📋 Карточки посещаемости</h2>
      <div style={{ background:"#fef9c3", border:"1.5px solid #fde047", borderRadius:12, padding:"12px 16px", marginBottom:20, fontSize:13, color:"#713f12" }}>
        ℹ️ <strong>Условие получения помощи:</strong> 2 посещения в неделю. Зелёная карточка = право на помощь.
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(260px, 1fr))", gap:14 }}>
        {aidPeople.map(p => { const eligible = isEligibleForAid(p.id, attendance); const stats = getAttendanceStats(p.id, attendance); return (
          <div key={p.id} onClick={() => setSelected(p.id)} style={{ background:"#fff", borderRadius:16, padding:18, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", border:`2px solid ${eligible?"#bbf7d0":"#fee2e2"}`, cursor:"pointer", transition:"transform 0.1s" }} onMouseEnter={e => e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e => e.currentTarget.style.transform="translateY(0)"}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ width:42, height:42, borderRadius:"50%", background:eligible?"linear-gradient(135deg,#10B981,#059669)":"linear-gradient(135deg,#f97316,#ef4444)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:17 }}>{p.name?.charAt(0)}</div>
              <div><div style={{ fontWeight:700, fontSize:14 }}>{p.name}</div><div style={{ fontSize:12, color:"#64748b" }}>{p.phone}</div></div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:6 }}><span style={{ color:"#64748b" }}>Посещений:</span><span style={{ fontWeight:700 }}>{stats.total}</span></div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:10 }}><span style={{ color:"#64748b" }}>Квалиф. недели:</span><span style={{ fontWeight:700, color:eligible?"#10B981":"#ef4444" }}>{stats.qualifiedWeeks}</span></div>
            <div style={{ textAlign:"center", padding:7, borderRadius:10, background:eligible?"#d1fae5":"#fee2e2", fontWeight:800, fontSize:12, color:eligible?"#065f46":"#991b1b" }}>{eligible?"✅ ПРАВО НА ПОМОЩЬ":"❌ НЕТ ПРАВА"}</div>
          </div>
        );})}
        {aidPeople.length===0 && <div style={{ gridColumn:"1/-1", textAlign:"center", padding:40, color:"#94a3b8" }}>Нет людей, записанных на помощь</div>}
      </div>
    </div>
  );
}

// ── ПОКАЗАТЕЛИ ────────────────────────────────────────────────────────────────
function MetricsInput({ metrics, onAdd }) {
  const [form, setForm] = useState({ week:getWeek(new Date().toISOString()), date:new Date().toISOString().slice(0,10), flyers:"", visitors:"", saved:"", registeredAid:"", baptisms:"", discipleship:"", ppo:"" });
  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const fields = [["flyers","📋 Роздано флаеров"],["visitors","🙏 Посетили служение"],["saved","✝️ Приняли Иисуса"],["registeredAid","🎁 Записалось на помощь"],["baptisms","💧 Крестилось"],["discipleship","📖 Школа ученичества"],["ppo","🕊️ Школа ППО"]];
  return (
    <div style={{ maxWidth:600 }}>
      <h2 style={{ fontSize:24, fontWeight:800, color:"#1e293b", marginBottom:8 }}>📥 Внести показатели</h2>
      <p style={{ color:"#64748b", marginBottom:20 }}>Еженедельный ввод данных для графиков роста</p>
      <div style={{ background:"#fff", borderRadius:20, padding:24, boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:18 }}>
          <FormField label="Дата" required><input style={INPUT} type="date" value={form.date} onChange={e => set("date", e.target.value)} /></FormField>
          <FormField label="Неделя"><input style={INPUT} value={form.week} onChange={e => set("week", e.target.value)} /></FormField>
        </div>
        {fields.map(([key,label]) => (<div key={key} style={{ marginBottom:14 }}><label style={{ display:"block", fontSize:14, fontWeight:700, color:"#374151", marginBottom:5 }}>{label}</label><input style={{ ...INPUT, fontSize:20, fontWeight:700, textAlign:"center" }} type="number" min="0" value={form[key]} onChange={e => set(key, e.target.value)} placeholder="0" /></div>))}
        <button onClick={() => { onAdd(form); setForm(f => ({ ...f, flyers:"", visitors:"", saved:"", registeredAid:"", baptisms:"", discipleship:"", ppo:"" })); }} style={{ width:"100%", background:"#4F46E5", color:"#fff", border:"none", borderRadius:12, padding:14, fontWeight:800, fontSize:15, cursor:"pointer" }}>💾 Сохранить показатели</button>
      </div>
      {metrics.length > 0 && (
        <div style={{ marginTop:20 }}>
          <h3 style={{ fontWeight:700, marginBottom:10 }}>📋 Последние записи</h3>
          {[...metrics].reverse().slice(0,4).map(m => (
            <div key={m.id} style={{ background:"#fff", borderRadius:12, padding:"11px 14px", marginBottom:8, boxShadow:"0 1px 6px rgba(0,0,0,0.05)", fontSize:12 }}>
              <div style={{ fontWeight:700, marginBottom:4 }}>{m.week} · {formatDate(m.date)}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:10, color:"#64748b" }}>
                <span>📋 {m.flyers}</span><span>🙏 {m.visitors}</span><span>✝️ {m.saved}</span><span>💧 {m.baptisms}</span><span>📖 {m.discipleship}</span><span>🕊️ {m.ppo}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [people, setPeople] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editPerson, setEditPerson] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, color="#10B981") => { setToast({ msg, color }); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    (async () => {
      const [p, a, m] = await Promise.all([load(KEYS.people), load(KEYS.attendance), load(KEYS.metrics)]);
      setPeople(p || SEED_PEOPLE);
      setAttendance(a || SEED_ATTENDANCE);
      setMetrics(m || SEED_METRICS);
      setLoading(false);
    })();
  }, []);

  const savePerson = useCallback(async (form) => {
    const next = form.id ? people.map(p => p.id===form.id ? form : p) : [...people, { ...form, id:`p${Date.now()}` }];
    setPeople(next); await save(KEYS.people, next); setModal(null); setEditPerson(null); showToast("✅ Сохранено");
  }, [people]);

  const deletePerson = useCallback(async (id) => {
    if (!confirm("Удалить?")) return;
    const next = people.filter(p => p.id !== id); setPeople(next); await save(KEYS.people, next); showToast("🗑️ Удалено","#ef4444");
  }, [people]);

  const signAttendance = useCallback(async (rec) => {
    const next = [...attendance, rec]; setAttendance(next); await save(KEYS.attendance, next); showToast("✅ Посещение отмечено!");
  }, [attendance]);

  const addMetrics = useCallback(async (form) => {
    const rec = { id:`m${Date.now()}`, ...form, flyers:+form.flyers||0, visitors:+form.visitors||0, saved:+form.saved||0, registeredAid:+form.registeredAid||0, baptisms:+form.baptisms||0, discipleship:+form.discipleship||0, ppo:+form.ppo||0 };
    const next = [...metrics, rec]; setMetrics(next); await save(KEYS.metrics, next); showToast("📊 Показатели сохранены!");
  }, [metrics]);

  const TABS = [{ id:"dashboard", icon:"📊", label:"Дашборд" },{ id:"people", icon:"👥", label:"Люди" },{ id:"attendance", icon:"📋", label:"Карточки" },{ id:"metrics", icon:"📥", label:"Показатели" }];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f8fafc" }}>
      <div style={{ textAlign:"center" }}><div style={{ fontSize:48, marginBottom:14 }}>⛪</div><div style={{ fontSize:18, fontWeight:700, color:"#4F46E5" }}>Загрузка...</div></div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", fontFamily:"'Segoe UI', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81)", color:"#fff", padding:"0 20px" }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div style={{ padding:"14px 0", display:"flex", alignItems:"center", gap:12, borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize:26 }}>⛪</div>
            <div><div style={{ fontWeight:800, fontSize:17 }}>Church CRM</div><div style={{ fontSize:11, opacity:0.7 }}>Система управления церковью</div></div>
            <div style={{ marginLeft:"auto", fontSize:12, opacity:0.7 }}>👥 {people.length} чел. · 📋 {attendance.filter(a=>a.signed).length} отметок</div>
          </div>
          <div style={{ display:"flex", gap:2 }}>
            {TABS.map(t => (<button key={t.id} onClick={() => setTab(t.id)} style={{ background:"none", border:"none", color:tab===t.id?"#fff":"rgba(255,255,255,0.6)", padding:"13px 18px", cursor:"pointer", fontWeight:tab===t.id?700:500, fontSize:13, borderBottom:tab===t.id?"3px solid #818cf8":"3px solid transparent" }}>{t.icon} {t.label}</button>))}
          </div>
        </div>
      </div>

      {/* Body — 2 колонки: контент + правая панель */}
      <div style={{ maxWidth:1400, margin:"0 auto", padding:20, display:"grid", gridTemplateColumns:"1fr 280px", gap:20, alignItems:"start" }}>
        {/* Левая часть — основной контент */}
        <div>
          {tab==="dashboard" && <Dashboard people={people} attendance={attendance} metrics={metrics} />}
          {tab==="people" && <PeopleList people={people} attendance={attendance} onAdd={() => { setEditPerson(null); setModal("person"); }} onEdit={p => { setEditPerson(p); setModal("person"); }} onDelete={deletePerson} />}
          {tab==="attendance" && <AttendanceCards people={people} attendance={attendance} onSign={signAttendance} />}
          {tab==="metrics" && <MetricsInput metrics={metrics} onAdd={addMetrics} />}
        </div>

        {/* Правая панель — счётчик посетителей */}
        <div style={{ position:"sticky", top:20 }}>
          <div style={{ background:"#fff", borderRadius:20, padding:18, boxShadow:"0 4px 20px rgba(0,0,0,0.10)", border:"1.5px solid #e2e8f0" }}>
            <div style={{ fontSize:12, fontWeight:700, letterSpacing:2, color:"#8B5CF6", textTransform:"uppercase", marginBottom:14 }}>📡 Счётчик посетителей</div>
            <VisitorCounter people={people} attendance={attendance} onSaveToMetrics={addMetrics} />
          </div>
        </div>
      </div>

      {modal==="person" && (
        <Modal title={editPerson?"✏️ Редактировать":"➕ Новый человек"} onClose={() => { setModal(null); setEditPerson(null); }}>
          <PersonForm person={editPerson} onSave={savePerson} onClose={() => { setModal(null); setEditPerson(null); }} />
        </Modal>
      )}

      {toast && (
        <div style={{ position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)", background:toast.color, color:"#fff", padding:"12px 24px", borderRadius:12, fontWeight:700, fontSize:14, boxShadow:"0 8px 24px rgba(0,0,0,0.2)", zIndex:2000 }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
