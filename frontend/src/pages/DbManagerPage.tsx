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
} from "lucide-react";
import React, { useEffect, useState } from "react";
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

  useEffect(() => {
    checkStatus();
  }, []);

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
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <h1
              className="page-title"
              style={{
                fontSize: "20px",
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Database size={20} color="var(--accent-primary)" />
              Database Studio
            </h1>
            <p className="page-subtitle" style={{ marginBottom: 0 }}>
              Connected to{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {activeConn.name}
              </strong>{" "}
              •{" "}
              <code>
                {activeConn.user}@{activeConn.host}:{activeConn.port}/
                {activeConn.database}
              </code>
            </p>
          </div>
          <button
            className="btn-danger"
            onClick={handleDisconnect}
            style={{ padding: "6px 12px", fontSize: "12px" }}
          >
            Disconnect Studio
          </button>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "13px",
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
              gap: "6px",
            }}
            onClick={() => setActiveTab("data")}
          >
            <TableIcon size={14} /> Data Browser
          </div>
          <div
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              fontSize: "13px",
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
              gap: "6px",
            }}
            onClick={() => setActiveTab("sql")}
          >
            <Terminal size={14} /> SQL Editor
          </div>
        </div>

        {/* Studio Workspace Area */}
        <div style={{ display: "flex", gap: "16px", flex: 1, minHeight: 0 }}>
          {/* Left panel: Schema & Table tree explorer */}
          <div
            className="glass-card"
            style={{
              width: "230px",
              display: "flex",
              flexDirection: "column",
              padding: "14px",
              overflowY: "auto",
              flexShrink: 0,
              background: "var(--bg-secondary)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                fontWeight: "600",
                fontSize: "10.5px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "var(--text-muted)",
              }}
            >
              <Layers
                size={12}
                color="var(--accent-primary)"
                style={{ opacity: 0.8 }}
              />
              Schema Explorer
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1px" }}
            >
              {schemas.length === 0 ? (
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    padding: "10px 0",
                  }}
                >
                  No database schemas found.
                </div>
              ) : (
                schemas.map((s) => (
                  <div key={s.name}>
                    <div
                      className={`nav-item ${expandedSchema === s.name ? "active" : ""}`}
                      style={{
                        padding: "5px 8px",
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "11.5px",
                        fontWeight: "500",
                        background:
                          expandedSchema === s.name
                            ? "linear-gradient(90deg, rgba(110, 86, 207, 0.08) 0%, rgba(110, 86, 207, 0.01) 100%)"
                            : "transparent",
                        borderColor:
                          expandedSchema === s.name
                            ? "rgba(110, 86, 207, 0.15)"
                            : "transparent",
                        cursor: "pointer",
                      }}
                      onClick={() => handleSchemaClick(s.name)}
                    >
                      <Layout size={11} color="var(--text-secondary)" />
                      <span>{s.name}</span>
                    </div>

                    {expandedSchema === s.name && (
                      <div
                        style={{
                          paddingLeft: "14px",
                          marginTop: "2px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "1px",
                          borderLeft: "1px solid var(--border)",
                          marginLeft: "13px",
                        }}
                      >
                        {tables.length === 0 ? (
                          <div
                            style={{
                              fontSize: "10.5px",
                              color: "var(--text-muted)",
                              padding: "5px 8px",
                            }}
                          >
                            No tables in schema
                          </div>
                        ) : (
                          tables.map((t) => (
                            <div
                              key={t.name}
                              style={{
                                padding: "4px 8px",
                                fontSize: "11.5px",
                                cursor: "pointer",
                                borderRadius: "var(--radius-sm)",
                                background:
                                  activeTable === t.name
                                    ? "linear-gradient(90deg, rgba(110, 86, 207, 0.06) 0%, rgba(0,0,0,0) 100%)"
                                    : "transparent",
                                color:
                                  activeTable === t.name
                                    ? "var(--text-primary)"
                                    : "var(--text-secondary)",
                                display: "flex",
                                alignItems: "center",
                                gap: "5px",
                                fontWeight:
                                  activeTable === t.name ? "600" : "normal",
                                border:
                                  activeTable === t.name
                                    ? "1px solid rgba(110, 86, 207, 0.1)"
                                    : "1px solid transparent",
                                transition: "all var(--transition-fast)",
                              }}
                              onClick={() => handleTableClick(t.name)}
                            >
                              <TableIcon
                                size={10.5}
                                color={
                                  activeTable === t.name
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
                              >
                                {t.name}
                              </span>
                            </div>
                          ))
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
                }}
              >
                {/* Data Browser Toolbar */}
                <div
                  style={{
                    padding: "10px 14px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "var(--bg-secondary)",
                  }}
                >
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      className="btn-primary"
                      onClick={openAddModal}
                      disabled={!activeTable}
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        height: "26px",
                      }}
                    >
                      <Plus size={12} /> Add Row
                    </button>
                    {selectedRowIndices.length > 0 && (
                      <button
                        className="btn-outline"
                        onClick={handleBulkDelete}
                        style={{
                          color: "var(--danger)",
                          borderColor: "var(--danger-border)",
                          padding: "4px 10px",
                          fontSize: "11px",
                          height: "26px",
                        }}
                      >
                        <Trash2 size={12} /> Delete ({selectedRowIndices.length}
                        )
                      </button>
                    )}
                    <button
                      className="btn-outline"
                      onClick={() => loadTableData(tableReq)}
                      disabled={!activeTable || dataLoading}
                      style={{ padding: "4px 8px", height: "26px" }}
                    >
                      <RefreshCw
                        size={12}
                        className={dataLoading ? "spin" : ""}
                      />
                    </button>
                  </div>

                  {tableData && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <span>
                        Showing {(tableData.page - 1) * tableData.page_size + 1}{" "}
                        -{" "}
                        {Math.min(
                          tableData.page * tableData.page_size,
                          tableData.total_rows,
                        )}{" "}
                        of {tableData.total_rows} rows
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <select
                          className="input-field"
                          value={tableReq.page_size}
                          onChange={handlePageSizeChange}
                          style={{
                            padding: "2px 6px",
                            fontSize: "11px",
                            height: "24px",
                          }}
                        >
                          <option value={25}>25 / page</option>
                          <option value={50}>50 / page</option>
                          <option value={100}>100 / page</option>
                        </select>
                        <button
                          className="btn-outline"
                          onClick={() => handlePageChange(tableReq.page - 1)}
                          disabled={tableReq.page <= 1}
                          style={{ padding: "2px 6px", height: "24px" }}
                        >
                          <ChevronLeft size={14} />
                        </button>
                        <span>
                          {tableReq.page} / {tableData.total_pages || 1}
                        </span>
                        <button
                          className="btn-outline"
                          onClick={() => handlePageChange(tableReq.page + 1)}
                          disabled={tableReq.page >= tableData.total_pages}
                          style={{ padding: "2px 6px", height: "24px" }}
                        >
                          <ChevronRight size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Data Grid */}
                <div
                  style={{
                    flex: 1,
                    overflow: "auto",
                    background: "var(--bg-primary)",
                  }}
                >
                  {!activeTable ? (
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
                      Select a table from the Schema Explorer to view its data.
                    </div>
                  ) : !tableData ? (
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
                      Loading data...
                    </div>
                  ) : tableData.columns.length === 0 ? (
                    <div
                      style={{
                        display: "flex",
                        height: "100%",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent-primary)",
                        fontSize: "12px",
                        gap: "6px",
                      }}
                    >
                      Table has no columns.
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
                              padding: "6px 12px",
                              borderBottom: "1px solid var(--border)",
                              width: "40px",
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={
                                selectedRowIndices.length ===
                                  tableData.rows.length &&
                                tableData.rows.length > 0
                              }
                              onChange={(e) => {
                                if (e.target.checked)
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
                                padding: "8px 12px",
                                borderBottom: "1px solid var(--border)",
                                color:
                                  tableReq.sort_col === c.name
                                    ? "var(--accent-primary)"
                                    : "var(--text-primary)",
                                fontWeight: "700",
                                position: "sticky",
                                top: 0,
                                background: "var(--bg-secondary)",
                                fontFamily:
                                  "var(--font-mono, 'Geist Mono', monospace)",
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {c.is_primary_key && (
                                <span
                                  style={{
                                    color: "var(--warning)",
                                    marginRight: "4px",
                                  }}
                                >
                                  🔑
                                </span>
                              )}
                              {c.name}
                              {tableReq.sort_col === c.name && (
                                <span
                                  style={{
                                    marginLeft: "4px",
                                    fontSize: "10px",
                                  }}
                                >
                                  {tableReq.sort_dir === "asc" ? "▲" : "▼"}
                                </span>
                              )}
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
                                padding: "20px",
                                color: "var(--text-muted)",
                              }}
                            >
                              Table is empty.
                            </td>
                          </tr>
                        ) : (
                          tableData.rows.map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              style={{
                                borderBottom: "1px solid var(--border)",
                                background: selectedRowIndices.includes(rIdx)
                                  ? "var(--bg-hover)"
                                  : "transparent",
                              }}
                              className="log-row"
                            >
                              <td style={{ padding: "6px 12px" }}>
                                <input
                                  type="checkbox"
                                  checked={selectedRowIndices.includes(rIdx)}
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
                                    padding: "8px 12px",
                                    whiteSpace: "nowrap",
                                    maxWidth: "240px",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    color: "var(--text-secondary)",
                                    fontFamily:
                                      "var(--font-mono, 'Geist Mono', monospace)",
                                    cursor: "cell",
                                  }}
                                >
                                  {editingCell?.rIdx === rIdx &&
                                  editingCell?.cIdx === cIdx ? (
                                    <input
                                      autoFocus
                                      className="input-field"
                                      style={{
                                        padding: "2px 4px",
                                        height: "20px",
                                        fontSize: "11px",
                                        width: "100%",
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
                          ))
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
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 100,
            }}
          >
            <div
              className="glass-card"
              style={{
                width: "500px",
                maxHeight: "80vh",
                display: "flex",
                flexDirection: "column",
                padding: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Plus size={16} color="var(--accent-primary)" />
                  Add Row to {tableReq.table}
                </h3>
                <button
                  className="btn-outline"
                  onClick={() => setShowAddModal(false)}
                  style={{ padding: "4px", border: "none" }}
                >
                  <X size={16} />
                </button>
              </div>

              <form
                onSubmit={handleAddSubmit}
                style={{
                  overflowY: "auto",
                  paddingRight: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  flex: 1,
                }}
              >
                {tableData.columns.map((col) => {
                  if (col.is_primary_key && col.data_type.includes("integer")) {
                    // rough heuristic for auto-increment pk
                    return null;
                  }
                  return (
                    <div key={col.name}>
                      <label
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "11px",
                          color: "var(--text-secondary)",
                          marginBottom: "4px",
                          fontWeight: "600",
                        }}
                      >
                        <span>
                          {col.name}{" "}
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontWeight: "normal",
                            }}
                          >
                            {col.data_type}
                          </span>
                        </span>
                        {col.is_nullable && (
                          <span style={{ color: "var(--text-muted)" }}>
                            Optional
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
                      />
                    </div>
                  );
                })}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "12px",
                    marginTop: "20px",
                  }}
                >
                  <button
                    type="button"
                    className="btn-outline"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Insert Row
                  </button>
                </div>
              </form>
            </div>
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
      }}
    >
      {/* Title */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 className="page-title">DB Manager</h1>
          <p className="page-subtitle" style={{ marginBottom: 0 }}>
            Create database tunnels and configure connections
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
          style={{ padding: "6px 12px", fontSize: "12px", gap: "6px" }}
        >
          <Plus size={14} />
          New Connection
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
        <div className="glass-card" style={{ animation: "fadeIn 0.2s ease" }}>
          <h3
            style={{
              marginBottom: "16px",
              fontSize: "13px",
              fontWeight: "600",
              color: "var(--text-primary)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Create PostgreSQL Connection
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "14px",
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  marginBottom: "4px",
                  fontWeight: "600",
                  textTransform: "uppercase",
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
                placeholder="Production DB"
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  marginBottom: "4px",
                  fontWeight: "600",
                  textTransform: "uppercase",
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
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  marginBottom: "4px",
                  fontWeight: "600",
                  textTransform: "uppercase",
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
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  marginBottom: "4px",
                  fontWeight: "600",
                  textTransform: "uppercase",
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
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  marginBottom: "4px",
                  fontWeight: "600",
                  textTransform: "uppercase",
                }}
              >
                User Credentials
              </label>
              <input
                type="text"
                className="input-field"
                value={formData.user}
                onChange={(e) =>
                  setFormData({ ...formData, user: e.target.value })
                }
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "10px",
                  color: "var(--text-secondary)",
                  marginBottom: "4px",
                  fontWeight: "600",
                  textTransform: "uppercase",
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
              />
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "8px",
              marginTop: "24px",
              justifyContent: "flex-end",
            }}
          >
            <button
              className="btn-outline"
              onClick={() => setShowForm(false)}
              style={{ padding: "6px 14px", fontSize: "12px" }}
            >
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleSaveConnection}
              style={{ padding: "6px 14px", fontSize: "12px" }}
            >
              Save Endpoint
            </button>
          </div>
        </div>
      )}

      {/* Grid of Saved Connections */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
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
              gap: "12px",
              border: "1px dashed var(--border)",
            }}
          >
            <ServerCrash size={32} style={{ color: "var(--text-muted)" }} />
            <div
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "var(--text-primary)",
              }}
            >
              No Database Endpoints Saved
            </div>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                textAlign: "center",
                maxWidth: "340px",
                lineHeight: 1.5,
              }}
            >
              Add a PostgreSQL endpoint connection config to launch active
              database studio query dashboards.
            </p>
          </div>
        )}

        {connections.map((conn) => (
          <div
            key={conn.id}
            className="glass-card"
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "16px",
              minHeight: "150px",
            }}
          >
            {/* Card Header info */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div
                style={{
                  padding: "8px",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--accent-primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginTop: "2px",
                }}
              >
                <Server size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: "700",
                    fontSize: "13px",
                    color: "var(--text-primary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {conn.name}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--text-secondary)",
                    fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    marginTop: "2px",
                  }}
                >
                  {conn.database}
                </div>
              </div>
            </div>

            {/* Credentials subtitle details */}
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-mono, 'Geist Mono', monospace)",
                marginBottom: "18px",
                borderTop: "1px solid var(--border)",
                paddingTop: "8px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {conn.user}@{conn.host}:{conn.port}
            </div>

            {/* Actions panel */}
            <div style={{ display: "flex", gap: "6px", marginTop: "auto" }}>
              <button
                className="btn-primary"
                style={{
                  flex: 1,
                  justifyContent: "center",
                  padding: "5px 12px",
                  fontSize: "12px",
                  height: "30px",
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
                  padding: "6px",
                  height: "30px",
                  width: "30px",
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
    </div>
  );
}
