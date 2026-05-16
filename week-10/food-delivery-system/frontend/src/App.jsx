import { useState, useEffect, useRef, useCallback } from "react";
import { ActiveOrdersFlow } from "./components/FlowTracker.jsx";
import "./components/flow.css";

const API = "";
const fmt = (n) => (n ?? 0).toLocaleString("vi-VN") + "₫";
const fmtTime = (iso) => new Date(iso).toLocaleTimeString("vi-VN");
const fmtDate = (iso) => new Date(iso).toLocaleString("vi-VN");

/* ─── Toast ─────────────────────────────────────────────────────────────── */
function Toasts({ toasts, remove }) {
  return (
    <div className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span className="toast-icon">{t.type === "success" ? "✅" : "❌"}</span>
          <div className="toast-body">
            <div className="toast-title">{t.title}</div>
            <div className="toast-msg">{t.msg}</div>
          </div>
          <button className="toast-close" onClick={() => remove(t.id)}>✕</button>
        </div>
      ))}
    </div>
  );
}

/* ─── Login ──────────────────────────────────────────────────────────────── */
function LoginPage({ onLogin, addLog }) {
  const [u, setU] = useState("user1");
  const [p, setP] = useState("123456");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    addLog("rest", "REST", "POST /api/users/login → :8081");
    try {
      const r = await fetch(`${API}/api/users/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      addLog("system", "SYS", `✅ Login: ${d.data.user.name}`);
      onLogin(d.data.user);
    } catch (err) {
      setError(err.message); addLog("system", "SYS", `❌ ${err.message}`);
    } finally { setLoading(false); }
  };

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-emoji">🍜</div>
        <div className="login-title">FoodEx</div>
        <div className="login-subtitle">Hybrid Architecture — Microservices + Event-Driven</div>
        {error && <div className="error-msg">⚠️ {error}</div>}
        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Tên đăng nhập</label>
            <input className="form-input" value={u} onChange={e => setU(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input className="form-input" type="password" value={p} onChange={e => setP(e.target.value)} required />
          </div>
          <button className="btn btn-primary" disabled={loading}>
            {loading ? <><span className="spinner" /> Đang đăng nhập...</> : "Đăng nhập →"}
          </button>
        </form>
        <div className="form-hint">Demo: <strong>user1 / 123456</strong> hoặc <strong>admin / admin</strong></div>
      </div>
    </div>
  );
}

/* ─── Food Menu ──────────────────────────────────────────────────────────── */
function FoodMenu({ cart, setCart, addLog, addToast }) {
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cacheInfo, setCacheInfo] = useState(null);

  const loadFoods = useCallback(async () => {
    setLoading(true);
    addLog("rest", "REST", "GET /api/foods → Gateway :8080 → :8081");
    try {
      const r = await fetch(`${API}/api/foods`);
      const d = await r.json();
      setFoods(d.data || []);
      setCacheInfo(d.cache || null);
      const cLabel = d.cache?.hit ? "⚡ CACHE HIT" : "🔍 CACHE MISS";
      addLog(d.cache?.hit ? "cache" : "system", d.cache?.hit ? "REDIS" : "SYS",
        `${cLabel} [${d.cache?.key ?? "foods:all"}] — ${d.total} món`);
    } catch { addLog("system", "SYS", "❌ Lỗi tải món ăn"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadFoods(); }, [loadFoods]);

  const addItem = (food) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === food.id);
      return ex ? prev.map(i => i.id === food.id ? { ...i, qty: i.qty + 1 } : i)
                : [...prev, { ...food, qty: 1 }];
    });
    addToast("success", "Đã thêm vào giỏ", `${food.name} — ${fmt(food.price)}`);
  };

  const clearCache = async () => {
    await fetch(`${API}/api/foods/cache`, { method: "DELETE" });
    addLog("cache", "REDIS", "🗑️ Đã xoá cache foods — MISS tiếp theo");
    addToast("success", "Cache đã xoá!", "Lần tải tiếp theo sẽ là CACHE MISS");
    loadFoods();
  };

  return (
    <div>
      {/* Redis status bar */}
      {cacheInfo && (
        <div className="redis-info">
          <div className="redis-dot" />
          <span className="redis-label">Redis :6379</span>
          <span className="redis-desc">Cache key: <code>{cacheInfo.key}</code> — TTL: {cacheInfo.ttl}s</span>
          <span className={`cache-badge ${cacheInfo.hit ? "cache-hit" : "cache-miss"}`}>
            {cacheInfo.hit ? "⚡ HIT" : "🔍 MISS"}
          </span>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: "auto" }} onClick={clearCache}>
            🗑️ Xoá cache
          </button>
        </div>
      )}

      <div className="section-header">
        <div>
          <div className="section-title">🍽️ Menu Hôm Nay</div>
          <div className="section-subtitle">{foods.length} món — REST đồng bộ + Redis Cache</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge-rest">REST :8081</span>
          <button className="btn btn-ghost btn-sm" onClick={loadFoods}>↻ Reload</button>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-muted)" }}>
          <span className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }} /> Đang tải...
        </div>
      ) : (
        <div className="food-grid">
          {foods.map(f => (
            <div key={f.id} className="food-card">
              <div className="food-emoji-wrap">{f.image}</div>
              <div className="food-body">
                <div className="food-name">{f.name}</div>
                <div className="food-restaurant">🏪 {f.restaurant}</div>
                <div className="food-meta">
                  <span className="food-price">{fmt(f.price)}</span>
                  <span className="food-info">
                    <span className="food-rating">⭐ {f.rating}</span>
                    <span>🕐 {f.time}</span>
                  </span>
                </div>
              </div>
              <div className="food-actions">
                <button className="food-add-btn" onClick={() => addItem(f)}>+ Thêm vào giỏ</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Cart & Orders ──────────────────────────────────────────────────────── */
function CartOrder({ cart, setCart, user, addLog, addToast, orderFlows, onPlaceOrder }) {
  const [orders, setOrders] = useState([]);
  const [placing, setPlacing] = useState(false);

  const fetchOrders = useCallback(() => {
    fetch(`${API}/api/orders?userId=${user.id}`)
      .then(r => r.json()).then(d => setOrders(d.data || []));
  }, [user.id]);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // Refresh orders list khi có flow mới hoàn tất
  useEffect(() => {
    const hasDone = Object.values(orderFlows).some(f => f.step >= 5 || f.failed);
    if (hasDone) fetchOrders();
  }, [orderFlows]);

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const changeQty = (id, d) => setCart(prev =>
    prev.map(i => i.id === id ? { ...i, qty: Math.max(0, i.qty + d) } : i).filter(i => i.qty > 0)
  );

  const placeOrder = async () => {
    if (!cart.length) return;
    setPlacing(true);
    addLog("rest", "REST", "POST /api/orders → Gateway :8080 → Order :8082");
    try {
      const r = await fetch(`${API}/api/orders`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
          totalAmount: total,
        }),
      });
      const d = await r.json();
      if (!d.success) throw new Error(d.message);
      addLog("system", "SYS", `✅ Order ${d.data.id} created`);
      addLog("event", "EVENT", `📤 Publish ORDER_CREATED → RabbitMQ`);
      addToast("success", "Đặt hàng thành công!", `${d.data.id} — Đang xử lý thanh toán...`);
      onPlaceOrder(d.data.id); // khởi tạo flow tracking
      setCart([]);
      setOrders(prev => [d.data, ...prev]);
    } catch (err) {
      addToast("error", "Lỗi đặt hàng", err.message);
    } finally { setPlacing(false); }
  };

  const statusLabel = { PENDING: "⏳ Chờ TT", PAID: "✅ Đã TT", FAILED: "❌ Thất bại" };

  return (
    <div>
      {/* Real-time flow tracker */}
      <ActiveOrdersFlow orderFlows={orderFlows} />

      <div className="two-col">
        {/* Cart */}
        <div>
          <div className="section-header">
            <div>
              <div className="section-title">🛒 Giỏ hàng</div>
              <div className="section-subtitle">Đặt hàng = REST, Thanh toán = Event (async)</div>
            </div>
            <span className="badge-rest">REST :8082</span>
          </div>
          <div className="cart-section">
            {!cart.length ? (
              <div className="cart-empty">Chưa có món. Hãy chọn từ Menu!</div>
            ) : (
              <>
                {cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <div>
                      <div className="cart-item-name">{item.image} {item.name}</div>
                      <div className="cart-item-price">{fmt(item.price * item.qty)}</div>
                    </div>
                    <div className="cart-item-qty">
                      <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                      <span style={{ fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.qty}</span>
                      <button className="qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                    </div>
                  </div>
                ))}
                <div className="cart-total">
                  <span className="cart-total-label">Tổng cộng</span>
                  <span className="cart-total-amount">{fmt(total)}</span>
                </div>
                <button className="btn btn-primary" style={{ marginTop: "1rem" }}
                  onClick={placeOrder} disabled={placing}>
                  {placing ? <><span className="spinner" /> Đang đặt...</> : "🛵 Đặt hàng ngay"}
                </button>
              </>
            )}
          </div>
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "1rem", marginTop: "1rem", fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.7 }}>
            <strong style={{ color: "var(--text)" }}>💡 Nguyên lý Hybrid:</strong><br />
            Đặt hàng phản hồi <strong style={{ color: "var(--primary)" }}>ngay (REST)</strong> →
            Order Service publish <code style={{ background: "rgba(255,87,34,0.1)", padding: "0 5px", borderRadius: 4 }}>ORDER_CREATED</code> vào RabbitMQ →
            Payment Service consume (~3s) → publish <code style={{ background: "rgba(34,197,94,0.1)", padding: "0 5px", borderRadius: 4 }}>PAYMENT_SUCCESS</code> →
            Notification Service gửi <strong style={{ color: "#60A5FA" }}>SSE</strong> về Frontend.
          </div>
        </div>

        {/* Orders */}
        <div>
          <div className="section-header">
            <div>
              <div className="section-title">📋 Đơn hàng</div>
              <div className="section-subtitle">Cập nhật khi thanh toán xong</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span className="badge-event">EVENT</span>
              <button className="btn btn-ghost btn-sm" onClick={fetchOrders}>↻</button>
            </div>
          </div>
          <div className="order-list">
            {!orders.length && (
              <div className="empty-state">
                <div className="empty-state-emoji">📦</div>
                <div className="empty-state-text">Chưa có đơn hàng nào</div>
              </div>
            )}
            {orders.map(o => (
              <div key={o.id} className={`order-card ${o.status?.toLowerCase()}`}>
                <div className="order-header">
                  <div>
                    <div className="order-id">#{o.id}</div>
                    <div className="order-date">{fmtDate(o.createdAt)}</div>
                  </div>
                  <span className={`status-pill status-${o.status}`}>
                    {statusLabel[o.status] || o.status}
                  </span>
                </div>
                <div className="order-items">{o.items?.map(i => `${i.name} x${i.qty}`).join(", ")}</div>
                <div className="order-amount">{fmt(o.totalAmount)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Event Log ──────────────────────────────────────────────────────────── */
function EventLog({ logs, clear }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [logs]);
  const tagColor = { rest: "tag-rest", event: "tag-event", system: "tag-system", cache: "tag-cache" };
  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">📡 Event Log</div>
          <div className="section-subtitle">Luồng sự kiện REST + RabbitMQ + Redis (real-time)</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="arch-chip chip-rest">REST = sync</span>
          <span className="arch-chip chip-event">EVENT = async</span>
          <button className="btn btn-ghost btn-sm" onClick={clear}>Xoá</button>
        </div>
      </div>
      <div className="event-log" ref={ref} style={{ maxHeight: 500 }}>
        {!logs.length && <div style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>Chưa có sự kiện...</div>}
        {logs.map(l => (
          <div key={l.id} className="event-entry">
            <span className="event-time">{l.time}</span>
            <span className={`event-tag ${tagColor[l.tag] || "tag-system"}`}>{l.label}</span>
            <span className="event-desc">{l.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Notif Panel ────────────────────────────────────────────────────────── */
function NotifPanel({ open, onClose, notifications }) {
  return (
    <div className={`notif-panel ${open ? "open" : ""}`}>
      <div className="notif-panel-title">
        🔔 Thông báo ({notifications.length})
        <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
      </div>
      {!notifications.length && <div style={{ color: "var(--text-dim)", textAlign: "center", marginTop: "2rem", fontSize: "0.85rem" }}>Chưa có thông báo</div>}
      {notifications.map(n => (
        <div key={n.id} className="notif-item">
          <div className="notif-item-title">{n.title}</div>
          <div className="notif-item-msg">{n.message}</div>
          <div className="notif-item-time">
            🕐 {fmtTime(n.timestamp)} —{" "}
            {n.type === "PAYMENT_SUCCESS" ? "✅ Thành công" : "❌ Thất bại"}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── App Root ───────────────────────────────────────────────────────────── */
export default function App() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState("menu");
  const [cart, setCart] = useState([]);
  const [logs, setLogs] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);
  // orderFlows: { [orderId]: { step: 1-5, failed: bool, message, lastUpdate } }
  const [orderFlows, setOrderFlows] = useState({});
  const logId = useRef(0);
  const toastId = useRef(0);

  const addLog = useCallback((tag, label, desc) => {
    setLogs(prev => [...prev, { id: logId.current++, time: new Date().toLocaleTimeString("vi-VN"), tag, label, desc }]);
  }, []);

  const addToast = useCallback((type, title, msg, dur = 6000) => {
    const id = toastId.current++;
    setToasts(prev => [...prev, { id, type, title, msg }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), dur);
  }, []);

  const removeToast = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  // Khởi tạo flow tracking khi đặt hàng
  const onPlaceOrder = useCallback((orderId) => {
    setOrderFlows(prev => ({
      ...prev,
      [orderId]: { step: 1, failed: false, message: "Đặt hàng thành công, chờ xử lý...", lastUpdate: new Date().toLocaleTimeString("vi-VN") },
    }));
  }, []);

  // SSE — nhận events từ Notification Service
  useEffect(() => {
    if (!user) return;
    addLog("system", "SYS", `📡 SSE → Notification :8084 (userId=${user.id})`);
    const es = new EventSource(`/api/notifications/stream?userId=${user.id}`);

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      const { type, orderId, step, message } = data;
      const now = new Date().toLocaleTimeString("vi-VN");

      if (type === "CONNECTED") {
        addLog("system", "SYS", "✅ SSE connected to Notification Service");
        return;
      }

      // Cập nhật flow step theo event type
      if (type === "ORDER_CREATED") {
        addLog("event", "EVENT", `📥 ORDER_CREATED: ${orderId} → step 2`);
        setOrderFlows(prev => ({ ...prev, [orderId]: { ...prev[orderId], step: 2, message: message || "Đã publish ORDER_CREATED vào RabbitMQ", lastUpdate: now } }));
      } else if (type === "PAYMENT_PROCESSING") {
        addLog("event", "EVENT", `📥 PAYMENT_PROCESSING: ${orderId} → step 3`);
        setOrderFlows(prev => ({ ...prev, [orderId]: { ...prev[orderId], step: 3, message: message || "Payment Service đang xử lý...", lastUpdate: now } }));
      } else if (type === "PAYMENT_SUCCESS") {
        addLog("event", "EVENT", `📥 PAYMENT_SUCCESS: ${orderId} → step 5 ✅`);
        setOrderFlows(prev => ({ ...prev, [orderId]: { step: 5, failed: false, message: data.message, lastUpdate: now } }));
        setNotifications(prev => [data, ...prev]);
        addToast("success", data.title, data.message, 8000);
        // Auto-remove flow sau 5s
        setTimeout(() => setOrderFlows(prev => { const n = { ...prev }; delete n[orderId]; return n; }), 8000);
      } else if (type === "PAYMENT_FAILED") {
        addLog("event", "EVENT", `📥 PAYMENT_FAILED: ${orderId} → failed ❌`);
        setOrderFlows(prev => ({ ...prev, [orderId]: { step: 4, failed: true, message: data.message, lastUpdate: now } }));
        setNotifications(prev => [data, ...prev]);
        addToast("error", data.title, data.message, 8000);
        setTimeout(() => setOrderFlows(prev => { const n = { ...prev }; delete n[orderId]; return n; }), 8000);
      }
    };

    es.onerror = () => addLog("system", "SYS", "⚠️ SSE error (RabbitMQ chưa sẵn sàng?)");
    return () => es.close();
  }, [user]);

  if (!user) return (
    <div className="app">
      <LoginPage onLogin={(u) => { setUser(u); addLog("system", "SYS", `✅ User ${u.name} logged in`); }} addLog={addLog} />
      <Toasts toasts={toasts} remove={removeToast} />
    </div>
  );

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-logo"><span>🍜</span> FoodEx</div>
        <nav className="header-nav">
          <button className={`nav-btn ${tab === "menu" ? "active" : ""}`} onClick={() => setTab("menu")}>🍽️ Menu</button>
          <button className={`nav-btn ${tab === "order" ? "active" : ""}`} onClick={() => setTab("order")}>
            🛒 Giỏ hàng{cart.length > 0 && ` (${cart.length})`}
            {Object.keys(orderFlows).length > 0 && <span className="notif-badge" style={{ position: "relative", top: -2, marginLeft: 4 }}>{Object.keys(orderFlows).length}</span>}
          </button>
          <button className={`nav-btn ${tab === "log" ? "active" : ""}`} onClick={() => setTab("log")}>📡 Event Log</button>
        </nav>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="notif-bell" onClick={() => setNotifOpen(o => !o)}>
            🔔
            {notifications.filter(n => ["PAYMENT_SUCCESS","PAYMENT_FAILED"].includes(n.type)).length > 0 && (
              <span className="notif-badge">
                {Math.min(9, notifications.filter(n => ["PAYMENT_SUCCESS","PAYMENT_FAILED"].includes(n.type)).length)}
              </span>
            )}
          </button>
          <div className="user-badge">{user.avatar} {user.name}</div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setUser(null); setCart([]); setLogs([]); setNotifications([]); setOrderFlows({}); }}>Đăng xuất</button>
        </div>
      </header>

      {/* Arch Banner */}
      <div style={{ padding: "1rem 2rem 0" }}>
        <div className="arch-banner">
          <div>
            <div className="arch-banner-title">Hybrid Architecture — <span>Food Delivery Demo</span></div>
            <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: 4 }}>
              Microservices (REST sync) + Event-Driven (RabbitMQ async) + Redis Cache
            </div>
          </div>
          <div className="arch-flow">
            <span className="arch-chip chip-rest">Frontend :3000</span><span className="arch-arrow">→</span>
            <span className="arch-chip chip-rest">Gateway :8080</span><span className="arch-arrow">→</span>
            <span className="arch-chip chip-rest">Services :8081-82</span><span className="arch-arrow">→</span>
            <span className="arch-chip chip-event">RabbitMQ :5672</span><span className="arch-arrow">→</span>
            <span className="arch-chip chip-event">Payment :8083</span><span className="arch-arrow">→</span>
            <span className="arch-chip chip-event">Notify :8084</span>
            <span className="arch-arrow"> | </span>
            <span style={{ padding: "4px 12px", borderRadius: 50, fontSize: "0.75rem", fontWeight: 600, background: "rgba(34,197,94,0.15)", color: "#4ADE80", border: "1px solid rgba(34,197,94,0.3)" }}>Redis :6379</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="main">
        {tab === "menu" && <FoodMenu cart={cart} setCart={setCart} addLog={addLog} addToast={addToast} />}
        {tab === "order" && <CartOrder cart={cart} setCart={setCart} user={user} addLog={addLog} addToast={addToast} orderFlows={orderFlows} onPlaceOrder={onPlaceOrder} />}
        {tab === "log" && <EventLog logs={logs} clear={() => setLogs([])} />}
      </main>

      <NotifPanel open={notifOpen} onClose={() => setNotifOpen(false)} notifications={notifications.filter(n => ["PAYMENT_SUCCESS","PAYMENT_FAILED"].includes(n.type))} />
      <Toasts toasts={toasts} remove={removeToast} />
    </div>
  );
}
