import { Activity, Box, Settings, Terminal, ServerCog, Layers, ScrollText } from "lucide-react";
import { useState, useEffect } from "react";
import ApiTesterPage from "../pages/ApiTesterPage";
import ContainerLogsPage from "../pages/ContainerLogsPage";
import ContainersPage from "../pages/ContainersPage";
import DashboardPage from "../pages/DashboardPage";

import DbManagerPage from "../pages/DbManagerPage";
import EnvironmentsPage from "../pages/EnvironmentsPage";
import { IsDaemonRunning } from "../../wailsjs/go/bindings/DockerBinding";
import { IsConnected } from "../../wailsjs/go/bindings/DbManagerBinding";
import "./MainLayout.css";

type PageType = "dashboard" | "containers" | "container-logs" | "api" | "db" | "envs";

export default function MainLayout() {
  const [activePage, setActivePage] = useState<PageType>("dashboard");
  const [dockerOnline, setDockerOnline] = useState<boolean>(false);
  const [dbOnline, setDbOnline] = useState<boolean>(false);
  const [selectedLogContainerId, setSelectedLogContainerId] = useState<string>("");

  useEffect(() => {
    checkInfraStatus();
    const interval = setInterval(checkInfraStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const checkInfraStatus = async () => {
    try {
      const daemon = await IsDaemonRunning();
      setDockerOnline(!!daemon);
    } catch (e) {
      setDockerOnline(false);
    }

    try {
      const db = await IsConnected();
      setDbOnline(!!db);
    } catch (e) {
      setDbOnline(false);
    }
  };

  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return <DashboardPage />;
      case "containers":
        return <ContainersPage onNavigateToLogs={(id) => {
          setSelectedLogContainerId(id);
          setActivePage("container-logs");
        }} />;
      case "container-logs":
        return <ContainerLogsPage 
          preselectedContainerId={selectedLogContainerId} 
          onContainerSelect={(id) => setSelectedLogContainerId(id)} 
        />;
      case "api":
        return <ApiTesterPage />;
      case "db":
        return <DbManagerPage />;
      case "envs":
        return <EnvironmentsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <Box className="logo-icon" size={22} strokeWidth={2.5} />
          <span>Dockit Console</span>
        </div>

        <nav className="nav-links">
          <div
            className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
            onClick={() => setActivePage("dashboard")}
          >
            <Activity size={18} />
            <span>Dashboard</span>
          </div>

          <div
            className={`nav-item ${activePage === "containers" ? "active" : ""}`}
            onClick={() => setActivePage("containers")}
          >
            <Box size={18} />
            <span>Containers</span>
          </div>

          <div
            className={`nav-item ${activePage === "container-logs" ? "active" : ""}`}
            onClick={() => setActivePage("container-logs")}
          >
            <ScrollText size={18} />
            <span>Container Logs</span>
          </div>

          <div
            className={`nav-item ${activePage === "api" ? "active" : ""}`}
            onClick={() => setActivePage("api")}
          >
            <Terminal size={18} />
            <span>API Tester</span>
          </div>


          <div
            className={`nav-item ${activePage === "db" ? "active" : ""}`}
            onClick={() => setActivePage("db")}
          >
            <ServerCog size={18} />
            <span>DB Manager</span>
          </div>

          <div
            className={`nav-item ${activePage === "envs" ? "active" : ""}`}
            onClick={() => setActivePage("envs")}
          >
            <Layers size={18} />
            <span>Environments</span>
          </div>
        </nav>

        {/* Dynamic Sidebar Infrastructure Widget */}
        <div className="sidebar-infra">
          <div className="sidebar-infra-title">Infrastructure</div>
          
          <div className="infra-status-item">
            <span>Docker Engine</span>
            <span className={`infra-indicator ${dockerOnline ? "online" : "offline"}`} title={dockerOnline ? "Connected" : "Disconnected"} />
          </div>

          <div className="infra-status-item">
            <span>DB Connection</span>
            <span className={`infra-indicator ${dbOnline ? "online" : "offline"}`} title={dbOnline ? "Active" : "Inactive"} />
          </div>
        </div>

        <div style={{ flex: 1 }}></div>

        <div className="nav-item" style={{ marginTop: "auto" }}>
          <Settings size={18} />
          <span>Settings</span>
        </div>
      </aside>

      <main className="main-content">{renderContent()}</main>
    </div>
  );
}
