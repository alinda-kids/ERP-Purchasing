import { useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ============================================================
// CONFIG — ใส่ API Key ใหม่ที่ Gen แล้วตรงนี้
// ============================================================
const SHEET_ID = "1blB8MYJG8xpHeP3Nqn32rfpP7OIsmMlpKZw9ZLOsCSY";
const API_KEY  = "YOUR_NEW_API_KEY_HERE"; // ← ใส่ API Key ใหม่ที่ Gen แล้วตรงนี้

const TABS = {
  Taobao: "Taobao",
  "1688":  "1688",
};

// ============================================================
// COLORS
// ============================================================
const C = {
  bg: "#F7F8FA", surface: "#FFFFFF",
  primary: "#1A3C6B", primaryLight: "#E8EFF8",
  tb: "#E8472A", tbLight: "#FDEEEC",
  s16: "#FF6900", s16Light: "#FFF0E6",
  accent: "#00B578", accentLight: "#E6F9F1",
  warning: "#FF9500", warningLight: "#FFF3E0",
  text: "#0D1117", textSub: "#5C6370", textMuted: "#9EA6B3",
  border: "#E8EAED", nav: "#0D1117",
};

const CAT_META = {
  Climbing:     { color: "#E8472A", bg: "#FDEEEC", icon: "🧗" },
  Sensory:      { color: "#9B59B6", bg: "#F5EEF8", icon: "🌊" },
  Furniture:    { color: "#2980B9", bg: "#EBF5FB", icon: "🪑" },
  Storage:      { color: "#27AE60", bg: "#EAFAF1", icon: "📦" },
  Educational:  { color: "#F39C12", bg: "#FEF9E7", icon: "📚" },
  "Play Equip": { color: "#16A085", bg: "#E8F8F5", icon: "🛝" },
  "Mat/Sofa":   { color: "#BDC3C7", bg: "#F2F3F4", icon: "🛋️" },
  Toys:         { color: "#E91E8C", bg: "#FDEEF6", icon: "🧸" },
  Other:        { color: "#95A5A6", bg: "#F8F9F9", icon: "📌" },
};

const STATUS_META = {
  Completed: { color: "#00B578", bg: "#E6F9F1" },
  Shipped:   { color: "#2D6BE4", bg: "#EBF0FD" },
  Arrived:   { color: "#7B61FF", bg: "#F0EDFF" },
  Paid:      { color: "#FF9500", bg: "#FFF3E0" },
};

const fmt = n => new Intl.NumberFormat("th-TH").format(Math.round(n));

// ============================================================
// DATA PARSERS
// ============================================================
function parseTaobao(rows) {
  const orders = [];
  rows.forEach(cols => {
    const oid = cols[0]?.trim();
    if (!oid || oid === "订单号" || oid === "订单编号") return;
    const dateStr = cols[1]?.trim() || "";
    if (!dateStr.startsWith("2026")) return;
    const status = cols[2]?.trim() || "";
    if (["订单状态","交易关闭"].includes(status)) return;
    const shop = cols[3]?.trim() || "";
    const item = cols[4]?.trim() || "";
    const url  = cols[5]?.trim() || "";
    const variant = cols[6]?.trim() || "";
    const qty  = parseInt(cols[7]) || 1;
    const paidStr = cols[9]?.trim() || "0";
    const paid = parseFloat(paidStr.replace(/[￥,]/g,"")) || 0;
    const tracking = cols[12]?.trim() || "";
    if (!item || paid === 0) return;

    const enName = (i) => {
      if (/tuff tray|大黑盘|感官盘/.test(i)) return "Tuff Tray (Sensory) 1m";
      if (/攀岩板/.test(i)) return "Climbing Wall Panel";
      if (/岩点/.test(i)) return "Climbing Holds";
      if (/肋木|引体.*墙/.test(i)) return "Stall Bar / Wall Bar";
      if (/云梯/.test(i)) return "Overhead Ladder";
      if (/攀爬立方/.test(i)) return "Climbing Cube";
      if (/dome/i.test(i)) return "Dome Climber";
      if (/攀爬架.*室内|室内.*攀爬架/.test(i)) return "Indoor Climbing Frame";
      if (/攀爬架.*户外/.test(i)) return "Outdoor Climbing Frame";
      if (/攀爬架/.test(i)) return "Climbing Frame";
      if (/橡胶.*秋千|秋千.*橡胶/.test(i)) return "Rubber Swing Board";
      if (/秋千/.test(i)) return "Swing";
      if (/吊环/.test(i)) return "Gymnastic Rings";
      if (/滑梯/.test(i)) return "Slide";
      if (/积木桌/.test(i)) return "Play/Block Table";
      if (/月亮桌|月牙桌/.test(i)) return "Moon-shaped Table";
      if (/光影|light table/i.test(i)) return "Light Table (Reggio)";
      if (/桌.*幼儿|幼儿.*桌|桌.*儿童|儿童.*桌/.test(i)) return "Kindergarten Table";
      if (/椅.*幼儿|幼儿.*椅/.test(i)) return "Kindergarten Chair";
      if (/餐椅/.test(i)) return "High Chair";
      if (/书架|绘本架/.test(i)) return "Bookshelf";
      if (/玩具柜|收纳柜|教具柜/.test(i)) return "Toy Storage Cabinet";
      if (/收纳架|收纳盒|收纳框/.test(i)) return "Storage Organizer";
      if (/沙池.*围栏|沙坑.*围栏/.test(i)) return "Wooden Sandpit Frame";
      if (/玩沙/.test(i)) return "Sand Play Equipment";
      if (/nugget|积木沙发/i.test(i)) return "Nugget Play Sofa";
      if (/平衡板/.test(i)) return "Balance Board";
      if (/沙发.*儿童/.test(i)) return "Kids Sofa";
      if (/地垫/.test(i)) return "Play Mat";
      if (/空心积木/.test(i)) return "Large Hollow Blocks";
      if (/数字积木|sumblox/i.test(i)) return "Number Blocks";
      if (/差价|运费差价/.test(i)) return "(Shipping Diff)";
      return i.slice(0, 35);
    };
    const getCat = (i) => {
      if (/攀爬|攀岩|肋木|引体|云梯|吊环|绳梯|dome/i.test(i)) return "Climbing";
      if (/tuff tray|感官|大黑盘|光影|平衡板|感统/i.test(i)) return "Sensory";
      if (/桌|椅/.test(i) && !/玩沙/.test(i)) return "Furniture";
      if (/柜|书架|收纳/.test(i)) return "Storage";
      if (/秋千|滑梯|沙池|沙坑/.test(i)) return "Play Equip";
      if (/积木|益智|教具|蒙/.test(i)) return "Educational";
      if (/沙发|地垫|垫/.test(i)) return "Mat/Sofa";
      return "Other";
    };
    const getStatus = (s) => ({ "交易成功":"Completed","卖家已发货":"Shipped","买家已付款":"Paid" }[s] || s);

    orders.push({
      source: "Taobao", id: oid.slice(-8), fullId: oid,
      date: dateStr.slice(0,10), month: dateStr.slice(0,7),
      status: getStatus(status), shop, itemZh: item.slice(0,45),
      itemEn: enName(item), cat: getCat(item),
      variant: variant.slice(0,35), qty, cny: paid,
      thb: Math.round(paid * 4.95), cargo: "", tracking, url,
    });
  });
  return orders;
}

function parse1688(rows) {
  const orders = [];
  let headers = null;
  rows.forEach(cols => {
    if (cols[0] === "订单编号") { headers = cols; return; }
    if (!headers) return;
    const get = (name) => {
      const idx = headers.indexOf(name);
      return idx >= 0 ? (cols[idx]||"").trim() : "";
    };
    const oid = get("订单编号");
    if (!oid || oid.length < 5) return;
    if (get("订单状态") === "交易关闭") return;
    const dateRaw = get("订单创建时间");
    const dateStr = dateRaw.slice(0,10);
    if (!dateStr.startsWith("2026")) return;
    const item = get("货品标题");
    if (!item) return;
    const paidStr = get("实付款(元)").replace(/[,，]/g,"");
    const paid = parseFloat(paidStr) || 0;
    const qty  = parseInt(get("数量")) || 1;
    const rv   = get("收货人姓名").toLowerCase();
    const cargo = rv.includes("alinda") ? "Alinda_kids"
                : rv.includes("vr")     ? "VR(lunaka)"
                : rv.includes("lunaka") ? "Lunaka"
                : get("收货人姓名").slice(0,12) || "Unknown";
    const shop = get("卖家公司名") || get("卖家会员名");
    const offerId = get("Offer ID");
    const tracking = get("运单号");

    const enName = (i) => {
      if (/tuff tray|大黑盘/.test(i)) return "Tuff Tray (Sensory) 1m";
      if (/攀岩板/.test(i)) return "Climbing Wall Panel";
      if (/肋木|引体.*墙/.test(i)) return "Stall Bar / Wall Bar";
      if (/攀爬架.*室内|室内.*攀爬架/.test(i)) return "Indoor Climbing Frame";
      if (/攀爬架/.test(i)) return "Climbing Frame";
      if (/秋千/.test(i)) return "Swing";
      if (/教具柜|玩具柜|收纳柜/.test(i)) return "Toy Storage Cabinet";
      if (/收纳架|收纳盒/.test(i)) return "Storage Organizer";
      if (/书架/.test(i)) return "Bookshelf";
      if (/桌.*幼儿|幼儿.*桌|桌.*儿童|儿童.*桌/.test(i)) return "Kindergarten Table";
      if (/椅.*幼儿|幼儿.*椅|椅.*儿童|儿童.*椅/.test(i)) return "Kindergarten Chair";
      if (/平衡板|过河石/.test(i)) return "Balance Board";
      if (/地垫|地毯/.test(i)) return "Play Mat / Rug";
      if (/沙发/.test(i)) return "Kids Sofa";
      if (/毛绒|公仔/.test(i)) return "Plush Toy";
      if (/1688PLUS|PLUS会员/.test(i)) return "(1688 Membership)";
      if (/运费|差价/.test(i)) return "(Shipping Diff)";
      return i.slice(0,35);
    };
    const getCat = (i) => {
      if (/攀爬|攀岩|肋木|引体|云梯|吊环/.test(i)) return "Climbing";
      if (/tuff tray|感官|大黑盘|光影|平衡板|过河石|感统/i.test(i)) return "Sensory";
      if (/桌|椅/.test(i) && !/玩沙/.test(i)) return "Furniture";
      if (/柜|书架|收纳/.test(i)) return "Storage";
      if (/秋千|滑梯|沙池|玩沙/.test(i)) return "Play Equip";
      if (/积木|益智|教具/.test(i)) return "Educational";
      if (/沙发|地垫|地毯|毯/.test(i)) return "Mat/Sofa";
      if (/毛绒|公仔/.test(i)) return "Toys";
      return "Other";
    };
    const getStatus = (s) => ({
      "交易成功":"Completed","等待买家确认收货":"Arrived",
      "买家已付款":"Paid","卖家已发货":"Shipped",
    }[s] || s);

    orders.push({
      source: "1688", id: oid.slice(-8), fullId: oid,
      date: dateStr, month: dateStr.slice(0,7),
      status: getStatus(get("订单状态")), shop,
      itemZh: item.slice(0,45), itemEn: enName(item), cat: getCat(item),
      variant: get("型号").slice(0,30), qty, cny: paid,
      thb: Math.round(paid * 4.95), cargo, tracking,
      url: offerId ? `https://detail.1688.com/offer/${offerId}.html` : "",
    });
  });
  return orders;
}

// ============================================================
// API FETCH
// ============================================================
async function fetchSheet(tabName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${encodeURIComponent(tabName)}?key=${API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.values || [];
}

// ============================================================
// COMPONENTS
// ============================================================
function Card({ children, style }) {
  return (
    <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20, ...style }}>
      {children}
    </div>
  );
}

function KPI({ label, value, sub, color, icon }) {
  return (
    <Card>
      <div style={{ fontSize: 11, color: C.textSub, marginBottom: 6, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 5 }}>
        {icon && <span>{icon}</span>}{label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: color || C.text, lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{sub}</div>}
    </Card>
  );
}

function SourceBadge({ source }) {
  const m = source === "Taobao"
    ? { color: C.tb, bg: C.tbLight, label: "🛍️ Taobao" }
    : { color: C.s16, bg: C.s16Light, label: "🏭 1688" };
  return (
    <span style={{ background: m.bg, color: m.color, padding: "2px 8px", borderRadius: 20, fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" }}>
      {m.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || { color: C.textSub, bg: C.border };
  return (
    <span style={{ background: m.bg, color: m.color, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {status}
    </span>
  );
}

function CatTag({ cat, small }) {
  const m = CAT_META[cat] || CAT_META.Other;
  return (
    <span style={{ background: m.bg, color: m.color, padding: small ? "2px 7px" : "3px 10px", borderRadius: 20, fontSize: small ? 10 : 11, fontWeight: 700, whiteSpace: "nowrap" }}>
      {m.icon} {cat}
    </span>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function Dashboard({ orders }) {
  const tbOrders  = orders.filter(o => o.source === "Taobao");
  const s16Orders = orders.filter(o => o.source === "1688");
  const totalCNY  = orders.reduce((a,o) => a+o.cny, 0);
  const tbCNY     = tbOrders.reduce((a,o) => a+o.cny, 0);
  const s16CNY    = s16Orders.reduce((a,o) => a+o.cny, 0);
  const shipped   = orders.filter(o => o.status === "Shipped").length;

  const catData = {};
  orders.forEach(o => {
    if (!catData[o.cat]) catData[o.cat] = { cny: 0, count: 0 };
    catData[o.cat].cny  += o.cny;
    catData[o.cat].count++;
  });
  const catSorted = Object.entries(catData).sort((a,b) => b[1].cny - a[1].cny);

  const monthData = {};
  orders.forEach(o => {
    if (!monthData[o.month]) monthData[o.month] = { tb: 0, s16: 0 };
    if (o.source === "Taobao") monthData[o.month].tb  += o.cny;
    else                       monthData[o.month].s16 += o.cny;
  });
  const chartData = Object.keys(monthData).sort().map(m => ({
    month: m.slice(5), tb: Math.round(monthData[m].tb), s16: Math.round(monthData[m].s16),
  }));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
        <KPI icon="💴" label="Total Spend 2026" value={`¥${fmt(totalCNY)}`} sub={`≈ ฿${fmt(totalCNY*4.95)}`} color={C.primary} />
        <KPI icon="📋" label="Total Orders"      value={orders.length} sub="Taobao + 1688" />
        <KPI icon="🛍️" label="Taobao"            value={`¥${fmt(tbCNY)}`} sub={`${((tbCNY/totalCNY)||0).toFixed(0)*100||((tbCNY/totalCNY)*100).toFixed(0)}% · ${tbOrders.length} orders`} color={C.tb} />
        <KPI icon="🏭" label="1688"              value={`¥${fmt(s16CNY)}`} sub={`${((s16CNY/totalCNY)*100).toFixed(0)}% · ${s16Orders.length} orders`} color={C.s16} />
        <KPI icon="🚢" label="In Transit"        value={shipped} sub="shipments" color={C.warning} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textSub, marginBottom: 14 }}>📊 Monthly Spend (CNY)</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} barSize={14}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.textSub }} />
              <YAxis tick={{ fontSize: 10, fill: C.textSub }} tickFormatter={v => `¥${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v, n) => [`¥${fmt(v)}`, n === "tb" ? "Taobao" : "1688"]} />
              <Bar dataKey="tb"  fill={C.tb}  radius={[3,3,0,0]} />
              <Bar dataKey="s16" fill={C.s16} radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", gap: 16, fontSize: 11, marginTop: 8 }}>
            <span style={{ color: C.tb }}>■ Taobao</span>
            <span style={{ color: C.s16 }}>■ 1688</span>
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.textSub, marginBottom: 14 }}>🏷️ Spend by Category</div>
          {catSorted.slice(0, 7).map(([cat, d]) => {
            const m   = CAT_META[cat] || CAT_META.Other;
            const pct = (d.cny / totalCNY) * 100;
            return (
              <div key={cat} style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                  <span style={{ color: m.color, fontWeight: 700 }}>{m.icon} {cat}</span>
                  <span style={{ color: C.textSub }}>¥{fmt(d.cny)} ({pct.toFixed(0)}%)</span>
                </div>
                <div style={{ height: 5, background: C.bg, borderRadius: 3 }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: m.color, borderRadius: 3 }} />
                </div>
              </div>
            );
          })}
        </Card>
      </div>
    </div>
  );
}

// ============================================================
// PROCUREMENT
// ============================================================
function Procurement({ orders }) {
  const [search, setSearch]   = useState("");
  const [src, setSrc]         = useState("ALL");
  const [cat, setCat]         = useState("ALL");
  const [sortBy, setSortBy]   = useState("date");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(() => {
    let list = orders.filter(o => {
      if (src !== "ALL" && o.source !== src) return false;
      if (cat !== "ALL" && o.cat !== cat)    return false;
      if (search) {
        const q = search.toLowerCase();
        if (!o.itemEn.toLowerCase().includes(q) && !o.shop.includes(search) && !o.tracking.includes(search)) return false;
      }
      return true;
    });
    if (sortBy === "date")     list.sort((a,b) => b.date.localeCompare(a.date));
    if (sortBy === "cny_desc") list.sort((a,b) => b.cny - a.cny);
    return list;
  }, [orders, search, src, cat, sortBy]);

  const totalCNY = filtered.reduce((a,o) => a+o.cny, 0);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 ค้นหาสินค้า / ร้าน / tracking..."
          style={{ flex: 1, minWidth: 180, padding: "8px 12px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13 }} />
        <select value={src} onChange={e => setSrc(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12 }}>
          <option value="ALL">🌐 All Sources</option>
          <option value="Taobao">🛍️ Taobao</option>
          <option value="1688">🏭 1688</option>
        </select>
        <select value={cat} onChange={e => setCat(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12 }}>
          <option value="ALL">All Categories</option>
          {Object.keys(CAT_META).map(c => <option key={c} value={c}>{CAT_META[c].icon} {c}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          style={{ padding: "8px 10px", borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 12 }}>
          <option value="date">ล่าสุดก่อน</option>
          <option value="cny_desc">ราคาสูงสุด</option>
        </select>
      </div>

      <div style={{ background: C.primaryLight, borderRadius: 10, padding: "7px 14px", marginBottom: 12, fontSize: 12, color: C.primary, display: "flex", gap: 20, flexWrap: "wrap" }}>
        <span>📋 {filtered.length} orders</span>
        <span>¥{fmt(totalCNY)} CNY</span>
        <span>≈ ฿{fmt(totalCNY * 4.95)} THB</span>
      </div>

      <Card style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: C.bg }}>
                {["Source","Date","Category","Product (EN)","Shop","Qty","¥ CNY","฿ THB","Status","Cargo","Tracking","Buy"].map(h => (
                  <th key={h} style={{ padding: "9px 10px", textAlign: "left", color: C.textSub, fontWeight: 700, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap", fontSize: 11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((o, i) => (
                <tr key={o.fullId + i}
                  onClick={() => setSelected(selected?.fullId === o.fullId ? null : o)}
                  style={{ background: selected?.fullId === o.fullId ? C.primaryLight : i%2===0 ? C.surface : "#FAFBFC", cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>
                  <td style={{ padding: "7px 10px" }}><SourceBadge source={o.source} /></td>
                  <td style={{ padding: "7px 10px", color: C.textSub, whiteSpace: "nowrap" }}>{o.date}</td>
                  <td style={{ padding: "7px 10px" }}><CatTag cat={o.cat} small /></td>
                  <td style={{ padding: "7px 10px", fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={o.itemEn}>{o.itemEn}</td>
                  <td style={{ padding: "7px 10px", color: C.textSub, fontSize: 11, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.shop}</td>
                  <td style={{ padding: "7px 10px", textAlign: "center", fontWeight: 700 }}>{o.qty}</td>
                  <td style={{ padding: "7px 10px", fontWeight: 600, whiteSpace: "nowrap" }}>¥{fmt(o.cny)}</td>
                  <td style={{ padding: "7px 10px", color: C.accent, fontWeight: 700, whiteSpace: "nowrap" }}>฿{fmt(o.thb)}</td>
                  <td style={{ padding: "7px 10px" }}><StatusBadge status={o.status} /></td>
                  <td style={{ padding: "7px 10px", fontSize: 11, color: o.cargo ? C.primary : C.textMuted }}>{o.cargo || "—"}</td>
                  <td style={{ padding: "7px 10px", fontSize: 10, fontFamily: "monospace", color: C.primary }}>{o.tracking || "—"}</td>
                  <td style={{ padding: "7px 10px" }}>
                    {o.url ? (
                      <a href={o.url} target="_blank" rel="noreferrer"
                        style={{ background: o.source==="1688" ? C.s16Light : C.tbLight, color: o.source==="1688" ? C.s16 : C.tb, padding: "3px 8px", borderRadius: 7, fontSize: 10, fontWeight: 800, textDecoration: "none" }}
                        onClick={e => e.stopPropagation()}>
                        {o.source==="1688" ? "🏭" : "🛍️"}
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 200 && (
            <div style={{ padding: "10px", color: C.textMuted, fontSize: 12, textAlign: "center" }}>
              Showing 200 / {filtered.length} — ใช้ filter เพื่อค้นหาเพิ่มเติม
            </div>
          )}
        </div>
      </Card>

      {selected && (
        <Card style={{ marginTop: 14, borderLeft: `4px solid ${(CAT_META[selected.cat]||CAT_META.Other).color}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{selected.itemEn}</div>
              <div style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>{selected.itemZh}</div>
            </div>
            <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.textMuted }}>×</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8, marginBottom: 12 }}>
            {[["Source", selected.source], ["Date", selected.date], ["Shop", selected.shop],
              ["Qty", selected.qty], ["CNY/unit", `¥${fmt(selected.cny/selected.qty)}`],
              ["THB/unit", `฿${fmt(selected.thb/selected.qty)}`],
              ["Cargo", selected.cargo||"—"], ["Tracking", selected.tracking||"—"]].map(([k,v]) => (
              <div key={k} style={{ background: C.bg, borderRadius: 9, padding: "8px 10px" }}>
                <div style={{ fontSize: 10, color: C.textMuted, fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{k}</div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {selected.url && (
              <a href={selected.url} target="_blank" rel="noreferrer"
                style={{ background: C.primary, color: "#fff", padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                {selected.source==="1688" ? "🏭 View on 1688" : "🛍️ View on Taobao"}
              </a>
            )}
            <div style={{ background: C.accentLight, color: C.accent, padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
              Cost/unit ฿{fmt(selected.thb/selected.qty)}
            </div>
            <div style={{ background: C.warningLight, color: C.warning, padding: "8px 14px", borderRadius: 10, fontSize: 12, fontWeight: 600 }}>
              Sell 35% → ฿{fmt(selected.thb/selected.qty*1.35)}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// ============================================================
// TB vs 1688 COMPARE
// ============================================================
function Compare({ orders }) {
  const tbMap  = {}, s16Map = {};
  orders.forEach(o => {
    const k = o.itemEn;
    if (o.source === "Taobao") { if (!tbMap[k])  tbMap[k]  = []; tbMap[k].push(o.cny/o.qty);  }
    else                       { if (!s16Map[k]) s16Map[k] = []; s16Map[k].push(o.cny/o.qty); }
  });
  const common = Object.keys(tbMap).filter(k => s16Map[k] && k !== "(Shipping Diff)" && k !== "(1688 Membership)");
  const comps  = common.map(k => {
    const tbAvg  = tbMap[k].reduce((a,b)=>a+b,0)/tbMap[k].length;
    const s16Avg = s16Map[k].reduce((a,b)=>a+b,0)/s16Map[k].length;
    const diff   = ((tbAvg - s16Avg)/s16Avg)*100;
    return { item: k, tbAvg, s16Avg, diff, cheaper: diff > 0 ? "1688" : "Taobao" };
  }).sort((a,b) => Math.abs(b.diff) - Math.abs(a.diff));

  return (
    <div>
      <div style={{ fontSize: 13, color: C.textSub, marginBottom: 16 }}>
        สินค้าที่สั่งจากทั้ง 2 แพลตฟอร์ม — เปรียบเทียบราคาต่อชิ้น
      </div>
      {comps.length === 0 ? (
        <Card><div style={{ color: C.textMuted, textAlign: "center", padding: 40 }}>ไม่มีสินค้าที่ซื้อจากทั้ง 2 แพลตฟอร์ม</div></Card>
      ) : comps.map(c => {
        const is1688Cheaper = c.diff > 0;
        return (
          <Card key={c.item} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>{c.item}</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div style={{ background: is1688Cheaper ? C.warningLight : C.accentLight, borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: C.tb, fontWeight: 700, marginBottom: 4 }}>🛍️ Taobao avg/unit</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: is1688Cheaper ? C.warning : C.accent }}>¥{fmt(c.tbAvg)}</div>
              </div>
              <div style={{ background: is1688Cheaper ? C.accentLight : C.warningLight, borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: C.s16, fontWeight: 700, marginBottom: 4 }}>🏭 1688 avg/unit</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: is1688Cheaper ? C.accent : C.warning }}>¥{fmt(c.s16Avg)}</div>
              </div>
              <div style={{ background: C.bg, borderRadius: 10, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: C.textSub, fontWeight: 700, marginBottom: 4 }}>ถูกกว่า</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: is1688Cheaper ? C.accent : C.warning }}>
                  {c.cheaper} {Math.abs(c.diff).toFixed(0)}%
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================================
// LOGISTICS
// ============================================================
function Logistics({ orders }) {
  const shipped   = orders.filter(o => o.status === "Shipped");
  const withTrack = shipped.filter(o => o.tracking);
  const noTrack   = shipped.filter(o => !o.tracking);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
        <KPI icon="🚢" label="In Transit" value={shipped.length} color={C.warning} />
        <KPI icon="📍" label="With Tracking" value={withTrack.length} color={C.accent} />
        <KPI icon="⏳" label="No Tracking" value={noTrack.length} color={C.warning} />
        <KPI icon="💴" label="Value in Transit" value={`¥${fmt(shipped.reduce((a,o)=>a+o.cny,0))}`} color={C.primary} />
      </div>

      {withTrack.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>📍 Active Shipments</div>
          {withTrack.map((o, i) => (
            <Card key={i} style={{ marginBottom: 8, borderLeft: `3px solid ${C.primary}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <SourceBadge source={o.source} />
                  <div style={{ fontWeight: 700, fontSize: 13, marginTop: 4 }}>{o.itemEn}</div>
                  <div style={{ fontSize: 11, color: C.textSub }}>{o.shop} · {o.date} · Qty {o.qty}</div>
                  {o.cargo && <div style={{ fontSize: 11, color: C.primary, marginTop: 2 }}>→ {o.cargo}</div>}
                </div>
                <div style={{ background: C.primaryLight, color: C.primary, padding: "5px 12px", borderRadius: 8, fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>
                  {o.tracking}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {noTrack.length > 0 && (
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>⏳ รอ Tracking Number</div>
          {noTrack.map((o, i) => (
            <Card key={i} style={{ marginBottom: 8, borderLeft: `3px solid ${C.warning}` }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <SourceBadge source={o.source} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 12 }}>{o.itemEn}</div>
                  <div style={{ fontSize: 11, color: C.textSub }}>{o.shop} · {o.date} · ¥{fmt(o.cny)}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
const MODULES = [
  { id: "dashboard",   label: "Dashboard",   icon: "📊" },
  { id: "procurement", label: "All Orders",  icon: "📦" },
  { id: "logistics",   label: "Logistics",   icon: "🚢" },
  { id: "compare",     label: "TB vs 1688",  icon: "⚖️" },
];

export default function AlindaMicroERP() {
  const [mod, setMod]       = useState("dashboard");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [tbRows, s16Rows] = await Promise.all([
        fetchSheet("Taobao"),
        fetchSheet("1688"),
      ]);
      const tbOrders  = parseTaobao(tbRows.slice(1));
      const s16Orders = parse1688(s16Rows);
      setOrders([...tbOrders, ...s16Orders]);
      setLastSync(new Date().toLocaleTimeString("th-TH"));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const totalCNY = orders.reduce((a,o) => a+o.cny, 0);
  const tbCount  = orders.filter(o => o.source==="Taobao").length;
  const s16Count = orders.filter(o => o.source==="1688").length;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.nav, padding: "0 20px", display: "flex", alignItems: "center", gap: 12, height: 52 }}>
        <div style={{ color: "#fff", fontWeight: 900, fontSize: 15, letterSpacing: -0.5 }}>ALINDA</div>
        <div style={{ color: "rgba(255,255,255,0.3)" }}>/</div>
        <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>Micro ERP 2026</div>
        <div style={{ flex: 1 }} />
        {loading ? (
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12 }}>⏳ Loading...</span>
        ) : error ? (
          <span style={{ background: "#FF3B3020", color: "#FF3B30", fontSize: 11, padding: "3px 10px", borderRadius: 20 }}>❌ {error}</span>
        ) : (
          <>
            <span style={{ background: C.tbLight, color: C.tb, fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20 }}>🛍️ TB {tbCount}</span>
            <span style={{ background: C.s16Light, color: C.s16, fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20 }}>🏭 1688 {s16Count}</span>
            <span style={{ background: C.accentLight, color: C.accent, fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 20 }}>¥{fmt(totalCNY)}</span>
          </>
        )}
        <button onClick={loadData} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", padding: "5px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
          🔄 Refresh
        </button>
      </div>

      {/* Nav */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 20px", display: "flex", gap: 2 }}>
        {MODULES.map(m => (
          <button key={m.id} onClick={() => setMod(m.id)}
            style={{ padding: "12px 16px", border: "none", background: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
              borderBottom: `2px solid ${mod===m.id ? C.primary : "transparent"}`,
              color: mod===m.id ? C.primary : C.textSub }}>
            {m.icon} {m.label}
          </button>
        ))}
        {lastSync && <div style={{ marginLeft: "auto", alignSelf: "center", fontSize: 11, color: C.textMuted }}>synced {lastSync}</div>}
      </div>

      {/* Content */}
      <div style={{ padding: 20, maxWidth: 1400, margin: "0 auto" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 80, color: C.textMuted }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
            <div style={{ fontSize: 14 }}>กำลังดึงข้อมูลจาก Google Sheets...</div>
          </div>
        ) : error ? (
          <Card style={{ textAlign: "center", padding: 60 }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 8 }}>ไม่สามารถดึงข้อมูลได้</div>
            <div style={{ fontSize: 12, color: C.textSub, marginBottom: 20 }}>{error}</div>
            <div style={{ fontSize: 12, color: C.textMuted, background: C.bg, padding: "10px 16px", borderRadius: 10, textAlign: "left", display: "inline-block" }}>
              <div><strong>ตรวจสอบ:</strong></div>
              <div>1. API Key ถูกต้องและ Enable Google Sheets API แล้ว</div>
              <div>2. Sheet ถูก Share เป็น "Anyone with the link → Viewer"</div>
              <div>3. Sheet ID ถูกต้อง</div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button onClick={loadData} style={{ background: C.primary, color: "#fff", border: "none", padding: "10px 24px", borderRadius: 10, fontSize: 14, cursor: "pointer" }}>
                🔄 ลองใหม่
              </button>
            </div>
          </Card>
        ) : (
          <>
            {mod === "dashboard"   && <Dashboard  orders={orders} />}
            {mod === "procurement" && <Procurement orders={orders} />}
            {mod === "logistics"   && <Logistics   orders={orders} />}
            {mod === "compare"     && <Compare     orders={orders} />}
          </>
        )}
      </div>
    </div>
  );
}
