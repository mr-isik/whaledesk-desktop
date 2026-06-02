import {
  AlertCircle,
  Check,
  ChevronLeft,
  ChevronRight,
  Database,
  Layers,
  Layout,
  Play,
  Plus,
  RefreshCw,
  Server,
  ServerCrash,
  Table as TableIcon,
  Terminal,
  Trash2,
  X,
  Key,
  Keyboard,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import CustomCheckbox from "../components/CustomCheckbox";
import CustomSelect from "../components/CustomSelect";
import {
  AddConnection,
  Connect,
  DeleteRows,
  Disconnect,
  ExecuteQuery,
  GetActiveConnection,
  GetTableData,
  InsertRow,
  IsConnected,
  ListConnections,
  ListSchemas,
  ListTables,
  RemoveConnection,
  UpdateRow,
} from "../../wailsjs/go/bindings/DbManagerBinding";
import { domain } from "../../wailsjs/go/models";

export default function DbManagerPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [connections, setConnections] = useState<domain.DbConnection[]>([]);
  const [activeConn, setActiveConn] = useState<domain.DbConnection | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Connection Wizard Form
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "Local Postgres",
    type: "postgres",
    host: "localhost",
    port: 5432,
    user: "postgres",
    password: "",
    database: "postgres",
    ssl_mode: "disable",
  });

  // DB Schema & Table trees
  const [schemas, setSchemas] = useState<domain.DbSchema[]>([]);
  const [expandedSchema, setExpandedSchema] = useState<string | null>(null);
  const [tables, setTables] = useState<domain.DbTable[]>([]);
  const [activeTable, setActiveTable] = useState<string | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<"data" | "sql">("data");

  // SQL Workspace
  const [query, setQuery] = useState(
    "SELECT * FROM information_schema.tables LIMIT 10;",
  );
  const [queryResult, setQueryResult] = useState<domain.QueryResult | null>(
    null,
  );
  const [executing, setExecuting] = useState(false);

  // Data Browser
  const [tableData, setTableData] = useState<domain.TableDataResult | null>(
    null,
  );
  const [tableReq, setTableReq] = useState<domain.TableDataRequest>(
    new domain.TableDataRequest({
      schema: "public",
      table: "",
      page: 1,
      page_size: 50,
      sort_col: "",
      sort_dir: "",
    }),
  );
  const [dataLoading, setDataLoading] = useState(false);
  const [selectedRowIndices, setSelectedRowIndices] = useState<number[]>([]);

  // Inline Editing
  const [editingCell, setEditingCell] = useState<{
    rIdx: number;
    cIdx: number;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Add Row Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFormData, setAddFormData] = useState<Record<string, any>>({});

  // Keyboard Shortcuts Guide Panel
  const [showShortcutsGuide, setShowShortcutsGuide] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  // Global Keyboard Shortcuts Hook
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable;

      // 1. Esc Key: Close active cell edit or active modals
      if (e.key === "Escape") {
        if (editingCell) {
          e.preventDefault();
          setEditingCell(null);
        } else if (showAddModal) {
          e.preventDefault();
          setShowAddModal(false);
        } else if (showShortcutsGuide) {
          e.preventDefault();
          setShowShortcutsGuide(false);
        }
        return;
      }

      // 2. Ctrl/Cmd + Enter -> Execute SQL Query (can be pressed globally or in textareas)
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (activeTab === "sql") {
          e.preventDefault();
          handleExecute();
        }
        return;
      }

      // 3. Ctrl/Cmd + R -> Refresh table data
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "r") {
        if (activeTab === "data" && activeTable) {
          e.preventDefault();
          loadTableData(tableReq);
        }
        return;
      }

      // Block structural hotkeys if writing in fields (so users can type numbers / N letters without triggering action)
      if (isInput && !(e.target instanceof HTMLTextAreaElement && (e.ctrlKey || e.metaKey))) {
        if (e.key === "Delete" || e.key === "Backspace") {
          return;
        }
      }

      // 4. Alt + 1 -> Switch to Data Browser tab
      if (e.altKey && e.key === "1") {
        e.preventDefault();
        setActiveTab("data");
        return;
      }

      // 5. Alt + 2 -> Switch to SQL Editor tab
      if (e.altKey && e.key === "2") {
        e.preventDefault();
        setActiveTab("sql");
        return;
      }

      // 6. Ctrl + Alt + N or Alt + N -> Open Add Row modal
      if (
        (e.ctrlKey && e.altKey && e.key.toLowerCase() === "n") ||
        (e.altKey && e.key.toLowerCase() === "n")
      ) {
        if (activeTab === "data" && activeTable) {
          e.preventDefault();
          openAddModal();
        }
        return;
      }

      // 7. Delete key -> Bulk delete selected rows (only when not typing in fields)
      if (e.key === "Delete" && !isInput) {
        if (activeTab === "data" && selectedRowIndices.length > 0) {
          e.preventDefault();
          handleBulkDelete();
        }
        return;
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [
    activeTab,
    activeTable,
    tableReq,
    selectedRowIndices,
    showAddModal,
    editingCell,
    query,
    showShortcutsGuide,
  ]);

  const checkStatus = async () => {
    const connected = await IsConnected();
    setIsConnected(connected);
    if (connected) {
      const conn = await GetActiveConnection();
      setActiveConn(conn);
      loadSchemas();
    } else {
      try {
        const list = await ListConnections();
        setConnections(list || []);
      } catch (e: any) {
        console.error("Failed to load connections:", e);
      }
      setActiveConn(null);
    }
  };

  const handleSaveConnection = async () => {
    try {
      const newConn = new domain.DbConnection({
        ...formData,
        type: formData.type,
      });
      await AddConnection(newConn);
      setShowForm(false);
      checkStatus();
    } catch (e: any) {
      setError(e.toString());
    }
  };

  const handleConnect = async (id: string) => {
    setLoading(true);
    setError("");
    try {
      await Connect(id);
      checkStatus();
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    await Disconnect();
    setSchemas([]);
    setTables([]);
    setQueryResult(null);
    setTableData(null);
    checkStatus();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this database connection?")) {
      await RemoveConnection(id);
      checkStatus();
    }
  };

  const loadSchemas = async () => {
    try {
      const sc = await ListSchemas();
      setSchemas(sc || []);

      const publicSchema = sc?.find((s) => s.name === "public");
      if (publicSchema) {
        handleSchemaClick("public");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSchemaClick = async (schema: string) => {
    if (expandedSchema === schema && schema !== "public") {
      setExpandedSchema(null);
      setTables([]);
      return;
    }
    setExpandedSchema(schema);
    try {
      const t = await ListTables(schema);
      setTables(t || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTableClick = (table: string) => {
    setActiveTable(table);
    setActiveTab("data");
    setQuery(`SELECT * FROM ${expandedSchema}.${table} LIMIT 100;`);

    const newReq = new domain.TableDataRequest({
      schema: expandedSchema || "public",
      table: table,
      page: 1,
      page_size: tableReq.page_size || 50,
      sort_col: "",
      sort_dir: "",
    });
    setTableReq(newReq);
    loadTableData(newReq);
  };

  const loadTableData = async (req: domain.TableDataRequest) => {
    setDataLoading(true);
    setError("");
    setSelectedRowIndices([]);
    setEditingCell(null);
    try {
      const res = await GetTableData(req);
      setTableData(res);
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setDataLoading(false);
    }
  };

  const handleSort = (colName: string) => {
    let dir = "asc";
    if (tableReq.sort_col === colName && tableReq.sort_dir === "asc") {
      dir = "desc";
    } else if (tableReq.sort_col === colName && tableReq.sort_dir === "desc") {
      dir = "";
      colName = "";
    }
    const newReq = new domain.TableDataRequest({
      ...tableReq,
      sort_col: colName,
      sort_dir: dir,
      page: 1,
    });
    setTableReq(newReq);
    loadTableData(newReq);
  };

  const handlePageChange = (newPage: number) => {
    if (!tableData || newPage < 1 || newPage > tableData.total_pages) return;
    const newReq = new domain.TableDataRequest({ ...tableReq, page: newPage });
    setTableReq(newReq);
    loadTableData(newReq);
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value);
    const newReq = new domain.TableDataRequest({
      ...tableReq,
      page_size: newSize,
      page: 1,
    });
    setTableReq(newReq);
    loadTableData(newReq);
  };

  const handleExecute = async () => {
    if (!query) return;
    setExecuting(true);
    setError("");
    try {
      const res = await ExecuteQuery(query);
      if (res && res.error_message) {
        setError(res.error_message);
      } else {
        setQueryResult(res);
      }
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setExecuting(false);
    }
  };

  const toggleRowSelection = (idx: number) => {
    if (selectedRowIndices.includes(idx)) {
      setSelectedRowIndices(selectedRowIndices.filter((i) => i !== idx));
    } else {
      setSelectedRowIndices([...selectedRowIndices, idx]);
    }
  };

  const getPrimaryKeys = (rIdx: number) => {
    if (!tableData) return {};
    const pks: Record<string, any> = {};
    tableData.columns.forEach((col, cIdx) => {
      if (col.is_primary_key) {
        pks[col.name] = tableData.rows[rIdx][cIdx];
      }
    });
    return pks;
  };

  const handleBulkDelete = async () => {
    if (selectedRowIndices.length === 0 || !tableData) return;
    if (
      !confirm(
        `Are you sure you want to delete ${selectedRowIndices.length} rows?`,
      )
    )
      return;

    setError("");
    try {
      const pks = selectedRowIndices
        .map((idx) => getPrimaryKeys(idx))
        .filter((pk) => Object.keys(pk).length > 0);
      if (pks.length === 0) {
        throw new Error("Cannot delete rows without a primary key.");
      }

      const req = new domain.RowDeleteRequest({
        schema: tableReq.schema,
        table: tableReq.table,
        primary_keys: pks,
      });

      await DeleteRows(req);
      loadTableData(tableReq);
    } catch (e: any) {
      setError(e.toString());
    }
  };

  const handleCellDoubleClick = (rIdx: number, cIdx: number) => {
    if (!tableData) return;
    setEditingCell({ rIdx, cIdx });
    const val = tableData.rows[rIdx][cIdx];
    setEditValue(val === null ? "" : String(val));
  };

  const handleCellEditSave = async () => {
    if (!editingCell || !tableData) return;
    const { rIdx, cIdx } = editingCell;
    const colName = tableData.columns[cIdx].name;
    const pk = getPrimaryKeys(rIdx);

    if (Object.keys(pk).length === 0) {
      setError("Cannot update row without a primary key.");
      setEditingCell(null);
      return;
    }

    try {
      const mut = new domain.RowMutation({
        schema: tableReq.schema,
        table: tableReq.table,
        data: { [colName]: editValue },
      });

      await UpdateRow(mut, pk);

      // Update local state without full reload
      const newTableData = { ...tableData };
      newTableData.rows[rIdx][cIdx] = editValue;
      setTableData(newTableData as domain.TableDataResult);
    } catch (e: any) {
      setError(e.toString());
    }
    setEditingCell(null);
  };

  const openAddModal = () => {
    if (!tableData) return;
    const initialData: Record<string, any> = {};
    tableData.columns.forEach((col) => {
      if (!col.is_primary_key || col.data_type.includes("serial")) {
        // very naive default
        initialData[col.name] = "";
      }
    });
    setAddFormData(initialData);
    setShowAddModal(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const mut = new domain.RowMutation({
        schema: tableReq.schema,
        table: tableReq.table,
        data: addFormData,
      });
      await InsertRow(mut);
      setShowAddModal(false);
      loadTableData(tableReq);
    } catch (err: any) {
      setError(err.toString());
    }
  };

  if (isConnected && activeConn) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          height: "calc(100vh - 100px)",
          gap: "16px",
          minHeight: 0,
        }}
      >
        {/* Connection Header Panel */}
        <div
          className="glass-card"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 20px",
            background: "linear-gradient(90deg, var(--bg-secondary) 0%, rgba(11, 10, 15, 0.4) 100%)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "18px",
                fontWeight: "800",
                marginBottom: "4px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}
            >
              <Database size={18} color="var(--accent-primary)" style={{ filter: "drop-shadow(0 0 4px var(--accent-glow))" }} />
              Database Studio
            </h1>
            <p style={{ margin: 0, fontSize: "11.5px", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
              <span>Connected to</span>
              <strong style={{ color: "var(--accent-hover)", fontWeight: "600" }}>
                {activeConn.name}
              </strong>
              <span style={{ color: "var(--border-hover)" }}>|</span>
              <code style={{ background: "rgba(255,255,255,0.03)", padding: "1px 6px", borderRadius: "4px", fontSize: "10.5px", border: "1px solid var(--border)" }}>
                {activeConn.user}@{activeConn.host}:{activeConn.port}/{activeConn.database}
              </code>
            </p>
          </div>
          <button
            className="btn-danger"
            onClick={handleDisconnect}
            style={{
              padding: "6px 14px",
              fontSize: "11px",
              fontWeight: "600",
              borderRadius: "var(--radius-sm)",
              transition: "all var(--transition-fast)",
              boxShadow: "0 2px 8px rgba(255, 92, 114, 0.1)",
            }}
          >
            Disconnect Studio
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "1px",
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "12.5px",
              fontWeight: "600",
              color:
                activeTab === "data"
                  ? "var(--accent-primary)"
                  : "var(--text-secondary)",
              borderBottom:
                activeTab === "data"
                  ? "2px solid var(--accent-primary)"
                  : "2px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all var(--transition-fast)",
            }}
            onClick={() => setActiveTab("data")}
          >
            <TableIcon size={14} />
            <span>Data Browser</span>
            <kbd
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "1px 4px",
                fontSize: "9px",
                color: "var(--text-muted)",
                fontWeight: "500",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              }}
            >
              ⌥1
            </kbd>
          </div>
          <div
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "12.5px",
              fontWeight: "600",
              color:
                activeTab === "sql"
                  ? "var(--accent-primary)"
                  : "var(--text-secondary)",
              borderBottom:
                activeTab === "sql"
                  ? "2px solid var(--accent-primary)"
                  : "2px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all var(--transition-fast)",
            }}
            onClick={() => setActiveTab("sql")}
          >
            <Terminal size={14} />
            <span>SQL Editor</span>
            <kbd
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--border)",
                borderRadius: "4px",
                padding: "1px 4px",
                fontSize: "9px",
                color: "var(--text-muted)",
                fontWeight: "500",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
              }}
            >
              ⌥2
            </kbd>
          </div>
        </div>

        {/* Studio Workspace Area */}
        <div style={{ display: "flex", gap: "16px", flex: 1, minHeight: 0 }}>
          {/* Left panel: Schema & Table tree explorer */}
          <div
            className="glass-card"
            style={{
              width: "240px",
              display: "flex",
              flexDirection: "column",
              padding: "16px 12px",
              overflowY: "auto",
              flexShrink: 0,
              background: "var(--bg-secondary)",
              borderRight: "1px solid var(--border)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div
              style={{
                fontWeight: "700",
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: "var(--text-muted)",
                padding: "0 4px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <Layers
                  size={12}
                  color="var(--accent-primary)"
                  style={{ filter: "drop-shadow(0 0 2px var(--accent-glow))" }}
                />
                <span>Schema Explorer</span>
              </div>
              <span
                style={{
                  background: "rgba(255, 255, 255, 0.04)",
                  border: "1px solid var(--border)",
                  borderRadius: "10px",
                  padding: "1px 6px",
                  fontSize: "9px",
                  color: "var(--text-secondary)",
                  fontWeight: "600",
                }}
              >
                {schemas.length}
              </span>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "4px" }}
            >
              {schemas.length === 0 ? (
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    padding: "10px 4px",
                    textAlign: "center",
                    border: "1px dashed var(--border)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  No schemas found.
                </div>
              ) : (
                schemas.map((s) => (
                  <div key={s.name} style={{ display: "flex", flexDirection: "column" }}>
                    <div
                      style={{
                        padding: "6px 10px",
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: "12px",
                        fontWeight: expandedSchema === s.name ? "600" : "500",
                        color: expandedSchema === s.name ? "var(--text-primary)" : "var(--text-secondary)",
                        background:
                          expandedSchema === s.name
                            ? "linear-gradient(90deg, rgba(110, 86, 207, 0.1) 0%, rgba(110, 86, 207, 0.01) 100%)"
                            : "transparent",
                        border:
                          expandedSchema === s.name
                            ? "1px solid rgba(110, 86, 207, 0.15)"
                            : "1px solid transparent",
                        cursor: "pointer",
                        transition: "all var(--transition-fast)",
                      }}
                      onClick={() => handleSchemaClick(s.name)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Layout size={12} color={expandedSchema === s.name ? "var(--accent-primary)" : "var(--text-muted)"} />
                        <span>{s.name}</span>
                      </div>
                      <span style={{ fontSize: "9px", opacity: 0.6 }}>
                        {expandedSchema === s.name ? "▼" : "▶"}
                      </span>
                    </div>

                    {expandedSchema === s.name && (
                      <div
                        style={{
                          paddingLeft: "10px",
                          marginTop: "2px",
                          marginBottom: "4px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                          borderLeft: "1px solid var(--border)",
                          marginLeft: "15px",
                        }}
                      >
                        {tables.length === 0 ? (
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--text-muted)",
                              padding: "6px 12px",
                              fontStyle: "italic",
                            }}
                          >
                            No tables found
                          </div>
                        ) : (
                          tables.map((t) => {
                            const isTableActive = activeTable === t.name;
                            return (
                              <div
                                key={t.name}
                                style={{
                                  padding: "5px 10px",
                                  fontSize: "11.5px",
                                  cursor: "pointer",
                                  borderRadius: "var(--radius-sm)",
                                  background: isTableActive
                                    ? "linear-gradient(90deg, rgba(110, 86, 207, 0.08) 0%, rgba(0,0,0,0) 100%)"
                                    : "transparent",
                                  color: isTableActive
                                    ? "var(--text-primary)"
                                    : "var(--text-secondary)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  fontWeight: isTableActive ? "600" : "500",
                                  borderLeft: isTableActive
                                    ? "2px solid var(--accent-primary)"
                                    : "2px solid transparent",
                                  paddingLeft: isTableActive ? "8px" : "10px",
                                  transition: "all var(--transition-fast)",
                                }}
                                onClick={() => handleTableClick(t.name)}
                              >
                                <TableIcon
                                  size={11}
                                  color={
                                    isTableActive
                                      ? "var(--accent-primary)"
                                      : "var(--text-muted)"
                                  }
                                />
                                <span
                                  style={{
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={t.name}
                                >
                                  {t.name}
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right panel: Tab content */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              minWidth: 0,
              height: "100%",
            }}
          >
            {error && (
              <div
                style={{
                  padding: "8px 12px",
                  background: "var(--danger-bg)",
                  border: "1px solid var(--danger-border)",
                  color: "var(--danger)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "11px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "500",
                }}
              >
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            {activeTab === "data" && (
              <div
                className="glass-card"
                style={{
                  flex: 1,
                  padding: 0,
                  display: "flex",
                  flexDirection: "column",
                  minHeight: 0,
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
                  background: "var(--bg-secondary)",
                }}
              >
                {/* Data Browser Toolbar */}
                <div
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(255, 255, 255, 0.01)",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      className="btn-primary"
                      onClick={openAddModal}
                      disabled={!activeTable}
                      style={{
                        padding: "4px 12px",
                        fontSize: "11.5px",
                        height: "28px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        borderRadius: "var(--radius-sm)",
                      }}
                    >
                      <Plus size={12} strokeWidth={2.5} />
                      <span>Add Row</span>
                    </button>
                    {selectedRowIndices.length > 0 && (
                      <button
                        className="btn-outline"
                        onClick={handleBulkDelete}
                        style={{
                          color: "var(--danger)",
                          borderColor: "var(--danger-border)",
                          background: "var(--danger-bg)",
                          padding: "4px 12px",
                          fontSize: "11.5px",
                          height: "28px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          borderRadius: "var(--radius-sm)",
                          transition: "all var(--transition-fast)",
                        }}
                      >
                        <Trash2 size={12} />
                        <span>Delete Selected ({selectedRowIndices.length})</span>
                      </button>
                    )}
                    <button
                      className="btn-outline"
                      onClick={() => loadTableData(tableReq)}
                      disabled={!activeTable || dataLoading}
                      style={{
                        padding: "4px 10px",
                        height: "28px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        borderRadius: "var(--radius-sm)",
                      }}
                      title="Refresh (⌘R)"
                    >
                      <RefreshCw
                        size={12}
                        className={dataLoading ? "spin" : ""}
                        style={{ opacity: dataLoading ? 0.7 : 1 }}
                      />
                    </button>

                    <button
                      className="btn-outline"
                      onClick={() => setShowShortcutsGuide(!showShortcutsGuide)}
                      style={{
                        padding: "4px 10px",
                        height: "28px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "11.5px",
                        borderRadius: "var(--radius-sm)",
                        color: showShortcutsGuide ? "var(--accent-hover)" : "var(--text-secondary)",
                        borderColor: showShortcutsGuide ? "var(--border-active)" : "var(--border)",
                        background: showShortcutsGuide ? "var(--bg-hover)" : "transparent",
                      }}
                      title="Toggle Shortcuts Panel"
                    >
                      <Keyboard size={13} />
                      <span>Shortcuts</span>
                    </button>
                  </div>

                  {tableData && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "14px",
                        fontSize: "11.5px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span style={{ fontWeight: "500" }}>
                        Showing{" "}
                        <strong style={{ color: "var(--text-primary)" }}>
                          {(tableData.page - 1) * tableData.page_size + 1}
                        </strong>{" "}
                        -{" "}
                        <strong style={{ color: "var(--text-primary)" }}>
                          {Math.min(
                            tableData.page * tableData.page_size,
                            tableData.total_rows,
                          )}
                        </strong>{" "}
                        of{" "}
                        <strong style={{ color: "var(--text-primary)" }}>
                          {tableData.total_rows}
                        </strong>{" "}
                        rows
                      </span>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <CustomSelect
                          value={tableReq.page_size}
                          onChange={(val) =>
                            handlePageSizeChange({
                              target: { value: val },
                            } as any)
                          }
                          options={[
                            { value: 25, label: "25 / page" },
                            { value: 50, label: "50 / page" },
                            { value: 100, label: "100 / page" },
                          ]}
                          style={{ height: "26px", minWidth: "90px" }}
                        />

                        <button
                          className="btn-outline"
                          onClick={() => handlePageChange(tableReq.page - 1)}
                          disabled={tableReq.page <= 1}
                          style={{
                            padding: "2px 6px",
                            height: "26px",
                            borderRadius: "var(--radius-sm)",
                          }}
                        >
                          <ChevronLeft size={13} />
                        </button>
                        <span style={{ fontWeight: "600", padding: "0 4px" }}>
                          {tableReq.page} / {tableData.total_pages || 1}
                        </span>
                        <button
                          className="btn-outline"
                          onClick={() => handlePageChange(tableReq.page + 1)}
                          disabled={tableReq.page >= tableData.total_pages}
                          style={{
                            padding: "2px 6px",
                            height: "26px",
                            borderRadius: "var(--radius-sm)",
                          }}
                        >
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Data Grid Scroll Container */}
                <div
                  style={{
                    flex: 1,
                    overflow: "auto",
                    background: "var(--bg-primary)",
                    borderRadius: "0 0 var(--radius-md) var(--radius-md)",
                    position: "relative",
                  }}
                >
                  {!activeTable ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-secondary)",
                        padding: "40px",
                        gap: "12px",
                      }}
                    >
                      <Database
                        size={32}
                        color="var(--text-muted)"
                        style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.02))" }}
                      />
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-primary)" }}>
                        No Table Selected
                      </div>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, textAlign: "center", maxWidth: "260px", lineHeight: "1.5" }}>
                        Choose a database table from the Schema Explorer sidebar to browse columns, rows and perform GUI data mutations.
                      </p>
                    </div>
                  ) : !tableData ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--text-muted)",
                        gap: "10px",
                      }}
                    >
                      <RefreshCw size={24} className="spin" color="var(--accent-primary)" />
                      <div style={{ fontSize: "11px", fontWeight: "500" }}>Loading table dataset...</div>
                    </div>
                  ) : tableData.columns.length === 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        height: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--warning)",
                        padding: "30px",
                        gap: "8px",
                      }}
                    >
                      <AlertCircle size={28} />
                      <div style={{ fontSize: "12px", fontWeight: "600" }}>Empty Table Schema</div>
                      <p style={{ fontSize: "11px", color: "var(--text-muted)", margin: 0, textAlign: "center" }}>
                        This table does not contain any defined columns.
                      </p>
                    </div>
                  ) : (
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "11px",
                      }}
                    >
                      <thead>
                        <tr>
                          <th
                            style={{
                              position: "sticky",
                              top: 0,
                              background: "var(--bg-secondary)",
                              padding: "8px 12px",
                              borderBottom: "1px solid var(--border)",
                              width: "40px",
                              zIndex: 10,
                              textAlign: "center",
                            }}
                          >
                            <CustomCheckbox
                              checked={
                                selectedRowIndices.length ===
                                  tableData.rows.length &&
                                tableData.rows.length > 0
                              }
                              onChange={(checked) => {
                                if (checked)
                                  setSelectedRowIndices(
                                    tableData.rows.map((_, i) => i),
                                  );
                                else setSelectedRowIndices([]);
                              }}
                            />
                          </th>
                          {tableData.columns.map((c, i) => (
                            <th
                              key={i}
                              onClick={() => handleSort(c.name)}
                              style={{
                                textAlign: "left",
                                padding: "10px 14px",
                                borderBottom: "1px solid var(--border)",
                                color:
                                  tableReq.sort_col === c.name
                                    ? "var(--accent-hover)"
                                    : "var(--text-primary)",
                                fontWeight: "700",
                                position: "sticky",
                                top: 0,
                                background: "var(--bg-secondary)",
                                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                zIndex: 10,
                                letterSpacing: "-0.01em",
                                transition: "color var(--transition-fast)",
                              }}
                              className="column-header"
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                {c.is_primary_key && (
                                  <Key
                                    size={10}
                                    color="var(--warning)"
                                    style={{ transform: "rotate(-45deg)", filter: "drop-shadow(0 0 2px rgba(245,158,11,0.3))" }}
                                  />
                                )}
                                <span>{c.name}</span>
                                {tableReq.sort_col === c.name && (
                                  <span style={{ color: "var(--accent-primary)", fontSize: "10px" }}>
                                    {tableReq.sort_dir === "asc" ? "▲" : "▼"}
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tableData.rows.length === 0 ? (
                          <tr>
                            <td
                              colSpan={tableData.columns.length + 1}
                              style={{
                                textAlign: "center",
                                padding: "40px 20px",
                                color: "var(--text-muted)",
                                fontSize: "12px",
                              }}
                            >
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                <TableIcon size={24} style={{ opacity: 0.3 }} />
                                <span>No rows in this dataset.</span>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          tableData.rows.map((row, rIdx) => {
                            const isRowSelected = selectedRowIndices.includes(rIdx);
                            return (
                              <tr
                                key={rIdx}
                                style={{
                                  borderBottom: "1px solid var(--border)",
                                  background: isRowSelected
                                    ? "rgba(110, 86, 207, 0.05)"
                                    : "transparent",
                                  transition: "background var(--transition-fast)",
                                }}
                                className="log-row"
                              >
                                <td
                                  style={{
                                    padding: "6px 12px",
                                    textAlign: "center",
                                    borderRight: "1px solid var(--border)",
                                    width: "40px",
                                  }}
                                >
                                  <CustomCheckbox
                                    checked={isRowSelected}
                                    onChange={() => toggleRowSelection(rIdx)}
                                  />
                                </td>
                                {row.map((val, cIdx) => (
                                  <td
                                    key={cIdx}
                                    onDoubleClick={() =>
                                      handleCellDoubleClick(rIdx, cIdx)
                                    }
                                    style={{
                                      padding: "8px 14px",
                                      whiteSpace: "nowrap",
                                      maxWidth: "280px",
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      color: isRowSelected ? "var(--text-primary)" : "var(--text-secondary)",
                                      fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                                      cursor: "cell",
                                      borderRight: "1px solid var(--border)",
                                      transition: "all var(--transition-fast)",
                                    }}
                                  >
                                    {editingCell?.rIdx === rIdx &&
                                    editingCell?.cIdx === cIdx ? (
                                      <input
                                        autoFocus
                                        className="input-field"
                                        style={{
                                          padding: "2px 6px",
                                          height: "22px",
                                          fontSize: "11px",
                                          width: "100%",
                                          outline: "1px solid var(--border-active)",
                                          boxShadow: "0 0 6px var(--accent-glow)",
                                          background: "var(--bg-tertiary)",
                                          color: "var(--text-primary)",
                                          border: "none",
                                          borderRadius: "4px",
                                        }}
                                        value={editValue}
                                        onChange={(e) =>
                                          setEditValue(e.target.value)
                                        }
                                        onBlur={() => setEditingCell(null)}
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter")
                                            handleCellEditSave();
                                          if (e.key === "Escape")
                                            setEditingCell(null);
                                        }}
                                      />
                                    ) : val === null ? (
                                      <span
                                        style={{
                                          color: "var(--text-muted)",
                                          fontSize: "9px",
                                          fontStyle: "italic",
                                          background: "rgba(255, 255, 255, 0.02)",
                                          border: "1px solid var(--border)",
                                          borderRadius: "3px",
                                          padding: "1px 4px",
                                        }}
                                      >
                                        NULL
                                      </span>
                                    ) : (
                                      String(val)
                                    )}
                                  </td>
                                ))}
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {activeTab === "sql" && (
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: "16px",
                  height: "100%",
                }}
              >
                <div
                  className="glass-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "16px",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "600",
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--text-secondary)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Terminal size={12} color="var(--accent-primary)" />
                      SQL Editor
                    </span>
                    <button
                      className="btn-primary"
                      onClick={handleExecute}
                      disabled={executing}
                      style={{
                        padding: "4px 12px",
                        fontSize: "12px",
                        height: "28px",
                      }}
                    >
                      <Play size={10} fill="currentColor" />
                      Run Query
                    </button>
                  </div>

                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="input-field"
                    style={{
                      height: "100px",
                      fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                      fontSize: "12px",
                      lineHeight: "1.5",
                      resize: "vertical",
                      color: "var(--text-primary)",
                      background: "var(--bg-primary)",
                    }}
                  />
                </div>

                <div
                  className="glass-card"
                  style={{
                    flex: 1,
                    padding: 0,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                  }}
                >
                  <div
                    style={{
                      padding: "12px 18px",
                      borderBottom: "1px solid var(--border)",
                      background: "rgba(255, 255, 255, 0.015)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "600",
                        fontSize: "11px",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        color: "var(--text-secondary)",
                      }}
                    >
                      Query Console Results
                    </span>
                    {queryResult && (
                      <span
                        className="badge neutral"
                        style={{ fontSize: "9px" }}
                      >
                        Rows Affected: {queryResult.rows_affected}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      overflow: "auto",
                      padding: "12px",
                      background: "var(--bg-primary)",
                    }}
                  >
                    {!queryResult ? (
                      <div
                        style={{
                          display: "flex",
                          height: "100%",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-muted)",
                          fontSize: "12px",
                        }}
                      >
                        Execute an SQL command to display query rows here.
                      </div>
                    ) : !queryResult.columns ||
                      queryResult.columns.length === 0 ? (
                      <div
                        style={{
                          display: "flex",
                          height: "100%",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--accent-primary)",
                          fontSize: "12px",
                          gap: "6px",
                          fontWeight: "600",
                        }}
                      >
                        <Check size={16} /> Query executed successfully. No
                        dataset rows returned.
                      </div>
                    ) : (
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          fontSize: "11px",
                        }}
                      >
                        <thead>
                          <tr>
                            {queryResult.columns.map((c, i) => (
                              <th
                                key={i}
                                style={{
                                  textAlign: "left",
                                  padding: "8px 12px",
                                  borderBottom: "1px solid var(--border)",
                                  color: "var(--text-primary)",
                                  fontWeight: "700",
                                  position: "sticky",
                                  top: 0,
                                  background: "var(--bg-secondary)",
                                  fontFamily:
                                    "var(--font-mono, 'Geist Mono', monospace)",
                                }}
                              >
                                {c}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {(queryResult.rows || []).map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              style={{
                                borderBottom: "1px solid var(--border)",
                              }}
                              className="log-row"
                            >
                              {row.map((val, cIdx) => (
                                <td
                                  key={cIdx}
                                  style={{
                                    padding: "8px 12px",
                                    whiteSpace: "nowrap",
                                    maxWidth: "240px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    color: "var(--text-secondary)",
                                    fontFamily:
                                      "var(--font-mono, 'Geist Mono', monospace)",
                                  }}
                                >
                                  {val === null ? (
                                    <span
                                      style={{
                                        color: "var(--text-muted)",
                                        fontSize: "10px",
                                        fontStyle: "italic",
                                      }}
                                    >
                                      NULL
                                    </span>
                                  ) : (
                                    String(val)
                                  )}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add Row Modal */}
        {showAddModal && tableData && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(8px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
            }}
          >
            <div
              className="glass-card"
              style={{
                width: "480px",
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
                padding: "20px 24px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-hover)",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.1)",
                borderRadius: "var(--radius-lg)",
                animation: "scaleInModal 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "16px",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "12px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: "700",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "var(--text-primary)",
                  }}
                >
                  <Plus size={16} color="var(--accent-primary)" style={{ filter: "drop-shadow(0 0 2px var(--accent-glow))" }} />
                  Add Row to {tableReq.table}
                </h3>
                <button
                  className="btn-outline"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: "4px", border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                  title="Close (Esc)"
                >
                  <X size={14} />
                </button>
              </div>

              <form
                onSubmit={handleAddSubmit}
                style={{
                  overflowY: "auto",
                  paddingRight: "6px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  flex: 1,
                }}
              >
                {tableData.columns.map((col) => {
                  if (col.is_primary_key && col.data_type.includes("integer")) {
                    return null;
                  }
                  return (
                    <div key={col.name} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          color: "var(--text-secondary)",
                          fontWeight: "600",
                        }}
                      >
                        <span>
                          {col.name}{" "}
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontWeight: "normal",
                              fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                              fontSize: "10px",
                            }}
                          >
                            ({col.data_type})
                          </span>
                        </span>
                        {col.is_nullable ? (
                          <span style={{ color: "var(--text-muted)", fontSize: "10px", fontWeight: "normal" }}>
                            Optional
                          </span>
                        ) : (
                          <span style={{ color: "var(--danger)", fontSize: "10px", fontWeight: "normal" }}>
                            Required
                          </span>
                        )}
                      </label>
                      <input
                        type={
                          col.data_type.includes("int") ||
                          col.data_type.includes("numeric")
                            ? "number"
                            : "text"
                        }
                        className="input-field"
                        value={addFormData[col.name] || ""}
                        onChange={(e) =>
                          setAddFormData({
                            ...addFormData,
                            [col.name]: e.target.value,
                          })
                        }
                        required={!col.is_nullable && !col.default_value}
                        style={{
                          background: "var(--bg-tertiary)",
                          border: "1px solid var(--border)",
                          borderRadius: "var(--radius-sm)",
                          padding: "6px 10px",
                          fontSize: "11.5px",
                          height: "30px",
                          color: "var(--text-primary)",
                          transition: "all var(--transition-fast)",
                        }}
                        placeholder={col.default_value ? `Default: ${col.default_value}` : `Enter ${col.name}`}
                      />
                    </div>
                  );
                })}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "8px",
                    marginTop: "16px",
                    borderTop: "1px solid var(--border)",
                    paddingTop: "14px",
                  }}
                >
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setShowAddModal(false)}
                    style={{ padding: "6px 14px", fontSize: "11.5px", height: "30px" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ padding: "6px 14px", fontSize: "11.5px", height: "30px", fontWeight: "600" }}
                  >
                    Insert Row
                  </button>
                </div>
              </form>
            </div>
            <style>{`
              @keyframes scaleInModal {
                from {
                  transform: scale(0.96);
                  opacity: 0;
                }
                to {
                  transform: scale(1);
                  opacity: 1;
                }
              }
            `}</style>
          </div>
        )}

        {/* Keyboard Shortcuts Floating Guide Panel */}
        {showShortcutsGuide && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
            }}
            onClick={() => setShowShortcutsGuide(false)}
          >
            <div
              className="glass-card"
              style={{
                width: "400px",
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-hover)",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), 0 0 1px rgba(255, 255, 255, 0.1)",
                borderRadius: "var(--radius-lg)",
                animation: "scaleInShortcuts 0.15s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  borderBottom: "1px solid var(--border)",
                  paddingBottom: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Keyboard size={16} color="var(--accent-primary)" style={{ filter: "drop-shadow(0 0 2px var(--accent-glow))" }} />
                  <h3 style={{ margin: 0, fontSize: "13.5px", fontWeight: "700" }}>
                    Keyboard Shortcuts Guide
                  </h3>
                </div>
                <button
                  className="btn-outline"
                  onClick={() => setShowShortcutsGuide(false)}
                  style={{ padding: "4px", border: "none", display: "flex", alignItems: "center", justifyContent: "center" }}
                  title="Close (Esc)"
                >
                  <X size={14} />
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {[
                  { keys: ["⌥", "1"], desc: "Switch to Data Browser" },
                  { keys: ["⌥", "2"], desc: "Switch to SQL Editor" },
                  { keys: ["Ctrl", "Enter"], desc: "Run SQL Query" },
                  { keys: ["Ctrl", "R"], desc: "Refresh Table Data" },
                  { keys: ["⌥", "N"], desc: "Open Add Row Modal" },
                  { keys: ["Delete"], desc: "Delete Selected Rows" },
                  { keys: ["Esc"], desc: "Close Modals / Cancel Editing" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "11.5px",
                    }}
                  >
                    <span style={{ color: "var(--text-secondary)", fontWeight: "500" }}>{item.desc}</span>
                    <div style={{ display: "flex", gap: "3px" }}>
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          style={{
                            background: "var(--bg-tertiary)",
                            border: "1px solid var(--border-hover)",
                            borderRadius: "4px",
                            padding: "2px 6px",
                            fontSize: "10px",
                            fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                            color: "var(--text-primary)",
                            boxShadow: "0 1px 1px rgba(0, 0, 0, 0.2)",
                            fontWeight: "600",
                          }}
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  fontSize: "10.5px",
                  color: "var(--text-muted)",
                  textAlign: "center",
                  borderTop: "1px solid var(--border)",
                  paddingTop: "12px",
                }}
              >
                Press <kbd style={{ background: "rgba(255,255,255,0.03)", padding: "1px 4px", borderRadius: "3px", fontWeight: "600" }}>Esc</kbd> anywhere to close overlays.
              </div>
            </div>
            <style>{`
              @keyframes scaleInShortcuts {
                from {
                  transform: scale(0.95);
                  opacity: 0;
                }
                to {
                  transform: scale(1);
                  opacity: 1;
                }
              }
            `}</style>
          </div>
        )}
      </div>
    );
  }

  // Disconnected state: Saved connections & Wizard onboarding
  return (
    <div
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        padding: "20px 0",
      }}
    >
      {/* Title Panel */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "16px",
        }}
      >
        <div>
          <h1
            className="page-title"
            style={{
              fontSize: "22px",
              fontWeight: "800",
              letterSpacing: "-0.02em",
              marginBottom: "4px",
              color: "var(--text-primary)",
            }}
          >
            Database Studio
          </h1>
          <p
            className="page-subtitle"
            style={{
              marginBottom: 0,
              fontSize: "12px",
              color: "var(--text-secondary)",
            }}
          >
            Manage production tunnels, browse tables, and configure query workspaces
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: "8px 16px",
            fontSize: "11.5px",
            height: "32px",
            fontWeight: "600",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            borderRadius: "var(--radius-sm)",
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>New Endpoint</span>
        </button>
      </div>

      {error && (
        <div
          style={{
            padding: "10px 14px",
            background: "var(--danger-bg)",
            border: "1px solid var(--danger-border)",
            color: "var(--danger)",
            borderRadius: "var(--radius-sm)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12px",
            fontWeight: "500",
          }}
        >
          <AlertCircle size={15} />
          <span>Connection Error: {error}</span>
        </div>
      )}

      {/* Connection Creation Wizard Panel */}
      {showForm && (
        <div
          className="glass-card"
          style={{
            padding: "24px",
            border: "1px solid var(--border-hover)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            background: "var(--bg-secondary)",
            animation: "slideDownWizard 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <h3
            style={{
              marginBottom: "18px",
              fontSize: "12px",
              fontWeight: "700",
              color: "var(--text-primary)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Server size={14} color="var(--accent-primary)" style={{ filter: "drop-shadow(0 0 2px var(--accent-glow))" }} />
            New PostgreSQL Tunnel
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label
                style={{
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Alias Name
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Production PostgreSQL"
                style={{ height: "32px", fontSize: "12px", background: "var(--bg-tertiary)" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label
                style={{
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Database Name
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.database}
                onChange={(e) =>
                  setFormData({ ...formData, database: e.target.value })
                }
                style={{ height: "32px", fontSize: "12px", background: "var(--bg-tertiary)" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label
                style={{
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Host Address
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.host}
                onChange={(e) =>
                  setFormData({ ...formData, host: e.target.value })
                }
                style={{ height: "32px", fontSize: "12px", background: "var(--bg-tertiary)" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label
                style={{
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Port Number
              </label>
              <input
                type="number"
                className="input-field"
                value={formData.port}
                onChange={(e) =>
                  setFormData({ ...formData, port: parseInt(e.target.value) })
                }
                style={{ height: "32px", fontSize: "12px", background: "var(--bg-tertiary)" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label
                style={{
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                User Username
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.user}
                onChange={(e) =>
                  setFormData({ ...formData, user: e.target.value })
                }
                style={{ height: "32px", fontSize: "12px", background: "var(--bg-tertiary)" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <label
                style={{
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  fontWeight: "600",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Password
              </label>
              <input
                type="password"
                className="input-field"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="••••••••"
                style={{ height: "32px", fontSize: "12px", background: "var(--bg-tertiary)" }}
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "20px",
              justifyContent: "flex-end",
              borderTop: "1px solid var(--border)",
              paddingTop: "14px",
            }}
          >
            <button
              className="btn-outline"
              onClick={() => setShowForm(false)}
              style={{ padding: "6px 14px", fontSize: "11.5px", height: "30px" }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSaveConnection}
              style={{ padding: "6px 14px", fontSize: "11.5px", height: "30px", fontWeight: "600" }}
            >
              Save Endpoint
            </button>
          </div>
          <style>{`
            @keyframes slideDownWizard {
              from {
                transform: translateY(-8px);
                opacity: 0;
              }
              to {
                transform: translateY(0);
                opacity: 1;
              }
            }
          `}</style>
        </div>
      )}

      {/* Grid of Saved Connections */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "16px",
        }}
      >
        {connections.length === 0 && !showForm && (
          <div
            className="glass-card"
            style={{
              gridColumn: "1 / -1",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px 40px",
              gap: "14px",
              border: "1px dashed var(--border)",
              borderRadius: "var(--radius-lg)",
            }}
          >
            <ServerCrash size={36} style={{ color: "var(--text-muted)", filter: "drop-shadow(0 0 4px rgba(255,92,114,0.05))" }} />
            <div
              style={{
                fontSize: "14px",
                fontWeight: "700",
                color: "var(--text-primary)",
              }}
            >
              No Database Endpoints Saved
            </div>
            <p
              style={{
                fontSize: "11.5px",
                color: "var(--text-secondary)",
                textAlign: "center",
                maxWidth: "340px",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Create your first PostgreSQL connection profile to start querying, editing rows, and inspecting tables with the Database Studio GUI.
            </p>
          </div>
        )}

        {connections.map((conn) => (
          <div
            key={conn.id}
            className="glass-card connection-card"
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "16px 18px",
              minHeight: "160px",
              border: "1px solid var(--border)",
              background: "var(--bg-secondary)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              borderRadius: "var(--radius-md)",
              transition: "all var(--transition-normal)",
            }}
          >
            {/* Card Header info */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                marginBottom: "14px",
              }}
            >
              <div
                style={{
                  padding: "8px",
                  background: "rgba(110, 86, 207, 0.08)",
                  border: "1px solid rgba(110, 86, 207, 0.15)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--accent-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: "2px",
                  boxShadow: "0 0 8px rgba(110, 86, 207, 0.05)",
                }}
              >
                <Server size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: "700",
                    fontSize: "13.5px",
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={conn.name}
                >
                  {conn.name}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--accent-hover)",
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginTop: "2px",
                    fontWeight: "600",
                  }}
                  title={conn.database}
                >
                  {conn.database}
                </div>
              </div>
            </div>

            {/* Credentials subtitle details */}
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-secondary)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                marginBottom: "16px",
                borderTop: "1px solid var(--border)",
                paddingTop: "8px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                opacity: 0.8,
              }}
            >
              {conn.user}@{conn.host}:{conn.port}
            </div>

            {/* Actions panel */}
            <div style={{ display: "flex", gap: "8px", marginTop: "auto" }}>
              <button
                className="btn-primary"
                style={{
                  flex: 1,
                  justifyContent: "center",
                  padding: "5px 12px",
                  fontSize: "11.5px",
                  height: "30px",
                  fontWeight: "600",
                  borderRadius: "var(--radius-sm)",
                  boxShadow: "0 2px 8px rgba(110, 86, 207, 0.1)",
                }}
                onClick={() => handleConnect(conn.id)}
                disabled={loading}
              >
                Connect Studio
              </button>

              <button
                className="btn-outline"
                style={{
                  color: "var(--danger)",
                  borderColor: "var(--danger-border)",
                  background: "transparent",
                  padding: "6px",
                  height: "30px",
                  width: "30px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "var(--radius-sm)",
                  transition: "all var(--transition-fast)",
                }}
                onClick={() => handleDelete(conn.id)}
                title="Remove Endpoint"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .connection-card:hover {
          transform: translateY(-2px);
          border-color: var(--border-active) !important;
          box-shadow: 0 8px 24px var(--accent-glow) !important;
        }
      `}</style>
    </div>
  );
}

