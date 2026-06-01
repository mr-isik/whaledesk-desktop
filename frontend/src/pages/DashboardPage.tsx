import { Activity, Box, Terminal, Server, Clock, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { GetRequestHistory } from "../../wailsjs/go/bindings/DatabaseBinding";
import { GetContainers, IsDaemonRunning } from "../../wailsjs/go/bindings/DockerBinding";
import { domain } from "../../wailsjs/go/models";

export default function DashboardPage() {
  const [isDaemonRunning, setIsDaemonRunning] = useState<boolean | null>(null);
  const [containers, setContainers] = useState<domain.Container[]>([]);
  const [apiLogs, setApiLogs] = useState<domain.APIRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const daemonStatus = await IsDaemonRunning();
      setIsDaemonRunning(daemonStatus);

      if (daemonStatus) {
        const cList = await GetContainers();
        setContainers(cList || []);
      } else {
        setContainers([]);
      }

      const logs = await GetRequestHistory();
      setApiLogs(logs || []);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const runningContainers = containers.filter(
    (c) => c.state === "running",
  ).length;

  const totalContainers = containers.length;
  const stoppedContainers = totalContainers - runningContainers;
  
  // Percentages for status bars
  const containerPercent = totalContainers > 0 ? (runningContainers / totalContainers) * 100 : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>System overview & infrastructure metrics</p>
        </div>
        <button 
          className="btn-outline" 
          onClick={handleManualRefresh} 
          disabled={refreshing}
          style={{ padding: "6px 12px", fontSize: "12px", gap: "6px" }}
        >
          <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} style={{ animation: refreshing ? "spin 1s linear infinite" : "" }} />
          {refreshing ? "Syncing..." : "Sync Systems"}
        </button>
      </div>

      {loading && containers.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px" }}>
          <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Querying system status...</div>
        </div>
      ) : (
        <>
          {/* Metrics Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "20px",
            }}
          >
            {/* Card 1: Docker Engine */}
            <div className="glass-card" style={{ overflow: "hidden" }}>
              {/* Subtle top indicator glow based on status */}
              <div 
                style={{ 
                  position: "absolute", 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  height: "2px", 
                  background: isDaemonRunning ? "var(--accent-primary)" : "var(--danger)" 
                }} 
              />
              
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "18px" }}>
                <div
                  style={{
                    padding: "10px",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: isDaemonRunning ? "var(--accent-primary)" : "var(--danger)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Activity size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Docker Engine
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "-0.02em", color: "var(--text-primary)", marginTop: "2px" }}>
                    {isDaemonRunning ? "Operational" : "Offline"}
                  </div>
                </div>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
                <span className={`badge ${isDaemonRunning ? "success" : "danger"}`}>
                  {isDaemonRunning ? "Connected" : "Disconnected"}
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>daemon-v20.10</span>
              </div>
            </div>

            {/* Card 2: Container Metrics */}
            <div className="glass-card">
              <div 
                style={{ 
                  position: "absolute", 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  height: "2px", 
                  background: "var(--accent-primary)" 
                }} 
              />
              
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "18px" }}>
                <div
                  style={{
                    padding: "10px",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--accent-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Box size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Container Orchestration
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "-0.02em", color: "var(--text-primary)", marginTop: "2px" }}>
                    {totalContainers} Total
                  </div>
                </div>
              </div>

              {/* Minimal bar chart to represent ratios */}
              <div style={{ width: "100%", height: "4px", background: "var(--bg-tertiary)", borderRadius: "2px", overflow: "hidden", margin: "14px 0" }}>
                <div style={{ width: `${containerPercent}%`, height: "100%", background: "var(--accent-primary)" }} />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <span className="badge success">{runningContainers} Active</span>
                <span className="badge neutral">{stoppedContainers} Inactive</span>
              </div>
            </div>

            {/* Card 3: SQLite Analytics */}
            <div className="glass-card">
              <div 
                style={{ 
                  position: "absolute", 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  height: "2px", 
                  background: "var(--accent-primary)" 
                }} 
              />
              
              <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "18px" }}>
                <div
                  style={{
                    padding: "10px",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)",
                    color: "var(--accent-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                >
                  <Terminal size={20} />
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Local SQLite Storage
                  </div>
                  <div style={{ fontSize: "20px", fontWeight: "700", letterSpacing: "-0.02em", color: "var(--text-primary)", marginTop: "2px" }}>
                    {apiLogs.length} Queries
                  </div>
                </div>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px" }}>
                <span className="badge neutral" style={{ background: "rgba(62, 207, 142, 0.05)", color: "var(--accent-primary)", border: "1px solid var(--border-active)" }}>
                  Autocommit Logs
                </span>
                <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "monospace" }}>dockit.db</span>
              </div>
            </div>
          </div>

          {/* Activity Console Section */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "20px" }}>
            <div className="glass-card" style={{ display: "flex", flexDirection: "column", padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", borderBottom: "1px solid var(--border)", paddingBottom: "12px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Clock size={16} color="var(--accent-primary)" />
                  Recent Activity Stream
                </h3>
                <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>Updates every 5s</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {apiLogs.length === 0 ? (
                  <div style={{ padding: "30px 10px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
                    No recorded activities. Use API Tester to generate API requests.
                  </div>
                ) : (
                  apiLogs.slice(0, 4).map((log) => {
                    const date = new Date(log.created_at as unknown as string);
                    return (
                      <div 
                        key={log.id} 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "space-between", 
                          padding: "10px 14px", 
                          background: "var(--bg-tertiary)", 
                          border: "1px solid var(--border)", 
                          borderRadius: "var(--radius-sm)",
                          transition: "border-color var(--transition-fast)"
                        }}
                        className="log-row"
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <span className={`badge ${log.status >= 200 && log.status < 300 ? "success" : "danger"}`} style={{ minWidth: "48px", justifyContent: "center" }}>
                            {log.status === 0 ? "ERR" : log.status}
                          </span>
                          <span style={{ fontWeight: 700, fontSize: "12px", minWidth: "48px", color: "var(--text-primary)" }}>
                            {log.method}
                          </span>
                          <span style={{ fontFamily: "var(--font-mono, 'Geist Mono', monospace)", fontSize: "12px", color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "400px" }}>
                            {log.url}
                          </span>
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          {date.toLocaleTimeString()}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Style animation spin locally */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
