/**
 * HBS Sentinel — Reports Tab
 * Three sections: Crisis History, Student Response Analytics, Regional Risk Map
 */

import React, { useEffect, useState } from "react";
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const API = "";

const HBS_CRIMSON = "#AC2134";
const HBS_CRIMSON_LIGHT = "#d4606e";
const AMBER = "#d97706";
const GREEN = "#16a34a";
const GRAY = "#6b7280";
const DARK_CARD = "#1e293b";
const DARKER = "#0f172a";

// ── Severity badge ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: number }) {
  const colors: Record<number, string> = {
    5: HBS_CRIMSON,
    4: "#c2410c",
    3: AMBER,
    2: "#ca8a04",
    1: GREEN,
  };
  const bg = colors[severity] ?? GRAY;
  return (
    <span
      style={{
        background: bg,
        color: "#fff",
        padding: "2px 10px",
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.05em",
      }}
    >
      {severity}/5
    </span>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div
      style={{
        background: DARK_CARD,
        borderRadius: 8,
        padding: "28px 32px",
        flex: 1,
        minWidth: 160,
      }}
    >
      <div style={{ fontSize: 48, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
        {value}
        {unit && <span style={{ fontSize: 20, color: "#9ca3af", marginLeft: 4 }}>{unit}</span>}
      </div>
      <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>
        {label}
      </div>
    </div>
  );
}

// ── Section 1: Crisis History ─────────────────────────────────────────────────

function CrisisHistory({ data }: { data: any }) {
  if (!data) return <div style={{ color: "#9ca3af" }}>Loading...</div>;
  const { summary, crisis_history } = data;

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
        <StatCard label="Total Crises This Semester" value={summary.total_crises} />
        <StatCard label="Average Response Time" value={summary.avg_response_time ?? "—"} unit="min" />
        <StatCard label="Fastest Response" value={summary.fastest_response ?? "—"} unit="min" />
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid #334155` }}>
              {["Crisis Name", "Date & Time", "Severity", "Location", "Students Affected", "Avg Response", "Status"].map(h => (
                <th key={h} style={{ padding: "10px 14px", textAlign: "left", color: "#9ca3af", fontWeight: 500, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {crisis_history.map((c: any, i: number) => (
              <tr
                key={c.id}
                style={{
                  background: i % 2 === 0 ? "#1a1a2e" : DARK_CARD,
                  borderBottom: "1px solid #1e293b",
                }}
              >
                <td style={{ padding: "12px 14px", color: "#f1f5f9", fontWeight: 500 }}>{c.name}</td>
                <td style={{ padding: "12px 14px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                  {new Date(c.triggered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  <br />
                  <span style={{ fontSize: 12 }}>
                    {new Date(c.triggered_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <SeverityBadge severity={c.severity} />
                </td>
                <td style={{ padding: "12px 14px", color: "#94a3b8" }}>{c.location}</td>
                <td style={{ padding: "12px 14px", color: "#f1f5f9", textAlign: "center" }}>{c.students_affected}</td>
                <td style={{ padding: "12px 14px", color: "#94a3b8", whiteSpace: "nowrap" }}>
                  {c.avg_response_time_minutes != null ? `${c.avg_response_time_minutes} min` : "—"}
                </td>
                <td style={{ padding: "12px 14px" }}>
                  <span style={{
                    color: c.status === "Active" ? HBS_CRIMSON : GREEN,
                    fontWeight: 600,
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 2: Student Response Analytics ────────────────────────────────────

function StudentAnalytics({ data }: { data: any }) {
  if (!data) return <div style={{ color: "#9ca3af" }}>Loading...</div>;
  const { response_rate, response_buckets, student_stats } = data;

  const donutData = [
    { name: "Confirmed Safe", value: response_rate.confirmed_safe },
    { name: "No Response", value: response_rate.no_response },
  ];
  const donutColors = [GREEN, "#334155"];

  const barData = Object.entries(response_buckets).map(([name, value]) => ({ name, value }));

  return (
    <div>
      {/* Charts row */}
      <div style={{ display: "flex", gap: 24, marginBottom: 32, flexWrap: "wrap" }}>
        {/* Donut chart */}
        <div style={{ background: DARK_CARD, borderRadius: 8, padding: "24px", flex: 1, minWidth: 280 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 16 }}>
            Response Rate
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
            % of affected students who confirmed safe
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={donutData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {donutData.map((_, index) => (
                  <Cell key={index} fill={donutColors[index]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: DARKER, border: "none", borderRadius: 6, color: "#f1f5f9" }}
                formatter={(value: any) => [`${value} students`, ""]}
              />
              <Legend
                wrapperStyle={{ color: "#9ca3af", fontSize: 13 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: GREEN }}>
              {response_rate.total > 0
                ? Math.round((response_rate.confirmed_safe / response_rate.total) * 100)
                : 0}%
            </span>
            <span style={{ fontSize: 13, color: "#9ca3af", marginLeft: 8 }}>confirmed safe</span>
          </div>
        </div>

        {/* Bar chart */}
        <div style={{ background: DARK_CARD, borderRadius: 8, padding: "24px", flex: 2, minWidth: 320 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>
            Response Time Distribution
          </div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
            Time from alert sent to "I Am Safe" confirmation
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} />
              <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: DARKER, border: "none", borderRadius: 6, color: "#f1f5f9" }}
                formatter={(v: any) => [`${v} crisis events`, "Count"]}
              />
              <Bar dataKey="value" fill={HBS_CRIMSON} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Student status table */}
      <div style={{ background: DARK_CARD, borderRadius: 8, padding: "24px" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 16 }}>
          Student Status Breakdown
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #334155" }}>
              {["Student", "Current Location", "Crises Involved", "Avg Response Time", "Current Status"].map(h => (
                <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#9ca3af", fontWeight: 500, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {student_stats.map((s: any, i: number) => {
              const statusColor = s.risk_status === "AFFECTED" ? HBS_CRIMSON
                : s.risk_status === "AT_RISK" ? AMBER
                : s.risk_status === "SAFE" ? GREEN
                : GRAY;
              return (
                <tr key={s.id} style={{ background: i % 2 === 0 ? "#1a1a2e" : DARK_CARD, borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "10px 12px", color: "#f1f5f9", fontWeight: 500 }}>{s.name}</td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{s.current_city}</td>
                  <td style={{ padding: "10px 12px", color: "#f1f5f9", textAlign: "center" }}>
                    {s.crises_involved > 0 ? (
                      <span style={{ background: "#1e293b", border: `1px solid ${HBS_CRIMSON}`, color: HBS_CRIMSON, borderRadius: 12, padding: "2px 10px", fontSize: 12 }}>
                        {s.crises_involved}
                      </span>
                    ) : (
                      <span style={{ color: GRAY }}>0</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px", color: "#94a3b8" }}>
                    {s.avg_response_time != null ? `${s.avg_response_time} min` : "—"}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ color: statusColor, fontWeight: 600, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {s.risk_status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Section 3: Regional Risk Map ──────────────────────────────────────────────

function RegionalRiskMap({ data }: { data: any }) {
  if (!data) return <div style={{ color: "#9ca3af" }}>Loading...</div>;
  const { region_counts, student_concentration } = data;

  // Sort regions by crisis count
  const sortedRegions = Object.entries(region_counts as Record<string, number>)
    .sort(([, a], [, b]) => (b as number) - (a as number));

  const maxCount = Math.max(...sortedRegions.map(([, v]) => v as number), 1);

  const barData = sortedRegions.map(([region, count]) => ({
    region,
    crises: count,
    students: (student_concentration as Record<string, number>)[region] ?? 0,
  }));

  return (
    <div>
      {/* Horizontal bar chart */}
      <div style={{ background: DARK_CARD, borderRadius: 8, padding: "24px", marginBottom: 24 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>
          Crisis Events by Region
        </div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>
          Ranked by number of crisis events this semester
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {sortedRegions.map(([region, count]) => {
            const pct = ((count as number) / maxCount) * 100;
            return (
              <div key={region}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 14, color: "#f1f5f9" }}>{region}</span>
                  <span style={{ fontSize: 13, color: "#9ca3af" }}>
                    {count as number} {(count as number) === 1 ? "event" : "events"}
                  </span>
                </div>
                <div style={{ background: "#1a1a2e", borderRadius: 4, height: 10, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: pct > 0 ? HBS_CRIMSON : "#334155",
                      borderRadius: 4,
                      transition: "width 0.6s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Student concentration */}
      <div style={{ background: DARK_CARD, borderRadius: 8, padding: "24px" }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 4 }}>
          Current Student Concentration
        </div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 20 }}>
          How many students are currently in each region
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 20, left: 80, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="region" tick={{ fill: "#9ca3af", fontSize: 12 }} width={80} />
            <Tooltip
              contentStyle={{ background: DARKER, border: "none", borderRadius: 6, color: "#f1f5f9" }}
              formatter={(v: any, name: any) => [
                `${v} ${name === "crises" ? "events" : "students"}`,
                name === "crises" ? "Crisis Events" : "Students",
              ]}
            />
            <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
            <Bar dataKey="students" name="Students" fill={HBS_CRIMSON_LIGHT} radius={[0, 4, 4, 0]} />
            <Bar dataKey="crises" name="Crisis Events" fill={HBS_CRIMSON} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Main Reports Component ────────────────────────────────────────────────────

type Section = "history" | "analytics" | "regional";

export default function ReportsTab() {
  const [activeSection, setActiveSection] = useState<Section>("history");
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/api/reports`)
      .then(r => r.json())
      .then(d => {
        setReportData(d);
        setLoading(false);
      })
      .catch(e => {
        setError("Failed to load reports data.");
        setLoading(false);
      });
  }, []);

  const sections: { id: Section; label: string }[] = [
    { id: "history", label: "Crisis History" },
    { id: "analytics", label: "Student Response Analytics" },
    { id: "regional", label: "Regional Risk Map" },
  ];

  return (
    <div style={{ padding: "0 0 32px 0" }}>
      {/* Sub-tab navigation */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #334155", marginBottom: 28 }}>
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeSection === s.id ? `2px solid ${HBS_CRIMSON}` : "2px solid transparent",
              color: activeSection === s.id ? "#f1f5f9" : "#9ca3af",
              padding: "10px 20px",
              fontSize: 14,
              fontWeight: activeSection === s.id ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s",
              marginBottom: -1,
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {loading && (
        <div style={{ color: "#9ca3af", textAlign: "center", padding: 48 }}>
          Loading reports data...
        </div>
      )}
      {error && (
        <div style={{ color: HBS_CRIMSON, textAlign: "center", padding: 48 }}>{error}</div>
      )}
      {!loading && !error && reportData && (
        <>
          {activeSection === "history" && <CrisisHistory data={reportData} />}
          {activeSection === "analytics" && <StudentAnalytics data={reportData} />}
          {activeSection === "regional" && <RegionalRiskMap data={reportData} />}
        </>
      )}
    </div>
  );
}
