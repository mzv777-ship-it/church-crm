import { useState, useEffect, useCallback } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

// ─── Storage ────────────────────────────────────────────────────────────────
const KEYS = { people:"crm_people", attendance:"crm_attendance", metrics:"crm_metrics" };
async function load(key) { try { const r = await window.storage.get(key); return r ? JSON.parse(r.value) : null; } catch { return null; } }
async function save(key, val) { try { await window.storage.set(key, JSON.stringify(val)); } catch {} }

// ─── Seed data ───────────────────────────────────────────────────────────────
const SEED_PEOPLE = [
  { id:"p1", name:"Мария Ковальчук", phone:"+380501234567", address:"ул. Садовая 12", joinDate:"2024-10-01", notes:"Записана на школу ученичества", registeredAid:true, baptized:true, discipleship:true, ppo:false, savedDate:"2024-09-15" },
  { id:"p2", name:"Андрей Бондаренко", phone:"+380671112233", address:"ул. Лесная 5", joinDate:"2024-11-10", notes:"", registeredAid:true, baptized:false, discipleship:false, ppo:false, savedDate:"2024-11-10" },
  { id:"p3", name:"Татьяна Мельник", phone:"+380931234568", address:"пр. Мира 33", joinDate:"2024-12-05", notes:"Нуждается в помощи продуктами", registeredAid:true, baptized:false, discipleship:true, ppo:true, savedDate:"2024-12-01" },
];
const SEED_METRICS = [
  { id:"m1", week:"2025-W01", date:"2025-01-05", flyers:120, visitors:18, saved:3, registeredAid:5, baptisms:1, discipleship:12, ppo:8 },
  { id:"m2", week:"2025-W02", date:"2025-01-12", flyers:85, visitors:22, saved:2, registeredAid:3, baptisms:0, discipleship:14, ppo:9 },
  { id:"m3", week:"2025-W03", date:"2025-01-19", flyers:200, visitors:35, saved:7, registeredAid:8, baptisms:2, discipleship:15, ppo:11 },
  { id:"m4", week:"2025-W04", date:"2025-01-26", flyers:150, visitors:28, saved:4, registeredAid:6, baptisms:1, discipleship:17, ppo:12 },
  { id:"m5", week:"2025-W05", date:"2025-02-02", flyers:170, visitors:31, saved:5, registeredAid:7, baptisms:3, discipleship:19, ppo:14 },
  { id:"m6", week:"2025-W06", date:"2025-02-09", flyers:210, visitors:40, saved:8, registeredAid:10, baptisms:2, discipleship:21, ppo:16 },
];
const SEED_ATTENDANCE = [
  { id:"a1", personId:"p1", date:"2025-02-02", service:"Воскресное служение", signed:true, signedBy:"Пастор Иван" },
  { id:"a2", personId:"p1", date:"2025-02-05", service:"Среда", signed:true, signedBy:"Дьякон Петр" },
  { id:"a3", personId:"p1", date:"2025-02-09", service:"Воскресное служение", signed:true, signedBy:"Пастор Иван" },
  { id:"a4", personId:"p2", date:"2025-02-02", service:"Воскресное служение", signed:true, signedBy:"Пастор Иван" },
  { id:"a5", personId:"p3", date:"2025-02-05", service:"Среда", signed:true, signedBy:"Дьякон Петр" },
  { id:"a6", personId:"p3", date:"2025-02-09", service:"Воскресное служение", signed:true, signedBy:"Пастор Иван" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getWeek(dateStr) {
  const d = new Date(dateStr), s = new Date(d.getFullYear(),0,1);
  return `${d.getFullYear()}-W${String(Math.ceil(((d-s)/86400000+s.getDay()+1)/7)).padStart(2,"0")}`;
}
function getStats(pid, att) {
  const a = att.filter(x => x.personId===pid && x.signed), w={};
  a.forEach(x => { const k=getWeek(x.date); w[k]=(w[k]||0)+1; });
  return { total:a.length, totalWeeks:Object.keys(w).length, qualifiedWeeks:Object.values(w).filter(c=>c>=2).length };
}
function eligible(pid,att) { return getStats(pid,att).qualifiedWeeks>=1; }
function fmtDate(d) { try { return new Date(d).toLocaleDateString("ru-RU",{day:"2-digit",month:"2-digit",year:"numeric"}); } catch { return "—"; } }

const COLORS = ["#4F46E5","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#EC4899"];
const SERVICES = ["Воскресное служение","Среда (молитва)","Пятница","Ячейка","Школа ученичества","Школа ППО"];

// ─── useIsMobile hook ─────────────────────────────────────────────────────────
function useIsMobile() {
  const [m, setM] = useState(window.innerWidth <= 768);
  useEffect(() => { const h = () => setM(window.innerWidth<=768); window.addEventListener("resize",h); return ()=>window.removeEventListener("resize",h); },[]);
  return m;
}

// ─── Global styles ────────────────────────────────────────────────────────────
const G = `*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}body{margin:0;padding:0;overflow-x:hidden;}`;
const INP = { width:"100%", padding:"10px 14px", border:"1.5px solid #e2e8f0", borderRadius:10, fontSize:14, outline:"none", boxSizing:"border-box", background:"#fafafa", color:"#1e293b" };

// ─── UI Components ────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color="#4F46E5", small }) {
  return (
    <div style={{ background:"#fff", borderRadius:14, padding:small?"12px 14px":"16px 18px", boxShadow:"0 2px 10px rgba(0,0,0,0.07)", borderLeft:`4px solid ${color}`, display:"flex", alignItems:"center", gap:12 }}>
      <div style={{ fontSize:small?26:32 }}>{icon}</div>
      <div>
        <div style={{ fontSize:small?20:26, fontWeight:800, color:"#1e293b", lineHeight:1 }}>{value}</div>
        <div style={{ fontSize:small?11:12, color:"#64748b", marginTop:3, fontWeight:500 }}>{label}</div>
      </div>
    </div>
  );
}

function Badge({ color, label }) {
  const m = { green:"#d1fae5:#065f46", blue:"#dbeafe:#1e40af", yellow:"#fef3c7:#92400e", red:"#fee2e2:#991b1b", gray:"#f1f5f9:#475569" };
  const [bg,tx] = (m[color]||m.gray).split(":");
  return <span style={{ background:bg, color:tx, fontSize:11, fontWeight:700, padding:"2px 9px", borderRadius:99, whiteSpace:"nowrap" }}>{label}</span>;
}

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16, overflowY:"auto" }}>
      <div style={{ background:"#fff", borderRadius:20, width:"100%", maxWidth:560, maxHeight:"92vh", overflow:"auto", boxShadow:"0 24px 60px rgba(0,0,0,0.25)" }}>
        <div style={{ padding:"18px 20px", borderBottom:"1px solid #f1f5f9", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:"#fff", zIndex:1 }}>
          <h3 style={{ margin:0, fontSize:17, fontWeight:700 }}>{title}</h3>
          <button onClick={onClose} style={{ border:"none", background:"#f1f5f9", borderRadius:8, width:32, height:32, cursor:"pointer", fontSize:17, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        </div>
        <div style={{ padding:20 }}>{children}</div>
      </div>
    </div>
  );
}

function FF({ label, children, required }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:5 }}>{label}{required&&<span style={{ color:"#ef4444" }}> *</span>}</label>
      {children}
    </div>
  );
}

// ─── СЧЁТЧИК ─────────────────────────────────────────────────────────────────
function VisitorCounter({ people, attendance, onSave, onClose, isMobile }) {
  const [count, setCount] = useState(0);
  const [maxCount, setMaxCount] = useState(0);
  const [totalIn, setTotalIn] = useState(0);
  const [log, setLog] = useState([]);
  const [svc, setSvc] = useState("Воскресное служение");
  const [showModal, setShowModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const [svcDate, setSvcDate] = useState(new Date().toISOString().slice(0,10));
  const [extra, setExtra] = useState({ flyers:"", saved_count:"", registered_aid:"", baptisms:"", discipleship:"", ppo:"" });

  const hit = (dir) => {
    const nc = dir==="in" ? count+1 : Math.max(0,count-1);
    const ni = dir==="in" ? totalIn+1 : totalIn;
    setCount(nc); setTotalIn(ni);
    if (nc>maxCount) setMaxCount(nc);
    setLog(l => [{ time:new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"}), dir, count:nc, id:Date.now() }, ...l].slice(0,15));
    setSaved(false);
  };

  const reset = () => { if (!confirm("Сбросить?")) return; setCount(0); setMaxCount(0); setTotalIn(0); setLog([]); setSaved(false); };

  const doSave = () => {
    onSave({ week:getWeek(svcDate), date:svcDate, visitors:totalIn, flyers:+extra.flyers||0, saved:+extra.saved_count||0, registeredAid:+extra.registered_aid||0, baptisms:+extra.baptisms||0, discipleship:svc==="Школа ученичества"?totalIn:(+extra.discipleship||0), ppo:svc==="Школа ППО"?totalIn:(+extra.ppo||0) });
    setShowModal(false); setSaved(true);
    if (onClose) onClose();
  };

  const todayAtt = attendance.filter(a=>a.date===new Date().toISOString().slice(0,10)&&a.signed).length;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
      {/* Главный блок */}
      <div style={{ background:"linear-gradient(135deg,#1e1b4b,#4338ca)", borderRadius:16, padding:"16px 18px", color:"#fff" }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, opacity:.7, textTransform:"uppercase", marginBottom:3 }}>Сегодня</div>
        <div style={{ fontSize:13, fontWeight:600, marginBottom:8, opacity:.9 }}>{svc}</div>
        <div style={{ fontSize:56, fontWeight:900, lineHeight:1, textAlign:"center" }}>{count}</div>
        <div style={{ fontSize:12, textAlign:"center", opacity:.7, marginTop:3 }}>человек в зале</div>
        <div style={{ display:"flex", justifyContent:"space-around", marginTop:10, paddingTop:10, borderTop:"1px solid rgba(255,255,255,0.15)" }}>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:20, fontWeight:800 }}>{totalIn}</div><div style={{ fontSize:10, opacity:.7 }}>вошло</div></div>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:20, fontWeight:800 }}>{maxCount}</div><div style={{ fontSize:10, opacity:.7 }}>максимум</div></div>
          <div style={{ textAlign:"center" }}><div style={{ fontSize:20, fontWeight:800 }}>{todayAtt}</div><div style={{ fontSize:10, opacity:.7 }}>в CRM</div></div>
        </div>
      </div>

      <input type="date" value={svcDate} onChange={e=>setSvcDate(e.target.value)} style={{ ...INP, fontSize:14 }} />
      <select value={svc} onChange={e=>setSvc(e.target.value)} style={{ ...INP, fontSize:14 }}>
        {SERVICES.map(s=><option key={s}>{s}</option>)}
      </select>

      {/* +/- кнопки */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <button onClick={()=>hit("in")} style={{ background:"#10B981", color:"#fff", border:"none", borderRadius:16, padding:"22px 0", fontSize:32, cursor:"pointer", fontWeight:900, boxShadow:"0 4px 14px rgba(16,185,129,0.4)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <span>+</span><span style={{ fontSize:11, fontWeight:700, opacity:.9 }}>ВОШЁЛ</span>
        </button>
        <button onClick={()=>hit("out")} style={{ background:"#f97316", color:"#fff", border:"none", borderRadius:16, padding:"22px 0", fontSize:32, cursor:"pointer", fontWeight:900, boxShadow:"0 4px 14px rgba(249,115,22,0.4)", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
          <span>−</span><span style={{ fontSize:11, fontWeight:700, opacity:.9 }}>ВЫШЕЛ</span>
        </button>
      </div>

      {/* Сохранить */}
      <button onClick={()=>setShowModal(true)} style={{ background:saved?"#d1fae5":"linear-gradient(135deg,#4F46E5,#7C3AED)", color:saved?"#065f46":"#fff", border:"none", borderRadius:14, padding:15, fontWeight:800, cursor:"pointer", fontSize:15, boxShadow:saved?"none":"0 4px 14px rgba(79,70,229,0.4)" }}>
        {saved ? "✅ Сохранено!" : "💾 Сохранить итог служения"}
      </button>
      <button onClick={reset} style={{ background:"#f1f5f9", border:"none", borderRadius:10, padding:10, cursor:"pointer", fontWeight:700, fontSize:13, color:"#64748b" }}>
        🔄 Сбросить счётчик
      </button>

      {/* Лог */}
      {log.length>0 && (
        <div style={{ background:"#fff", borderRadius:12, padding:"11px 13px", boxShadow:"0 1px 6px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#64748b", marginBottom:7, textTransform:"uppercase", letterSpacing:1 }}>Последние движения</div>
          {log.slice(0,6).map(e=>(
            <div key={e.id} style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, marginBottom:4 }}>
              <span>{e.dir==="in"?"🟢":"🔴"}</span>
              <span style={{ color:"#64748b" }}>{e.time}</span>
              <span style={{ color:e.dir==="in"?"#10B981":"#f97316", fontWeight:600 }}>{e.dir==="in"?"вошёл":"вышел"}</span>
              <span style={{ marginLeft:"auto", fontWeight:800, color:"#1e293b" }}>{e.count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Модал сохранения */}
      {showModal && (
        <Modal title="💾 Сохранить итог" onClose={()=>setShowModal(false)}>
          <div style={{ background:"linear-gradient(135deg,#1e1b4b,#4338ca)", borderRadius:14, padding:16, color:"#fff", marginBottom:18 }}>
            <div style={{ fontSize:13, fontWeight:600, opacity:.8, marginBottom:8 }}>{svc} · {svcDate}</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, textAlign:"center" }}>
              <div><div style={{ fontSize:26, fontWeight:900 }}>{totalIn}</div><div style={{ fontSize:10, opacity:.7 }}>вошло</div></div>
              <div><div style={{ fontSize:26, fontWeight:900 }}>{maxCount}</div><div style={{ fontSize:10, opacity:.7 }}>максимум</div></div>
              <div><div style={{ fontSize:26, fontWeight:900 }}>{count}</div><div style={{ fontSize:10, opacity:.7 }}>в зале</div></div>
            </div>
          </div>
          <p style={{ fontSize:13, color:"#64748b", marginBottom:14 }}>Дополни данные служения:</p>
          {[["flyers","📋 Роздано флаеров"],["saved_count","✝️ Приняли Иисуса"],["registered_aid","🎁 Записалось на помощь"],["baptisms","💧 Крестилось"],["discipleship","📖 Школа ученичества"],["ppo","🕊️ Школа ППО"]].map(([k,lbl])=>(
            <div key={k} style={{ marginBottom:10 }}>
              <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#374151", marginBottom:3 }}>{lbl}</label>
              <input type="number" min="0" placeholder="0" value={extra[k]} onChange={e=>setExtra(f=>({...f,[k]:e.target.value}))} style={{ ...INP, fontSize:20, fontWeight:700, textAlign:"center" }} />
            </div>
          ))}
          <div style={{ display:"flex", gap:10, marginTop:12 }}>
            <button onClick={()=>setShowModal(false)} style={{ flex:1, padding:12, border:"1.5px solid #e2e8f0", borderRadius:10, background:"#fff", cursor:"pointer", fontWeight:600 }}>Отмена</button>
            <button onClick={doSave} style={{ flex:2, padding:12, background:"#4F46E5", color:"#fff", border:"none", borderRadius:10, fontWeight:800, cursor:"pointer", fontSize:15 }}>✅ Сохранить</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ people, attendance, metrics, isMobile }) {
  const tF=metrics.reduce((s,m)=>s+(m.flyers||0),0);
  const tV=metrics.reduce((s,m)=>s+(m.visitors||0),0);
  const tS=metrics.reduce((s,m)=>s+(m.saved||0),0);
  const tB=metrics.reduce((s,m)=>s+(m.baptisms||0),0);
  const rA=people.filter(p=>p.registeredAid).length;
  const ds=people.filter(p=>p.discipleship).length;
  const pp=people.filter(p=>p.ppo).length;
  const aM=people.filter(p=>getStats(p.id,attendance).qualifiedWeeks>=3).length;
  const cd=metrics.slice(-6).map(m=>({ week:`Н${m.week?.split("-W")[1]||""}`, "Посетители":m.visitors, "Спасено":m.saved, "Крещения":m.baptisms }));
  const cd2=metrics.slice(-6).map(m=>({ week:`Н${m.week?.split("-W")[1]||""}`, "Флаеры":m.flyers, "Посетители":m.visitors }));
  const pd=[{name:"Посетители",value:tV},{name:"Спасено",value:tS},{name:"Крещены",value:tB},{name:"Помощь",value:rA}];

  return (
    <div style={{ paddingBottom:isMobile?80:0 }}>
      <h2 style={{ fontSize:isMobile?18:22, fontWeight:800, color:"#1e293b", marginBottom:4 }}>📊 Дашборд</h2>
      <p style={{ color:"#64748b", marginBottom:14, fontSize:13 }}>Общая картина служения</p>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        <StatCard icon="📋" label="Флаеров роздано" value={tF.toLocaleString()} color="#4F46E5" small />
        <StatCard icon="🙏" label="Посетили" value={tV} color="#10B981" small />
        <StatCard icon="✝️" label="Приняли Иисуса" value={tS} color="#F59E0B" small />
        <StatCard icon="💧" label="Крестилось" value={tB} color="#06B6D4" small />
        <StatCard icon="🎁" label="На помощи" value={rA} color="#8B5CF6" small />
        <StatCard icon="📅" label="Ходят 1+ мес." value={aM} color="#EC4899" small />
        <StatCard icon="📖" label="Ученичество" value={ds} color="#EF4444" small />
        <StatCard icon="🕊️" label="Школа ППО" value={pp} color="#10B981" small />
      </div>

      <div style={{ background:"#fff", borderRadius:16, padding:16, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", marginBottom:14 }}>
        <h3 style={{ margin:"0 0 12px", fontSize:14, fontWeight:700 }}>📈 Динамика</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={cd}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="week" style={{ fontSize:11 }} />
            <YAxis style={{ fontSize:11 }} width={28} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize:11 }} />
            <Line type="monotone" dataKey="Посетители" stroke="#4F46E5" strokeWidth={2} dot={{ r:3 }} />
            <Line type="monotone" dataKey="Спасено" stroke="#10B981" strokeWidth={2} dot={{ r:3 }} />
            <Line type="monotone" dataKey="Крещения" stroke="#06B6D4" strokeWidth={2} dot={{ r:3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background:"#fff", borderRadius:16, padding:16, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", marginBottom:14 }}>
        <h3 style={{ margin:"0 0 12px", fontSize:14, fontWeight:700 }}>📊 Флаеры и посещения</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={cd2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="week" style={{ fontSize:11 }} />
            <YAxis style={{ fontSize:11 }} width={28} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize:11 }} />
            <Bar dataKey="Флаеры" fill="#4F46E5" radius={[4,4,0,0]} />
            <Bar dataKey="Посетители" fill="#10B981" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div style={{ background:"#fff", borderRadius:16, padding:16, boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
        <h3 style={{ margin:"0 0 12px", fontSize:14, fontWeight:700 }}>🥧 Конверсия</h3>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={pd} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({value})=>value}>
              {pd.map((_,i)=><Cell key={i} fill={COLORS[i]} />)}
            </Pie>
            <Tooltip /><Legend wrapperStyle={{ fontSize:11 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── ЛЮДИ ─────────────────────────────────────────────────────────────────────
function PeopleList({ people, attendance, onAdd, onEdit, onDelete, isMobile }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const fl = people.filter(p => {
    const q=search.toLowerCase(), m=p.name?.toLowerCase().includes(q)||p.phone?.includes(q);
    if (filter==="aid") return m&&p.registeredAid;
    if (filter==="discipleship") return m&&p.discipleship;
    if (filter==="baptized") return m&&p.baptized;
    return m;
  });

  return (
    <div style={{ paddingBottom:isMobile?80:0 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14, gap:10 }}>
        <h2 style={{ fontSize:isMobile?18:22, fontWeight:800, color:"#1e293b", margin:0 }}>👥 Люди</h2>
        <button onClick={onAdd} style={{ background:"#4F46E5", color:"#fff", border:"none", borderRadius:12, padding:"10px 20px", fontWeight:700, cursor:"pointer", fontSize:14, flexShrink:0 }}>+ Добавить</button>
      </div>
      <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍 Поиск..." style={{ ...INP, marginBottom:10 }} />
      <div style={{ display:"flex", gap:8, marginBottom:14, overflowX:"auto", paddingBottom:4 }}>
        {[["all","Все"],["aid","Помощь"],["discipleship","Ученичество"],["baptized","Крещёные"]].map(([f,l])=>(
          <button key={f} onClick={()=>setFilter(f)} style={{ padding:"8px 14px", borderRadius:10, border:"1.5px solid", borderColor:filter===f?"#4F46E5":"#e2e8f0", background:filter===f?"#4F46E5":"#fff", color:filter===f?"#fff":"#64748b", fontWeight:600, cursor:"pointer", fontSize:12, whiteSpace:"nowrap", flexShrink:0 }}>{l}</button>
        ))}
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {fl.map(p => {
          const st=getStats(p.id,attendance), el=eligible(p.id,attendance);
          return (
            <div key={p.id} style={{ background:"#fff", borderRadius:16, padding:16, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", border:"1.5px solid #f1f5f9" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:44, height:44, borderRadius:"50%", background:"linear-gradient(135deg,#4F46E5,#8B5CF6)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:18, flexShrink:0 }}>{p.name?.charAt(0)}</div>
                  <div><div style={{ fontWeight:700, fontSize:15 }}>{p.name}</div><div style={{ fontSize:12, color:"#64748b" }}>{p.phone}</div></div>
                </div>
                <div style={{ display:"flex", gap:6, flexShrink:0 }}>
                  <button onClick={()=>onEdit(p)} style={{ background:"#f1f5f9", border:"none", borderRadius:8, width:34, height:34, cursor:"pointer", fontSize:16 }}>✏️</button>
                  <button onClick={()=>onDelete(p.id)} style={{ background:"#fee2e2", border:"none", borderRadius:8, width:34, height:34, cursor:"pointer", fontSize:16 }}>🗑️</button>
                </div>
              </div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:10 }}>
                {p.registeredAid&&<Badge color="blue" label="🎁 Помощь"/>}
                {p.baptized&&<Badge color="blue" label="💧 Крещён"/>}
                {p.discipleship&&<Badge color="green" label="📖 Ученичество"/>}
                {p.ppo&&<Badge color="yellow" label="🕊️ ППО"/>}
                {p.savedDate&&<Badge color="green" label="✝️ Спасён"/>}
                {el?<Badge color="green" label="✅ Право на помощь"/>:<Badge color="red" label="❌ Нет права"/>}
              </div>
              <div style={{ background:"#f8fafc", borderRadius:10, padding:"9px 12px", fontSize:13 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ color:"#64748b" }}>Посещений:</span><span style={{ fontWeight:700 }}>{st.total}</span></div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ color:"#64748b" }}>Недель с 2+:</span><span style={{ fontWeight:700, color:st.qualifiedWeeks>=1?"#10B981":"#ef4444" }}>{st.qualifiedWeeks}</span></div>
                <div style={{ display:"flex", justifyContent:"space-between" }}><span style={{ color:"#64748b" }}>С нами с:</span><span style={{ fontWeight:600 }}>{fmtDate(p.joinDate)}</span></div>
              </div>
              {p.notes&&<div style={{ marginTop:8, fontSize:12, color:"#64748b", fontStyle:"italic" }}>💬 {p.notes}</div>}
            </div>
          );
        })}
      </div>
      {fl.length===0&&<div style={{ textAlign:"center", padding:40, color:"#94a3b8" }}>Никого не найдено</div>}
    </div>
  );
}

// ─── ФОРМА ЧЕЛОВЕКА ───────────────────────────────────────────────────────────
function PersonForm({ person, onSave, onClose }) {
  const [form, setForm] = useState(person||{ name:"", phone:"", address:"", joinDate:new Date().toISOString().slice(0,10), notes:"", registeredAid:false, baptized:false, discipleship:false, ppo:false, savedDate:"" });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  return (
    <form onSubmit={e=>{ e.preventDefault(); onSave(form); }}>
      <FF label="Имя и фамилия" required><input style={INP} value={form.name} onChange={e=>set("name",e.target.value)} required /></FF>
      <FF label="Телефон"><input style={INP} value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="+380..." /></FF>
      <FF label="Адрес"><input style={INP} value={form.address} onChange={e=>set("address",e.target.value)} /></FF>
      <FF label="Дата прихода"><input style={INP} type="date" value={form.joinDate} onChange={e=>set("joinDate",e.target.value)} /></FF>
      <FF label="Дата принятия Иисуса"><input style={INP} type="date" value={form.savedDate} onChange={e=>set("savedDate",e.target.value)} /></FF>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:14 }}>
        {[["registeredAid","🎁 Помощь"],["baptized","💧 Крещён"],["discipleship","📖 Ученичество"],["ppo","🕊️ ППО"]].map(([k,lbl])=>(
          <label key={k} style={{ display:"flex", alignItems:"center", gap:8, background:"#f8fafc", borderRadius:10, padding:"10px 12px", cursor:"pointer", fontWeight:600, fontSize:13 }}>
            <input type="checkbox" checked={!!form[k]} onChange={e=>set(k,e.target.checked)} style={{ width:16, height:16 }} />{lbl}
          </label>
        ))}
      </div>
      <FF label="Заметки"><textarea style={{ ...INP, height:65, resize:"vertical" }} value={form.notes} onChange={e=>set("notes",e.target.value)} /></FF>
      <div style={{ display:"flex", gap:9 }}>
        <button type="button" onClick={onClose} style={{ flex:1, padding:12, border:"1.5px solid #e2e8f0", borderRadius:10, background:"#fff", cursor:"pointer", fontWeight:600 }}>Отмена</button>
        <button type="submit" style={{ flex:2, padding:12, background:"#4F46E5", color:"#fff", border:"none", borderRadius:10, fontWeight:700, cursor:"pointer" }}>Сохранить</button>
      </div>
    </form>
  );
}

// ─── КАРТОЧКИ ПОСЕЩАЕМОСТИ ────────────────────────────────────────────────────
function AttendanceCards({ people, attendance, onSign, isMobile }) {
  const [sel, setSel] = useState(null);
  const [showSign, setShowSign] = useState(false);
  const [sf, setSf] = useState({ date:new Date().toISOString().slice(0,10), service:"Воскресное служение", signedBy:"" });
  const aidP = people.filter(p=>p.registeredAid);
  const person = people.find(p=>p.id===sel);

  const getWeeks = pid => {
    const att=attendance.filter(a=>a.personId===pid), w={};
    att.forEach(a=>{ const k=getWeek(a.date); if(!w[k])w[k]=[]; w[k].push(a); });
    return Object.entries(w).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,8);
  };

  if (sel && person) {
    const wks=getWeeks(sel), el=eligible(sel,attendance), st=getStats(sel,attendance);
    return (
      <div style={{ paddingBottom:isMobile?80:0 }}>
        <button onClick={()=>setSel(null)} style={{ background:"#f1f5f9", border:"none", borderRadius:10, padding:"8px 16px", cursor:"pointer", fontWeight:600, marginBottom:14, fontSize:13 }}>← Назад</button>
        <div style={{ background:"#fff", borderRadius:20, padding:18, boxShadow:"0 4px 24px rgba(0,0,0,0.10)", border:"2px solid #e2e8f0" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16, flexWrap:"wrap", gap:8 }}>
            <div>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:2, color:"#8B5CF6", textTransform:"uppercase", marginBottom:3 }}>Карточка посещаемости</div>
              <div style={{ fontSize:18, fontWeight:800 }}>{person.name}</div>
              <div style={{ fontSize:12, color:"#64748b", marginTop:2 }}>{person.phone}</div>
            </div>
            {el ? <div style={{ background:"#d1fae5", color:"#065f46", padding:"8px 14px", borderRadius:12, fontWeight:800, fontSize:12 }}>✅ ПРАВО НА ПОМОЩЬ</div>
                : <div style={{ background:"#fee2e2", color:"#991b1b", padding:"8px 14px", borderRadius:12, fontWeight:800, fontSize:12 }}>❌ НЕТ ПРАВА</div>}
          </div>
          <div style={{ background:"#f8fafc", borderRadius:12, padding:13, marginBottom:14, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, textAlign:"center" }}>
            <div><div style={{ fontSize:22, fontWeight:800, color:"#4F46E5" }}>{st.total}</div><div style={{ fontSize:11, color:"#64748b" }}>Всего</div></div>
            <div><div style={{ fontSize:22, fontWeight:800, color:"#10B981" }}>{st.qualifiedWeeks}</div><div style={{ fontSize:11, color:"#64748b" }}>Недель 2+</div></div>
            <div><div style={{ fontSize:22, fontWeight:800, color:"#F59E0B" }}>{st.totalWeeks}</div><div style={{ fontSize:11, color:"#64748b" }}>Всего нед.</div></div>
          </div>
          <div style={{ marginBottom:14 }}>
            {wks.length===0&&<div style={{ color:"#94a3b8", textAlign:"center", padding:16, fontSize:13 }}>Посещений пока нет</div>}
            {wks.map(([week,records])=>{ const q=records.length>=2; return (
              <div key={week} style={{ background:q?"#f0fdf4":"#fff7ed", border:`1.5px solid ${q?"#bbf7d0":"#fed7aa"}`, borderRadius:12, padding:"10px 13px", marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
                  <div style={{ fontWeight:700, fontSize:13 }}>Нед. {week}</div>
                  <Badge color={q?"green":"yellow"} label={q?`✅ ${records.length}/2`:`⚠️ ${records.length}/2`} />
                </div>
                {records.map(r=>(
                  <div key={r.id} style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:6, padding:"4px 0", borderTop:"1px solid rgba(0,0,0,0.05)", fontSize:12 }}>
                    <span>✍️</span><span>{fmtDate(r.date)}</span><span style={{ color:"#64748b" }}>{r.service}</span>
                    <span style={{ marginLeft:"auto", color:"#94a3b8", fontStyle:"italic" }}>{r.signedBy||"—"}</span>
                  </div>
                ))}
              </div>
            );})}
          </div>
          <button onClick={()=>setShowSign(true)} style={{ width:"100%", background:"#4F46E5", color:"#fff", border:"none", borderRadius:12, padding:14, fontWeight:800, cursor:"pointer", fontSize:15 }}>✍️ Отметить посещение</button>
        </div>
        {showSign&&(
          <Modal title="✍️ Отметить посещение" onClose={()=>setShowSign(false)}>
            <div style={{ background:"#f0f9ff", borderRadius:12, padding:13, marginBottom:16, fontSize:13 }}><strong>{person.name}</strong></div>
            <FF label="Дата" required><input style={INP} type="date" value={sf.date} onChange={e=>setSf(f=>({...f,date:e.target.value}))} /></FF>
            <FF label="Тип служения"><select style={INP} value={sf.service} onChange={e=>setSf(f=>({...f,service:e.target.value}))}>{SERVICES.map(s=><option key={s}>{s}</option>)}</select></FF>
            <FF label="Кто подписывает"><input style={INP} value={sf.signedBy} onChange={e=>setSf(f=>({...f,signedBy:e.target.value}))} placeholder="Имя пастора..." /></FF>
            <div style={{ display:"flex", gap:9 }}>
              <button onClick={()=>setShowSign(false)} style={{ flex:1, padding:12, border:"1.5px solid #e2e8f0", borderRadius:10, background:"#fff", cursor:"pointer", fontWeight:600 }}>Отмена</button>
              <button onClick={()=>{ onSign({personId:sel,...sf,signed:true,id:`a${Date.now()}`}); setShowSign(false); }} style={{ flex:2, padding:12, background:"#10B981", color:"#fff", border:"none", borderRadius:10, fontWeight:800, cursor:"pointer" }}>✅ Подтвердить</button>
            </div>
          </Modal>
        )}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom:isMobile?80:0 }}>
      <h2 style={{ fontSize:isMobile?18:22, fontWeight:800, color:"#1e293b", marginBottom:8 }}>📋 Карточки посещаемости</h2>
      <div style={{ background:"#fef9c3", border:"1.5px solid #fde047", borderRadius:12, padding:"11px 15px", marginBottom:16, fontSize:13, color:"#713f12" }}>
        ℹ️ <strong>Условие:</strong> 2 посещения в неделю = право на помощь
      </div>
      <div style={{ display:"grid", gridTemplateColumns:isMobile?"1fr":"repeat(auto-fill,minmax(250px,1fr))", gap:12 }}>
        {aidP.map(p=>{ const el=eligible(p.id,attendance), st=getStats(p.id,attendance); return (
          <div key={p.id} onClick={()=>setSel(p.id)} style={{ background:"#fff", borderRadius:16, padding:16, boxShadow:"0 2px 12px rgba(0,0,0,0.07)", border:`2px solid ${el?"#bbf7d0":"#fee2e2"}`, cursor:"pointer" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
              <div style={{ width:44, height:44, borderRadius:"50%", background:el?"linear-gradient(135deg,#10B981,#059669)":"linear-gradient(135deg,#f97316,#ef4444)", display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:800, fontSize:18, flexShrink:0 }}>{p.name?.charAt(0)}</div>
              <div><div style={{ fontWeight:700, fontSize:15 }}>{p.name}</div><div style={{ fontSize:12, color:"#64748b" }}>{p.phone}</div></div>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:4 }}><span style={{ color:"#64748b" }}>Посещений:</span><span style={{ fontWeight:700 }}>{st.total}</span></div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:10 }}><span style={{ color:"#64748b" }}>Недель с 2+:</span><span style={{ fontWeight:700, color:el?"#10B981":"#ef4444" }}>{st.qualifiedWeeks}</span></div>
            <div style={{ textAlign:"center", padding:8, borderRadius:10, background:el?"#d1fae5":"#fee2e2", fontWeight:800, fontSize:12, color:el?"#065f46":"#991b1b" }}>{el?"✅ ПРАВО НА ПОМОЩЬ":"❌ НЕТ ПРАВА"}</div>
          </div>
        );})}
        {aidP.length===0&&<div style={{ textAlign:"center", padding:36, color:"#94a3b8" }}>Нет людей, записанных на помощь</div>}
      </div>
    </div>
  );
}

// ─── ПОКАЗАТЕЛИ ───────────────────────────────────────────────────────────────
function MetricsInput({ metrics, onAdd, isMobile }) {
  const [form, setForm] = useState({ week:getWeek(new Date().toISOString()), date:new Date().toISOString().slice(0,10), flyers:"", visitors:"", saved:"", registeredAid:"", baptisms:"", discipleship:"", ppo:"" });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const fields = [["flyers","📋 Роздано флаеров"],["visitors","🙏 Посетили служение"],["saved","✝️ Приняли Иисуса"],["registeredAid","🎁 Записалось на помощь"],["baptisms","💧 Крестилось"],["discipleship","📖 Школа ученичества"],["ppo","🕊️ Школа ППО"]];

  return (
    <div style={{ paddingBottom:isMobile?80:0 }}>
      <h2 style={{ fontSize:isMobile?18:22, fontWeight:800, color:"#1e293b", marginBottom:4 }}>📥 Внести показатели</h2>
      <p style={{ color:"#64748b", marginBottom:14, fontSize:13 }}>Еженедельный ввод данных</p>
      <div style={{ background:"#fff", borderRadius:20, padding:18, boxShadow:"0 2px 12px rgba(0,0,0,0.07)" }}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
          <FF label="Дата" required><input style={INP} type="date" value={form.date} onChange={e=>set("date",e.target.value)} /></FF>
          <FF label="Неделя"><input style={INP} value={form.week} onChange={e=>set("week",e.target.value)} /></FF>
        </div>
        {fields.map(([key,label])=>(
          <div key={key} style={{ marginBottom:12 }}>
            <label style={{ display:"block", fontSize:13, fontWeight:700, color:"#374151", marginBottom:4 }}>{label}</label>
            <input style={{ ...INP, fontSize:22, fontWeight:700, textAlign:"center" }} type="number" min="0" value={form[key]} onChange={e=>set(key,e.target.value)} placeholder="0" />
          </div>
        ))}
        <button onClick={()=>{ onAdd(form); setForm(f=>({...f,flyers:"",visitors:"",saved:"",registeredAid:"",baptisms:"",discipleship:"",ppo:""})); }} style={{ width:"100%", background:"#4F46E5", color:"#fff", border:"none", borderRadius:12, padding:14, fontWeight:800, fontSize:15, cursor:"pointer" }}>💾 Сохранить показатели</button>
      </div>
      {metrics.length>0&&(
        <div style={{ marginTop:16 }}>
          <h3 style={{ fontWeight:700, marginBottom:8, fontSize:14 }}>📋 Последние записи</h3>
          {[...metrics].reverse().slice(0,4).map(m=>(
            <div key={m.id} style={{ background:"#fff", borderRadius:12, padding:"11px 14px", marginBottom:8, boxShadow:"0 1px 6px rgba(0,0,0,0.05)", fontSize:12 }}>
              <div style={{ fontWeight:700, marginBottom:4 }}>{m.week} · {fmtDate(m.date)}</div>
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

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [people, setPeople] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editPerson, setEditPerson] = useState(null);
  const [toast, setToast] = useState(null);
  const [showCounter, setShowCounter] = useState(false);
  const isMobile = useIsMobile();

  const showToast = (msg, color="#10B981") => { setToast({msg,color}); setTimeout(()=>setToast(null),3000); };

  useEffect(()=>{
    (async()=>{
      const [p,a,m] = await Promise.all([load(KEYS.people),load(KEYS.attendance),load(KEYS.metrics)]);
      setPeople(p||SEED_PEOPLE); setAttendance(a||SEED_ATTENDANCE); setMetrics(m||SEED_METRICS);
      setLoading(false);
    })();
  },[]);

  const savePerson = useCallback(async(form)=>{
    const next = form.id ? people.map(p=>p.id===form.id?form:p) : [...people,{...form,id:`p${Date.now()}`}];
    setPeople(next); await save(KEYS.people,next); setModal(null); setEditPerson(null); showToast("✅ Сохранено");
  },[people]);

  const deletePerson = useCallback(async(id)=>{
    if(!confirm("Удалить?"))return;
    const next=people.filter(p=>p.id!==id); setPeople(next); await save(KEYS.people,next); showToast("🗑️ Удалено","#ef4444");
  },[people]);

  const signAttendance = useCallback(async(rec)=>{
    const next=[...attendance,rec]; setAttendance(next); await save(KEYS.attendance,next); showToast("✅ Посещение отмечено!");
  },[attendance]);

  const addMetrics = useCallback(async(form)=>{
    const rec={id:`m${Date.now()}`,...form,flyers:+form.flyers||0,visitors:+form.visitors||0,saved:+form.saved||0,registeredAid:+form.registeredAid||0,baptisms:+form.baptisms||0,discipleship:+form.discipleship||0,ppo:+form.ppo||0};
    const next=[...metrics,rec]; setMetrics(next); await save(KEYS.metrics,next); showToast("📊 Показатели сохранены!");
  },[metrics]);

  const TABS = [
    {id:"dashboard",icon:"📊",label:"Дашборд"},
    {id:"people",icon:"👥",label:"Люди"},
    {id:"attendance",icon:"📋",label:"Карточки"},
    {id:"metrics",icon:"📥",label:"Данные"},
  ];

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f8fafc" }}>
      <div style={{ textAlign:"center" }}><div style={{ fontSize:48, marginBottom:14 }}>⛪</div><div style={{ fontSize:18, fontWeight:700, color:"#4F46E5" }}>Загрузка...</div></div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#f8fafc", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <style>{G}</style>

      {/* HEADER */}
      <div style={{ background:"linear-gradient(135deg,#1e1b4b,#312e81)", color:"#fff", padding:"0 16px", position:"sticky", top:0, zIndex:200 }}>
        <div style={{ maxWidth:1400, margin:"0 auto" }}>
          <div style={{ padding:"12px 0", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ fontSize:22 }}>⛪</div>
            <div><div style={{ fontWeight:800, fontSize:16 }}>Church CRM</div></div>
            <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:8 }}>
              {!isMobile && <span style={{ fontSize:12, opacity:.7 }}>👥 {people.length} · 📋 {attendance.filter(a=>a.signed).length}</span>}
              {/* Кнопка счётчика на мобиле */}
              {isMobile && (
                <button onClick={()=>setShowCounter(true)} style={{ background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.3)", borderRadius:10, padding:"7px 12px", color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer" }}>
                  📡 Счётчик
                </button>
              )}
            </div>
          </div>
          {/* Табы */}
          <div style={{ display:"flex" }}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{ flex:isMobile?1:undefined, background:"none", border:"none", color:tab===t.id?"#fff":"rgba(255,255,255,0.6)", padding:isMobile?"10px 4px":"12px 18px", cursor:"pointer", fontWeight:tab===t.id?700:500, fontSize:isMobile?10:13, borderBottom:tab===t.id?"3px solid #818cf8":"3px solid transparent", display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                <span style={{ fontSize:isMobile?20:14 }}>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{ maxWidth:1400, margin:"0 auto", padding:isMobile?12:20, display:"grid", gridTemplateColumns:isMobile?"1fr":"1fr 290px", gap:20, alignItems:"start" }}>
        <div>
          {tab==="dashboard" && <Dashboard people={people} attendance={attendance} metrics={metrics} isMobile={isMobile} />}
          {tab==="people" && <PeopleList people={people} attendance={attendance} onAdd={()=>{ setEditPerson(null); setModal("person"); }} onEdit={p=>{ setEditPerson(p); setModal("person"); }} onDelete={deletePerson} isMobile={isMobile} />}
          {tab==="attendance" && <AttendanceCards people={people} attendance={attendance} onSign={signAttendance} isMobile={isMobile} />}
          {tab==="metrics" && <MetricsInput metrics={metrics} onAdd={addMetrics} isMobile={isMobile} />}
        </div>

        {/* Правая панель — только десктоп */}
        {!isMobile && (
          <div style={{ position:"sticky", top:80 }}>
            <div style={{ background:"#fff", borderRadius:20, padding:18, boxShadow:"0 4px 20px rgba(0,0,0,0.10)", border:"1.5px solid #e2e8f0" }}>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:2, color:"#8B5CF6", textTransform:"uppercase", marginBottom:12 }}>📡 Счётчик посетителей</div>
              <VisitorCounter people={people} attendance={attendance} onSave={addMetrics} isMobile={false} />
            </div>
          </div>
        )}
      </div>

      {/* Счётчик на мобиле — bottom sheet */}
      {isMobile && showCounter && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:300, display:"flex", alignItems:"flex-end" }} onClick={e=>{ if(e.target===e.currentTarget) setShowCounter(false); }}>
          <div style={{ background:"#fff", borderRadius:"20px 20px 0 0", padding:"20px 16px", width:"100%", maxHeight:"92vh", overflow:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <div style={{ fontSize:13, fontWeight:800, color:"#8B5CF6", textTransform:"uppercase", letterSpacing:1 }}>📡 Счётчик посетителей</div>
              <button onClick={()=>setShowCounter(false)} style={{ background:"#f1f5f9", border:"none", borderRadius:8, width:34, height:34, cursor:"pointer", fontSize:18 }}>✕</button>
            </div>
            <VisitorCounter people={people} attendance={attendance} onSave={(form)=>{ addMetrics(form); }} isMobile={true} />
          </div>
        </div>
      )}

      {/* Модал добавления человека */}
      {modal==="person" && (
        <Modal title={editPerson?"✏️ Редактировать":"➕ Новый человек"} onClose={()=>{ setModal(null); setEditPerson(null); }}>
          <PersonForm person={editPerson} onSave={savePerson} onClose={()=>{ setModal(null); setEditPerson(null); }} />
        </Modal>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position:"fixed", bottom:isMobile?90:20, left:"50%", transform:"translateX(-50%)", background:toast.color, color:"#fff", padding:"12px 24px", borderRadius:12, fontWeight:700, fontSize:14, boxShadow:"0 8px 24px rgba(0,0,0,0.2)", zIndex:2000, whiteSpace:"nowrap" }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
