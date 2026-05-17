import { Activity, Box, Database, Settings, Terminal, ServerCog } from "lucide-react";
import { useState } from "react";
import ApiTesterPage from "../pages/ApiTesterPage";
import ContainersPage from "../pages/ContainersPage";
import DashboardPage from "../pages/DashboardPage";
import DatabaseLogsPage from "../pages/DatabaseLogsPage";
import DbManagerPage from "../pages/DbManagerPage";
import "./MainLayout.css";

// Importing pages (we'll create these next)

type PageType = "dashboard" | "containers" | "api" | "logs" | "db";

export default function MainLayout() {
  const [activePage, setActivePage] = useState<PageType>("dashboard");

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardPage />;
      case "containers":
        return <ContainersPage />;
      case "api":
        return <ApiTesterPage />;
      case "logs":
        return <DatabaseLogsPage />;
      case "db":
        return <DbManagerPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Box className="logo-icon" size={28} strokeWidth={2.5} />
          <span>Dockit</span>
        </div>

        <nav className="nav-links">
          <div
            className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
            onClick={() => setActivePage("dashboard")}
          >
            <Activity size={20} />
            <span>Dashboard</span>
          </div>

          <div
            className={`nav-item ${activePage === "containers" ? "active" : ""}`}
            onClick={() => setActivePage("containers")}
          >
            <Box size={20} />
            <span>Containers</span>
          </div>

          <div
            className={`nav-item ${activePage === "api" ? "active" : ""}`}
            onClick={() => setActivePage("api")}
          >
            <Terminal size={20} />
            <span>API Tester</span>
          </div>

          <div
            className={`nav-item ${activePage === "logs" ? "active" : ""}`}
            onClick={() => setActivePage("logs")}
          >
            <Database size={20} />
            <span>Database Logs</span>
          </div>

          <div
            className={`nav-item ${activePage === "db" ? "active" : ""}`}
            onClick={() => setActivePage("db")}
          >
            <ServerCog size={20} />
            <span>DB Manager</span>
          </div>
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }}></div>

        {/* Bottom settings item */}
        <div className="nav-item">
          <Settings size={20} />
          <span>Settings</span>
        </div>
      </aside>

      <main className="main-content">{renderContent()}</main>
    </div>
  );
}
