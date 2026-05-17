import { Activity, Box, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { GetRequestHistory } from "../../wailsjs/go/bindings/DatabaseBinding";
import {
  GetContainers,
  IsDaemonRunning,
} from "../../wailsjs/go/bindings/DockerBinding";
import { domain } from "../../wailsjs/go/models";

export default function DashboardPage() {
  const [isDaemonRunning, setIsDaemonRunning] = useState<boolean | null>(null);
  const [containers, setContainers] = useState<domain.Container[]>([]);
  const [apiLogs, setApiLogs] = useState<domain.APIRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    // Auto refresh every 5 seconds
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
      }

      const logs = await GetRequestHistory();
      setApiLogs(logs || []);
    } catch (e) {
      console.error("Dashboard fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  const runningContainers = containers.filter(
    (c) => c.state === "running",
  ).length;

  return (
    <div>
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Overview of your Dockit system</p>

      {loading && containers.length === 0 ? (
        <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Loading system status...</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "16px",
          }}
        >
          {/* Daemon Status Card */}
          <div className="glass-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  padding: "10px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Activity size={20} />
              </div>
              <div>
                <div
                  style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                >
                  Docker Daemon
                </div>
                <div style={{ fontSize: "20px", fontWeight: "600", letterSpacing: "-0.02em" }}>
                  {isDaemonRunning ? "Online" : "Offline"}
                </div>
              </div>
            </div>
            <div className={`badge ${isDaemonRunning ? "success" : "danger"}`}>
              {isDaemonRunning ? "CONNECTED" : "DISCONNECTED"}
            </div>
          </div>

          {/* Containers Card */}
          <div className="glass-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  padding: "10px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Box size={20} />
              </div>
              <div>
                <div
                  style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                >
                  Total Containers
                </div>
                <div style={{ fontSize: "20px", fontWeight: "600", letterSpacing: "-0.02em" }}>
                  {containers.length}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <span className="badge success">{runningContainers} Running</span>
              <span className="badge neutral">
                {containers.length - runningContainers} Stopped
              </span>
            </div>
          </div>

          {/* API Requests Card */}
          <div className="glass-card">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  padding: "10px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <Terminal size={20} />
              </div>
              <div>
                <div
                  style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                >
                  API Requests
                </div>
                <div style={{ fontSize: "20px", fontWeight: "600", letterSpacing: "-0.02em" }}>
                  {apiLogs.length}
                </div>
              </div>
            </div>
            <span className="badge neutral">Recorded in DB</span>
          </div>
        </div>
      )}
    </div>
  );
}
