import { createFileRoute } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { channelMix, reportSeries } from "@/lib/mock-ops";

export const Route = createFileRoute("/dashboard/reports")({
  component: ReportsView,
});

const COLORS = ["#B85042", "#3B2A22", "#A7BEAE", "#C99A4A", "#8b6d4e"];

function ReportsView() {
  const series = reportSeries();
  const mix = channelMix();

  const avgADR = Math.round(series.reduce((s, r) => s + r.adr, 0) / series.length);
  const avgOcc = Math.round(series.reduce((s, r) => s + r.occupancy, 0) / series.length);
  const avgRevpar = Math.round(series.reduce((s, r) => s + r.revpar, 0) / series.length);
  const totalRev = series.reduce((s, r) => s + r.revenue, 0);

  const short = (d: string) => d.slice(5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl">Reporting</h2>
        <p className="text-xs text-espresso/50">Last 30 days · all channels</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPI label="Avg. Occupancy" value={`${avgOcc}%`} />
        <KPI label="ADR" value={`$${avgADR}`} sub="Avg. daily rate" />
        <KPI label="RevPAR" value={`$${avgRevpar}`} sub="Revenue per avail. room" />
        <KPI label="Total revenue" value={`$${totalRev.toLocaleString()}`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="ADR & RevPAR trend">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3B2A2220" />
              <XAxis dataKey="date" tickFormatter={short} stroke="#3B2A2270" fontSize={10} />
              <YAxis stroke="#3B2A2270" fontSize={10} />
              <Tooltip contentStyle={{ background: "#FBF8F3", border: "1px solid #3B2A2220" }} />
              <Line type="monotone" dataKey="adr" stroke="#B85042" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="revpar" stroke="#3B2A22" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Occupancy %">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="occ" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A7BEAE" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="#A7BEAE" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#3B2A2220" />
              <XAxis dataKey="date" tickFormatter={short} stroke="#3B2A2270" fontSize={10} />
              <YAxis stroke="#3B2A2270" fontSize={10} unit="%" />
              <Tooltip contentStyle={{ background: "#FBF8F3", border: "1px solid #3B2A2220" }} />
              <Area
                type="monotone"
                dataKey="occupancy"
                stroke="#3B2A22"
                fill="url(#occ)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue by day">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#3B2A2220" />
              <XAxis dataKey="date" tickFormatter={short} stroke="#3B2A2270" fontSize={10} />
              <YAxis stroke="#3B2A2270" fontSize={10} />
              <Tooltip contentStyle={{ background: "#FBF8F3", border: "1px solid #3B2A2220" }} />
              <Bar dataKey="revenue" fill="#C99A4A" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Channel mix">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={mix}
                dataKey="revenue"
                nameKey="channel"
                innerRadius={55}
                outerRadius={95}
                paddingAngle={2}
              >
                {mix.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#FBF8F3", border: "1px solid #3B2A2220" }} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="mt-2 text-xs grid grid-cols-2 gap-y-1">
            {mix.map((m, i) => (
              <li key={m.channel} className="flex items-center gap-2 capitalize">
                <span
                  className="inline-block w-3 h-3 rounded-sm"
                  style={{ background: COLORS[i % COLORS.length] }}
                />
                {m.channel} · ${m.revenue.toLocaleString()}
              </li>
            ))}
          </ul>
        </ChartCard>
      </div>
    </div>
  );
}

function KPI({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white p-5 border border-espresso/10">
      <div className="text-[10px] uppercase tracking-widest text-espresso/40">{label}</div>
      <div className="font-serif text-3xl mt-1">{value}</div>
      {sub ? <div className="text-xs text-espresso/50 mt-1">{sub}</div> : null}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-espresso/10 p-6">
      <h3 className="font-serif text-lg mb-4">{title}</h3>
      {children}
    </div>
  );
}