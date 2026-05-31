import { useEffect, useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import { api } from "../lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import {
  Users, ListChecks, IndianRupee, Flame, Wallet, Gift,
  Filter, MessageCircle, Loader2, Plus,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { buildInquiryWhatsApp } from "../lib/whatsapp";
import { toast } from "sonner";

export default function Admin() {
  const { user, loading } = useAuth();
  const [stats, setStats] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [filters, setFilters] = useState({ status: "", lead_score: "", service_type: "", q: "" });
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    setRefreshing(true);
    try {
      const [s, i] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/inquiries", { params: cleanFilters(filters) }),
      ]);
      setStats(s.data);
      setInquiries(i.data);
    } catch (e) {
      toast.error("Failed to load admin data");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { if (user?.role === "admin") load(); /* eslint-disable-next-line */ }, [user]);
  useEffect(() => { if (user?.role === "admin") load(); /* eslint-disable-next-line */ }, [JSON.stringify(filters)]);

  if (loading) return <div className="p-10 text-center text-rk-muted">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/admin/inquiries/${id}`, { status });
      toast.success(`Status → ${status}`);
      load();
    } catch { toast.error("Update failed"); }
  };

  return (
    <div className="min-h-screen max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10" data-testid="admin-page">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs uppercase font-bold tracking-widest text-rk-orange">Admin Dashboard</div>
          <h1 className="font-heading font-extrabold text-3xl sm:text-4xl text-rk-navy mt-1 tracking-tight">
            Mission control
          </h1>
        </div>
        <Button onClick={load} disabled={refreshing} variant="outline" className="rounded-full" data-testid="admin-refresh">
          {refreshing ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
          Refresh
        </Button>
      </div>

      {/* KPI cards */}
      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4" data-testid="admin-kpis">
        <Kpi label="Total inquiries" value={stats?.total_inquiries ?? "—"} icon={<ListChecks size={18} />} accent="#0A2E6D" />
        <Kpi label="Users" value={stats?.users ?? "—"} icon={<Users size={18} />} accent="#0A2E6D" />
        <Kpi label="Hot leads" value={stats?.by_lead_score?.hot ?? 0} icon={<Flame size={18} />} accent="#FF7A00" />
        <Kpi label="Est. revenue (converted)" value={stats ? `₹${stats.estimated_revenue?.toLocaleString()}` : "—"} icon={<IndianRupee size={18} />} accent="#16A34A" />
      </div>

      <Tabs defaultValue="leads" className="mt-8">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="leads" data-testid="admin-tab-leads">Leads</TabsTrigger>
          <TabsTrigger value="drivers" data-testid="admin-tab-drivers">Drivers</TabsTrigger>
          <TabsTrigger value="users" data-testid="admin-tab-users">Users</TabsTrigger>
          <TabsTrigger value="referrals" data-testid="admin-tab-referrals">Referrals</TabsTrigger>
          <TabsTrigger value="transactions" data-testid="admin-tab-transactions">Transactions</TabsTrigger>
          <TabsTrigger value="analytics" data-testid="admin-tab-analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-6 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end" data-testid="admin-filters">
            <Input placeholder="Search name/phone/route" value={filters.q}
              onChange={(e) => setFilters({ ...filters, q: e.target.value })} className="h-11" data-testid="filter-search" />
            <Select value={filters.lead_score || "all"} onValueChange={(v) => setFilters({ ...filters, lead_score: v === "all" ? "" : v })}>
              <SelectTrigger className="h-11" data-testid="filter-score"><SelectValue placeholder="Lead score" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All scores</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="cold">Cold</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v })}>
              <SelectTrigger className="h-11" data-testid="filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {["new","contacted","quoted","converted","closed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.service_type || "all"} onValueChange={(v) => setFilters({ ...filters, service_type: v === "all" ? "" : v })}>
              <SelectTrigger className="h-11" data-testid="filter-service"><SelectValue placeholder="Service" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All services</SelectItem>
                {["car","auto","bike","tempo","bus","porter","goods"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-2xl border border-rk-border bg-white overflow-x-auto" data-testid="admin-table">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-slate-50 text-rk-muted text-xs uppercase tracking-widest">
                <tr>
                  <th className="text-left p-3">Service</th>
                  <th className="text-left p-3">Route</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Score</th>
                  <th className="text-left p-3">Quote</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.length === 0 && (
                  <tr><td colSpan={7} className="p-8 text-center text-rk-muted">No inquiries match.</td></tr>
                )}
                {inquiries.map((i) => (
                  <tr key={i.id} className="border-t border-rk-border" data-testid={`admin-row-${i.id}`}>
                    <td className="p-3"><span className="font-semibold text-rk-ink uppercase">{i.service_type}</span>
                      {i.vehicle_category && <div className="text-xs text-rk-muted">{i.vehicle_category}</div>}
                    </td>
                    <td className="p-3">
                      <div className="font-medium text-rk-ink">{i.pickup} → {i.destination || "—"}</div>
                      <div className="text-xs text-rk-muted">{i.journey_date} {i.passengers ? `· ${i.passengers} pax` : ""}</div>
                    </td>
                    <td className="p-3">
                      <div>{i.customer_name || "—"}</div>
                      <div className="text-xs text-rk-muted">{i.customer_phone}</div>
                    </td>
                    <td className="p-3"><ScoreBadge score={i.lead_score} /></td>
                    <td className="p-3 font-mono">
                      {i.quote_min ? `₹${i.quote_min.toLocaleString()}–${i.quote_max.toLocaleString()}` : "—"}
                    </td>
                    <td className="p-3">
                      <Select value={i.status} onValueChange={(v) => updateStatus(i.id, v)}>
                        <SelectTrigger className="h-8 w-32 text-xs" data-testid={`status-select-${i.id}`}><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["new","contacted","quoted","converted","closed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-3">
                      <a href={buildInquiryWhatsApp({ inquiry: i, number: i.customer_phone || "919955095226" })}
                         target="_blank" rel="noreferrer"
                         className="inline-flex items-center gap-1 bg-[#25D366] text-white rounded-full px-3 py-1 text-xs font-semibold"
                         data-testid={`wa-row-${i.id}`}>
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6 grid md:grid-cols-2 gap-4">
          <ChartCard title="By service">
            <BarChart data={Object.entries(stats?.by_service || {}).map(([k, v]) => ({ name: k, count: v }))}>
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#0A2E6D" radius={[6,6,0,0]} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Lead score split">
            <PieChart>
              <Pie data={[
                { name: "Hot", value: stats?.by_lead_score?.hot || 0 },
                { name: "Warm", value: stats?.by_lead_score?.warm || 0 },
                { name: "Cold", value: stats?.by_lead_score?.cold || 0 },
              ]} dataKey="value" outerRadius={90} label>
                <Cell fill="#FF7A00" />
                <Cell fill="#F59E0B" />
                <Cell fill="#3B82F6" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ChartCard>
          <ChartCard title="Status funnel">
            <BarChart layout="vertical" data={Object.entries(stats?.by_status || {}).map(([k, v]) => ({ name: k, count: v }))}>
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="name" type="category" />
              <Tooltip />
              <Bar dataKey="count" fill="#FF7A00" radius={[0,6,6,0]} />
            </BarChart>
          </ChartCard>
          <ChartCard title="Inquiries (last 7 days)">
            <LineChart data={(stats?.trend || []).map((p) => ({ date: p._id, count: p.count }))}>
              <XAxis dataKey="date" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#0A2E6D" strokeWidth={3} dot={{ fill: "#FF7A00", r: 4 }} />
            </LineChart>
          </ChartCard>
        </TabsContent>

        <TabsContent value="drivers" className="mt-6">
          <DriversTab />
        </TabsContent>

        <TabsContent value="users" className="mt-6">
          <UsersTab />
        </TabsContent>

        <TabsContent value="referrals" className="mt-6">
          <ReferralsTab />
        </TabsContent>

        <TabsContent value="transactions" className="mt-6">
          <TransactionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DriversTab() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/drivers");
      setDrivers(r.data);
    } catch { toast.error("Failed to load drivers"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const review = async (driverId, status) => {
    try {
      await api.post(`/admin/drivers/${driverId}/kyc`, { status });
      toast.success(`KYC ${status}`);
      load();
    } catch { toast.error("Failed"); }
  };

  if (loading) return <div className="text-rk-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>;

  return (
    <div className="rounded-2xl border border-rk-border bg-white overflow-x-auto" data-testid="admin-drivers-table">
      <table className="w-full text-sm min-w-[900px]">
        <thead className="bg-slate-50 text-rk-muted text-xs uppercase tracking-widest">
          <tr>
            <th className="text-left p-3">Driver</th>
            <th className="text-left p-3">Vehicle</th>
            <th className="text-left p-3">City</th>
            <th className="text-left p-3">Status</th>
            <th className="text-left p-3">Rating</th>
            <th className="text-left p-3">KYC</th>
            <th className="text-left p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {drivers.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-rk-muted">No drivers signed up yet.</td></tr>}
          {drivers.map((d) => (
            <tr key={d.user_id} className="border-t border-rk-border" data-testid={`admin-driver-row-${d.user_id}`}>
              <td className="p-3">
                <div className="font-semibold text-rk-ink">{d.name}</div>
                <div className="text-xs text-rk-muted">{d.phone}</div>
              </td>
              <td className="p-3">
                <div className="uppercase font-semibold text-rk-ink">{d.vehicle_type || "—"}</div>
                <div className="text-xs text-rk-muted">{d.vehicle_category} · {d.vehicle_number || "—"}</div>
              </td>
              <td className="p-3">{d.base_city || "—"}</td>
              <td className="p-3">
                <span className={`inline-flex items-center gap-1 text-xs font-bold uppercase ${d.online ? "text-green-600" : "text-rk-muted"}`}>
                  <span className={`w-2 h-2 rounded-full ${d.online ? "bg-green-500" : "bg-slate-400"}`} />
                  {d.online ? "Online" : "Offline"}
                </span>
              </td>
              <td className="p-3">
                <div className="flex items-center gap-1">
                  ⭐ <b>{d.rating_avg?.toFixed?.(1) || "—"}</b>
                  <span className="text-xs text-rk-muted">({d.rating_count || 0})</span>
                </div>
              </td>
              <td className="p-3">
                <Badge style={{
                  background: d.kyc_status === "approved" ? "#16A34A" :
                              d.kyc_status === "rejected" ? "#DC2626" : "#F59E0B",
                  color: "white"
                }} className="uppercase font-bold tracking-widest text-[10px]">
                  {d.kyc_status}
                </Badge>
              </td>
              <td className="p-3 flex gap-1 flex-wrap">
                {d.kyc_status !== "approved" && (
                  <Button size="sm" onClick={() => review(d.user_id, "approved")}
                    className="bg-green-600 hover:bg-green-700 text-white rounded-full h-8 text-xs"
                    data-testid={`approve-${d.user_id}`}>
                    Approve
                  </Button>
                )}
                {d.kyc_status !== "rejected" && (
                  <Button size="sm" variant="outline" onClick={() => review(d.user_id, "rejected")}
                    className="rounded-full h-8 text-xs"
                    data-testid={`reject-${d.user_id}`}>
                    Reject
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creditUser, setCreditUser] = useState(null);
  const [creditAmount, setCreditAmount] = useState(100);
  const [creditNote, setCreditNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get("/admin/users/full");
      setUsers(r.data);
    } catch { toast.error("Failed to load users"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const credit = async () => {
    if (!creditUser || !creditAmount || creditAmount <= 0) return;
    setSubmitting(true);
    try {
      await api.post("/admin/wallet/credit", {
        user_id: creditUser.id, amount: Number(creditAmount), note: creditNote || "Admin credit",
      });
      toast.success(`Credited ₹${creditAmount} to ${creditUser.name}`);
      setCreditUser(null); setCreditAmount(100); setCreditNote("");
      load();
    } catch { toast.error("Credit failed"); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="text-rk-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>;

  return (
    <div className="rounded-2xl border border-rk-border bg-white overflow-x-auto" data-testid="admin-users-table">
      <table className="w-full text-sm min-w-[800px]">
        <thead className="bg-slate-50 text-rk-muted text-xs uppercase tracking-widest">
          <tr>
            <th className="text-left p-3">User</th>
            <th className="text-left p-3">Phone</th>
            <th className="text-left p-3">Wallet</th>
            <th className="text-left p-3">Referral</th>
            <th className="text-left p-3">Role</th>
            <th className="text-left p-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-rk-muted">No users yet.</td></tr>}
          {users.map((u) => (
            <tr key={u.id} className="border-t border-rk-border" data-testid={`admin-user-row-${u.id}`}>
              <td className="p-3"><div className="font-semibold text-rk-ink">{u.name}</div><div className="text-xs text-rk-muted">{u.email}</div></td>
              <td className="p-3">{u.phone || "—"}</td>
              <td className="p-3 font-heading font-bold text-rk-navy">₹{Number(u.balance || 0).toLocaleString()}</td>
              <td className="p-3">
                <div className="font-mono text-rk-ink">{u.referral_code || "—"}</div>
                <div className="text-xs text-rk-muted">{u.referred_count || 0} invited</div>
              </td>
              <td className="p-3"><Badge variant={u.role === "admin" ? "default" : "outline"} className="uppercase text-[10px]">{u.role}</Badge></td>
              <td className="p-3">
                <Button onClick={() => setCreditUser(u)} variant="outline" size="sm" className="rounded-full" data-testid={`admin-credit-${u.id}`}>
                  <Plus size={12} className="mr-1" /> Credit wallet
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!creditUser} onOpenChange={(o) => !o && setCreditUser(null)}>
        <DialogContent data-testid="credit-dialog">
          <DialogHeader>
            <DialogTitle>Credit wallet — {creditUser?.name}</DialogTitle>
            <DialogDescription>Add bonus credits to this user's wallet.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Amount (₹)</Label>
              <Input type="number" min={1} value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)} className="h-11 mt-1" data-testid="credit-amount" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest font-bold text-rk-muted">Note (optional)</Label>
              <Input value={creditNote} onChange={(e) => setCreditNote(e.target.value)}
                placeholder="e.g. festival bonus" className="h-11 mt-1" data-testid="credit-note" />
            </div>
            <Button onClick={credit} disabled={submitting}
              className="w-full bg-rk-orange hover:bg-rk-orange-600 text-white h-11 rounded-full" data-testid="credit-submit">
              {submitting ? <Loader2 size={14} className="animate-spin" /> : `Credit ₹${creditAmount}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ReferralsTab() {
  const [refs, setRefs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/admin/referrals").then((r) => setRefs(r.data)).finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="text-rk-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>;
  return (
    <div className="rounded-2xl border border-rk-border bg-white overflow-x-auto" data-testid="admin-referrals-table">
      <table className="w-full text-sm min-w-[600px]">
        <thead className="bg-slate-50 text-rk-muted text-xs uppercase tracking-widest">
          <tr>
            <th className="text-left p-3">Owner</th>
            <th className="text-left p-3">Code</th>
            <th className="text-left p-3">Invited</th>
            <th className="text-left p-3">Earned</th>
          </tr>
        </thead>
        <tbody>
          {refs.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-rk-muted">No referrals yet.</td></tr>}
          {refs.map((r) => (
            <tr key={r.id} className="border-t border-rk-border">
              <td className="p-3"><div className="font-semibold text-rk-ink">{r.owner_name}</div><div className="text-xs text-rk-muted">{r.owner_email}</div></td>
              <td className="p-3 font-mono font-bold text-rk-navy">{r.code}</td>
              <td className="p-3">{(r.referred_user_ids || []).length}</td>
              <td className="p-3 font-heading font-bold text-green-600">₹{Number(r.total_earned || 0).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionsTab() {
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get("/admin/transactions").then((r) => setTxns(r.data)).finally(() => setLoading(false));
  }, []);
  if (loading) return <div className="text-rk-muted flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</div>;
  return (
    <div className="rounded-2xl border border-rk-border bg-white overflow-x-auto" data-testid="admin-txn-table">
      <table className="w-full text-sm min-w-[600px]">
        <thead className="bg-slate-50 text-rk-muted text-xs uppercase tracking-widest">
          <tr>
            <th className="text-left p-3">Time</th>
            <th className="text-left p-3">User</th>
            <th className="text-left p-3">Type</th>
            <th className="text-left p-3">Amount</th>
            <th className="text-left p-3">Note</th>
          </tr>
        </thead>
        <tbody>
          {txns.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-rk-muted">No transactions yet.</td></tr>}
          {txns.map((t) => (
            <tr key={t.id} className="border-t border-rk-border">
              <td className="p-3 text-xs text-rk-muted">{(t.created_at || "").slice(0, 16).replace("T", " ")}</td>
              <td className="p-3 font-mono text-xs">{t.user_id.slice(0, 8)}…</td>
              <td className="p-3 capitalize">{t.type.replace("_", " ")}</td>
              <td className={`p-3 font-bold ${t.direction === "in" ? "text-green-600" : "text-red-600"}`}>
                {t.direction === "in" ? "+" : "−"}₹{Number(t.amount).toLocaleString()}
              </td>
              <td className="p-3 text-rk-muted">{t.note || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function cleanFilters(f) {
  const out = {};
  Object.entries(f).forEach(([k, v]) => { if (v) out[k] = v; });
  return out;
}

function Kpi({ label, value, icon, accent }) {
  return (
    <div className="rounded-2xl border border-rk-border bg-white p-5" data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase font-bold tracking-widest text-rk-muted">{label}</div>
        <div className="w-9 h-9 rounded-lg grid place-items-center" style={{ background: accent, color: "white" }}>{icon}</div>
      </div>
      <div className="font-heading font-extrabold text-3xl text-rk-navy mt-2">{value}</div>
    </div>
  );
}

function ScoreBadge({ score }) {
  const map = { hot: "#FF7A00", warm: "#F59E0B", cold: "#3B82F6" };
  return <Badge style={{ background: map[score], color: "white" }} className="uppercase font-bold tracking-widest text-[10px]">{score}</Badge>;
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-rk-border bg-white p-5">
      <div className="text-xs uppercase font-bold tracking-widest text-rk-muted mb-3">{title}</div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
