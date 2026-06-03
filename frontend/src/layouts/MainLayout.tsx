import {
  Activity,
  Box,
  ChevronDown,
  Layers,
  Moon,
  ScrollText,
  ServerCog,
  Settings,
  Sun,
  Terminal,
} from "lucide-react";
import { useEffect, useState } from "react";
import ApiTesterPage from "../pages/ApiTesterPage";
import ContainerLogsPage from "../pages/ContainerLogsPage";
import ContainersPage from "../pages/ContainersPage";
import DashboardPage from "../pages/DashboardPage";

import { IsConnected } from "../../wailsjs/go/bindings/DbManagerBinding";
import { IsDaemonRunning } from "../../wailsjs/go/bindings/DockerBinding";
import DbManagerPage from "../pages/DbManagerPage";
import EnvironmentsPage from "../pages/EnvironmentsPage";
import SettingsPage from "../pages/SettingsPage";
import "./MainLayout.css";

type PageType =
  | "dashboard"
  | "containers"
  | "container-logs"
  | "api"
  | "db"
  | "envs"
  | "settings";

export default function MainLayout() {
  const [activePage, setActivePage] = useState<PageType>("dashboard");
  const [dockerOnline, setDockerOnline] = useState<boolean>(false);
  const [dbOnline, setDbOnline] = useState<boolean>(false);
  const [selectedLogContainerId, setSelectedLogContainerId] =
    useState<string>("");

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (
      (localStorage.getItem("whaledesk-theme") as "light" | "dark") || "dark"
    );
  });

  useEffect(() => {
    // Sync theme attribute with html element
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    // Listen for theme changes from other components (like Settings page)
    const handleThemeChange = () => {
      const currentTheme =
        (localStorage.getItem("whaledesk-theme") as "light" | "dark") || "dark";
      setTheme(currentTheme);
    };
    window.addEventListener("whaledesk-theme-change", handleThemeChange);
    return () =>
      window.removeEventListener("whaledesk-theme-change", handleThemeChange);
  }, []);

  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    localStorage.setItem("whaledesk-theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    window.dispatchEvent(new Event("whaledesk-theme-change"));
  };

  useEffect(() => {
    checkInfraStatus();
    const interval = setInterval(checkInfraStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Global Keyboard Shortcuts for High-Productivity UX
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Check if user is actively editing text in form controls
      const active = document.activeElement;
      const isInput =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.tagName === "SELECT" ||
          active.getAttribute("contenteditable") === "true");

      // Escape key unfocuses active search/input fields
      if (e.key === "Escape" && isInput) {
        (active as HTMLElement).blur();
        return;
      }

      // Ignore navigation numbers if user is typing
      if (isInput) return;

      // 2. Navigation switching: 1-6 keys
      if (e.key === "1") {
        setActivePage("dashboard");
      } else if (e.key === "2") {
        setActivePage("containers");
      } else if (e.key === "3") {
        setActivePage("container-logs");
      } else if (e.key === "4") {
        setActivePage("api");
      } else if (e.key === "5") {
        setActivePage("db");
      } else if (e.key === "6") {
        setActivePage("envs");
      } else if (e.key === ",") {
        if (e.metaKey || e.ctrlKey) {
          e.preventDefault();
          setActivePage("settings");
        }
      }

      // 3. Focus Search/Filter controls: '/' or 's'
      else if (e.key === "/" || e.key === "s") {
        e.preventDefault();
        const searchInput = document.querySelector(
          'input[placeholder*="Search"], input[placeholder*="Filter"], input[placeholder*="search"], input[placeholder*="filter"]',
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }

      // 4. Refresh/Sync active panels: 'r' / 'R'
      else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        const refreshBtn = document.querySelector(
          'button[title*="Refresh"], button[title*="Sync"], button:has(svg.animate-spin)',
        ) as HTMLButtonElement;

        const allButtons = Array.from(document.querySelectorAll("button"));
        const targetBtn =
          refreshBtn ||
          allButtons.find(
            (btn) =>
              btn.innerText.toLowerCase().includes("sync") ||
              btn.innerText.toLowerCase().includes("refresh"),
          );

        if (targetBtn && !targetBtn.disabled) {
          targetBtn.click();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
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
        return (
          <ContainersPage
            onNavigateToLogs={(id) => {
              setSelectedLogContainerId(id);
              setActivePage("container-logs");
            }}
          />
        );
      case "container-logs":
        return (
          <ContainerLogsPage
            preselectedContainerId={selectedLogContainerId}
            onContainerSelect={(id) => setSelectedLogContainerId(id)}
          />
        );
      case "api":
        return <ApiTesterPage />;
      case "db":
        return <DbManagerPage />;
      case "envs":
        return <EnvironmentsPage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              flex: 1,
            }}
          >
            <Box className="logo-icon" size={19} strokeWidth={2.5} />
            <span style={{ fontSize: "15px", fontWeight: 700 }}>
              WhaleDesk Console
            </span>
          </div>
          <ChevronDown
            size={14}
            color="var(--text-muted)"
            style={{ opacity: 0.6 }}
          />
        </div>

        <nav className="nav-links">
          <div
            className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
            onClick={() => setActivePage("dashboard")}
          >
            <div className="nav-item-inner">
              <Activity size={18} />
              <span>Dashboard</span>
            </div>
            <span className="shortcut-tag">1</span>
          </div>

          <div
            className={`nav-item ${activePage === "containers" ? "active" : ""}`}
            onClick={() => setActivePage("containers")}
          >
            <div className="nav-item-inner">
              <Box size={18} />
              <span>Containers</span>
            </div>
            <span className="shortcut-tag">2</span>
          </div>

          <div
            className={`nav-item ${activePage === "container-logs" ? "active" : ""}`}
            onClick={() => setActivePage("container-logs")}
          >
            <div className="nav-item-inner">
              <ScrollText size={18} />
              <span>Logs Console</span>
            </div>
            <span className="shortcut-tag">3</span>
          </div>

          <div
            className={`nav-item ${activePage === "api" ? "active" : ""}`}
            onClick={() => setActivePage("api")}
          >
            <div className="nav-item-inner">
              <Terminal size={18} />
              <span>API Tester</span>
            </div>
            <span className="shortcut-tag">4</span>
          </div>

          <div
            className={`nav-item ${activePage === "db" ? "active" : ""}`}
            onClick={() => setActivePage("db")}
          >
            <div className="nav-item-inner">
              <ServerCog size={18} />
              <span>DB Studio</span>
            </div>
            <span className="shortcut-tag">5</span>
          </div>

          <div
            className={`nav-item ${activePage === "envs" ? "active" : ""}`}
            onClick={() => setActivePage("envs")}
          >
            <div className="nav-item-inner">
              <Layers size={18} />
              <span>Environments</span>
            </div>
            <span className="shortcut-tag">6</span>
          </div>

          <div
            className={`nav-item ${activePage === "settings" ? "active" : ""}`}
            onClick={() => setActivePage("settings")}
          >
            <div className="nav-item-inner">
              <Settings size={18} />
              <span>Settings</span>
            </div>
            <span className="shortcut-tag">⌘,</span>
          </div>
        </nav>

        {/* Dynamic Sidebar Infrastructure Widget */}
        <div className="sidebar-infra">
          <div className="sidebar-infra-title">Infrastructure</div>

          <div className="infra-status-item">
            <span>Docker Engine</span>
            <span
              className={`infra-indicator ${dockerOnline ? "online" : "offline"}`}
              title={dockerOnline ? "Connected" : "Disconnected"}
            />
          </div>

          <div className="infra-status-item">
            <span>DB Connection</span>
            <span
              className={`infra-indicator ${dbOnline ? "online" : "offline"}`}
              title={dbOnline ? "Active" : "Inactive"}
            />
          </div>
        </div>

        {/* Premium Sidebar Theme Toggle */}
        <div className="sidebar-theme-toggle">
          <div className="theme-toggle-label">Appearance</div>
          <div className="theme-toggle-group">
            <button
              className={`theme-toggle-btn ${theme === "dark" ? "active" : ""}`}
              onClick={() => toggleTheme("dark")}
              title="Switch to Dark Theme"
            >
              <Moon size={13.5} />
              <span>Dark</span>
            </button>
            <button
              className={`theme-toggle-btn ${theme === "light" ? "active" : ""}`}
              onClick={() => toggleTheme("light")}
              title="Switch to Light Theme"
            >
              <Sun size={13.5} />
              <span>Light</span>
            </button>
          </div>
        </div>
      </aside>

      <main className="main-content">{renderContent()}</main>
    </div>
  );
}
