import React, { useState, useEffect, useCallback } from "react";
import {
  ShieldCheck, LogIn, LogOut, Loader2, Package, Wallet, TrendingUp,
  Clock, Truck, CheckCircle2, RotateCcw, AlertTriangle,
} from "lucide-react";
import { adminLogin, createAdminApiClient } from "./api/adminAuth";

const GOLD = "#C9971C";
const GOLD_DARK = "#9C740F";
const INK = "#161513";

function money(n) {
  return "KES " + Math.round(Number(n) || 0).toLocaleString();
}

const STATUS_META = {
  pending_payment: { label: "Awaiting payment", color: "#8a8471", bg: "#F1EEE3", icon: Clock },
  escrow_held: { label: "In escrow", color: "#9C740F", bg: "#FBF1DA", icon: Clock },
  shipped: { label: "Shipped", color: "#1D4E89", bg: "#E7EFF9", icon: Truck },
  delivered: { label: "Delivered", color: "#2E7D32", bg: "#E9F5EA", icon: CheckCircle2 },
  refunded: { label: "Refunded", color: "#B3261E", bg: "#FBEAE9", icon: RotateCcw },
  disputed: { label: "Disputed", color: "#B3261E", bg: "#FBEAE9", icon: AlertTriangle },
};

const inputStyle = { flex: 1, padding: "9px 11px", borderRadius: 7, border: "1px solid #E4DFD0", fontSize: 13, boxSizing: "border-box" };

export default function AdminApp() {
  const [adminAuth, setAdminAuth] = useState(null); // { accessToken, refreshToken, admin }
  const [toast, setToast] = useState(null);

  const notify = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const adminApiFetch = useCallback(
    createAdminApiClient(
      () => adminAuth,
      (refreshed) => setAdminAuth((prev) => ({ ...prev, ...refreshed })),
      () => { setAdminAuth(null); notify("Session expired — please log in again"); }
    ),
    [adminAuth]
  );

  return (
    <div style={{ fontFamily: "'Segoe UI', Arial, sans-serif", background: "#FAF9F5", minHeight: "100vh", color: INK }}>
      <div style={{ background: "#fff", borderBottom: "1px solid #ECE8DD" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/savivah-mark-square.png" alt="" width="30" height="30" onError={(e) => { e.target.style.display = "none"; }} />
          <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: 0.5,
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DARK})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            SAVIVAH
          </span>
          <span style={{ fontSize: 11, color: "#7A7669", fontWeight: 600 }}>admin portal</span>
        </div>
      </div>

      {toast && (
        <div style={{ position: "fixed", top: 70, left: "50%", transform: "translateX(-50%)", background: INK, color: "#fff",
          padding: "10px 20px", borderRadius: 8, fontSize: 14, zIndex: 100, boxShadow: "0 6px 18px rgba(0,0,0,0.18)" }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "24px 20px 60px" }}>
        <AdminView adminAuth={adminAuth} setAdminAuth={setAdminAuth} adminApiFetch={adminApiFetch} notify={notify} />
      </div>
    </div>
  );
}

function AdminLoginForm({ onAuthed }) {
  const [form, setForm] = useState({ email: "", password: "", totpCode: "" });
  const [needsTotp, setNeedsTotp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const data = await adminLogin(form.email, form.password, form.totpCode || undefined);
      onAuthed(data);
    } catch (e) {
      if (e.message.toLowerCase().includes("2fa")) setNeedsTotp(true);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 380, margin: "40px auto", background: "#fff", border: "1px solid #ECE8DD", borderRadius: 14, padding: 28 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#F4F1E8", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ShieldCheck size={19} color={GOLD_DARK} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 17 }}>Admin sign-in</div>
      </div>
      <p style={{ fontSize: 12.5, color: "#8a8471", marginBottom: 18 }}>
        Admin accounts are created directly by the team — there's no public registration here.
      </p>
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <input type="email" placeholder="Admin email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} required />
        <input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} style={inputStyle} required />
        {needsTotp && (
          <input placeholder="6-digit authenticator code" value={form.totpCode} onChange={(e) => setForm({ ...form, totpCode: e.target.value })} style={inputStyle} />
        )}
        {error && <div style={{ fontSize: 12.5, color: "#B3261E" }}>{error}</div>}
        <button type="submit" disabled={loading} style={{ padding: "11px 0", borderRadius: 8, border: "none", background: INK,
          color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {loading ? <Loader2 size={15} className="spin" /> : <LogIn size={15} />} Sign in
        </button>
      </form>
    </div>
  );
}

function AdminView({ adminAuth, setAdminAuth, adminApiFetch, notify }) {
  const [tab, setTab] = useState("orders"); // orders | sellers | payouts
  const [orders, setOrders] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [o, s, sellerList, payoutList] = await Promise.all([
        adminApiFetch("/admin/orders"), adminApiFetch("/admin/stats"),
        adminApiFetch("/admin/sellers"), adminApiFetch("/admin/payouts"),
      ]);
      setOrders(o); setStats(s); setSellers(sellerList); setPayouts(payoutList);
    } catch (e) { notify(e.message); } finally { setLoading(false); }
  }, [adminApiFetch, notify]);

  useEffect(() => { if (adminAuth) load(); }, [adminAuth, load]);

  const dispatchPayout = async (payoutId) => {
    try {
      await adminApiFetch(`/admin/payouts/${payoutId}/mark-sent`, { method: "POST" });
      notify("Payout marked as sent");
      load();
    } catch (e) { notify(e.message); }
  };

  if (!adminAuth) {
    return <AdminLoginForm onAuthed={(data) => { setAdminAuth(data); notify(`Welcome, ${data.admin.fullName}`); }} />;
  }

  const tabs = [
    { key: "orders", label: "Orders" },
    { key: "sellers", label: "Sellers" },
    { key: "payouts", label: "Payouts" },
  ];

  return (
    <div>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>Admin panel</h1>
          <p style={{ color: "#77715f", fontSize: 14, margin: 0 }}>Signed in as {adminAuth.admin.email}</p>
        </div>
        <button onClick={() => { setAdminAuth(null); notify("Logged out of admin"); }} style={{
          display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 8,
          border: "1px solid #E4DFD0", background: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          <LogOut size={14} /> Log out
        </button>
      </div>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#9a9484", fontSize: 14, padding: 40, justifyContent: "center" }}>
          <Loader2 size={16} className="spin" /> Loading...
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
            <StatCard label="Commission earned" value={money(stats?.commission_earned)} sub="From delivered orders" icon={TrendingUp} />
            <StatCard label="Funds in escrow" value={money(stats?.in_escrow)} sub="Awaiting delivery" icon={Wallet} />
            <StatCard label="Total orders" value={stats?.total_orders ?? 0} sub="All time" icon={Package} />
          </div>

          <div style={{ display: "flex", gap: 4, background: "#F4F1E8", borderRadius: 10, padding: 4, marginBottom: 16, width: "fit-content" }}>
            {tabs.map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)} style={{
                padding: "7px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600,
                background: tab === t.key ? INK : "transparent", color: tab === t.key ? "#fff" : "#5B564A" }}>
                {t.label}
              </button>
            ))}
          </div>

          {tab === "orders" && (
            <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>All orders</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {orders.map((o) => <OrderRow key={o.id} order={o} storeName={o.store_name} />)}
                {orders.length === 0 && <div style={{ fontSize: 13, color: "#9a9484" }}>No orders placed on the platform yet.</div>}
              </div>
            </div>
          )}

          {tab === "sellers" && (
            <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Sellers — earnings per store</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sellers.map((s) => (
                  <div key={s.id} style={{ border: "1px solid #EFEBDF", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.name} {s.verified && <span style={{ fontSize: 10.5, color: "#2E7D32", background: "#E9F5EA", padding: "2px 7px", borderRadius: 10, marginLeft: 6 }}>Verified</span>}</div>
                      <div style={{ fontSize: 12, color: "#8a8471" }}>{s.owner_name} · {s.owner_email} · {s.total_orders} orders</div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 12.5 }}>
                      <div>Pending escrow: <b>{money(s.pending_escrow)}</b></div>
                      <div>Total earned: <b>{money(s.total_earned)}</b></div>
                    </div>
                  </div>
                ))}
                {sellers.length === 0 && <div style={{ fontSize: 13, color: "#9a9484" }}>No stores registered yet.</div>}
              </div>
            </div>
          )}

          {tab === "payouts" && (
            <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 18 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Payouts to dispatch</div>
              <div style={{ fontSize: 12, color: "#8a8471", marginBottom: 12 }}>Send the money via M-Pesa/bank yourself, then mark it sent here.</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {payouts.map((p) => (
                  <div key={p.id} style={{ border: "1px solid #EFEBDF", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13.5 }}>{p.store_name}</div>
                      <div style={{ fontSize: 12, color: "#8a8471" }}>{money(p.amount)} via {p.payout_method || "—"} · {p.payout_account || "no payout account on file"}</div>
                    </div>
                    {p.status === "pending" ? (
                      <button onClick={() => dispatchPayout(p.id)} style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: GOLD, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
                        Mark sent
                      </button>
                    ) : (
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "#2E7D32", background: "#E9F5EA", padding: "4px 10px", borderRadius: 20 }}>Sent</span>
                    )}
                  </div>
                ))}
                {payouts.length === 0 && <div style={{ fontSize: 13, color: "#9a9484" }}>No payouts yet — these appear once an order is delivered.</div>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function OrderRow({ order, storeName }) {
  const meta = STATUS_META[order.status] || STATUS_META.pending_payment;
  const Icon = meta.icon;
  return (
    <div style={{ border: "1px solid #EFEBDF", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
        <div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: "#5B564A" }}>
            {storeName ? `${storeName} · ` : ""}Order #{String(order.id).slice(-6)}
          </div>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, color: meta.color, background: meta.bg, padding: "4px 10px", borderRadius: 20 }}>
          <Icon size={12} /> {meta.label}
        </span>
      </div>
      <div style={{ fontSize: 12.5, color: "#5B564A", marginTop: 10 }}>
        Total <b>{money(order.subtotal)}</b> &nbsp;·&nbsp; Payout <b>{money(order.payout_amount)}</b>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #ECE8DD", borderRadius: 12, padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#9a9484", fontSize: 12, fontWeight: 600, marginBottom: 8 }}><Icon size={14} /> {label}</div>
      <div style={{ fontSize: 19, fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "#9a9484", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
