import { useCallback, useEffect, useState } from "react";
import { ItemsDrawer } from "../components/ItemsDrawer";
import { ApiError, itemsApi, type Item, type ItemInput } from "../lib/api";

const PAGE_SIZE = 10;

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 16px",
  fontSize: 12,
  fontWeight: 500,
  color: "var(--text-muted)",
  borderBottom: "1px solid var(--border)",
  position: "sticky",
  top: 0,
  background: "var(--surface)",
};

const td: React.CSSProperties = {
  padding: "12px 16px",
  borderBottom: "1px solid var(--border)",
  verticalAlign: "middle",
};

/** Neon → Lambda → API Gateway data table with drawer CRUD (UI/UX §2-3). */
export function DashboardPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setItems((await itemsApi.list()).items);
    } catch (err) {
      setLoadError(
        err instanceof ApiError
          ? `${err.message} (${err.status})`
          : "Could not reach the API — check VITE_API_URL.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(input: ItemInput) {
    setSaving(true);
    setDrawerError(null);
    try {
      if (editing) await itemsApi.update(editing.id, input);
      else await itemsApi.create(input);
      setDrawerOpen(false);
      setEditing(null);
      await load();
    } catch (err) {
      setDrawerError(
        err instanceof ApiError
          ? [err.message, ...(err.errors ?? [])].join(" — ")
          : "Unexpected error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(item: Item) {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    try {
      await itemsApi.remove(item.id);
      await load();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "Delete failed");
    }
  }

  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const rows = items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>Dashboard</h1>
        <button
          onClick={() => {
            setEditing(null);
            setDrawerError(null);
            setDrawerOpen(true);
          }}
          style={{
            background: "var(--accent)",
            color: "#fff",
            border: 0,
            borderRadius: 8,
            padding: "8px 14px",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          + New item
        </button>
      </div>
      <p style={{ color: "var(--text-muted)", marginTop: 0 }}>
        Items stored in Neon Postgres, served by Lambda via API Gateway.
      </p>

      {loadError && (
        <div
          style={{
            border: "1px solid var(--error)",
            borderRadius: 8,
            padding: "10px 14px",
            color: "var(--error)",
            marginBottom: 16,
          }}
        >
          {loadError}
        </div>
      )}

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={th}>TITLE</th>
              <th style={th}>STATUS</th>
              <th style={th}>UPDATED</th>
              <th style={{ ...th, textAlign: "right" }}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td style={td}>
                    <Skeleton width="60%" />
                  </td>
                  <td style={td}>
                    <Skeleton width="70px" />
                  </td>
                  <td style={td}>
                    <Skeleton width="90px" />
                  </td>
                  <td style={td}>
                    <Skeleton width="60px" />
                  </td>
                </tr>
              ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td style={{ ...td, color: "var(--text-muted)", padding: 32 }} colSpan={4}>
                  No items yet — create your first one.
                </td>
              </tr>
            )}

            {!loading &&
              rows.map((item) => (
                <tr key={item.id} style={{ transition: "background 120ms" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "var(--border)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ ...td, maxWidth: 360 }}>
                    <div style={{ fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.title}
                    </div>
                    {item.description && (
                      <div style={{ color: "var(--text-muted)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.description}
                      </div>
                    )}
                  </td>
                  <td style={td}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        padding: "3px 10px",
                        borderRadius: 999,
                        color: item.completed ? "var(--success)" : "var(--text-muted)",
                        border: `1px solid ${item.completed ? "var(--success)" : "var(--border)"}`,
                      }}
                    >
                      {item.completed ? "Completed" : "Open"}
                    </span>
                  </td>
                  <td style={{ ...td, color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                    {new Date(item.updatedAt).toLocaleDateString()}
                  </td>
                  <td style={{ ...td, textAlign: "right", whiteSpace: "nowrap" }}>
                    <button
                      onClick={() => {
                        setEditing(item);
                        setDrawerError(null);
                        setDrawerOpen(true);
                      }}
                      style={{ background: "none", border: 0, color: "var(--accent)", cursor: "pointer", fontWeight: 500 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => void remove(item)}
                      style={{ background: "none", border: 0, color: "var(--error)", cursor: "pointer", fontWeight: 500, marginLeft: 12 }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 16px", color: "var(--text-muted)", fontSize: 12 }}>
          <span>
            {items.length} item{items.length === 1 ? "" : "s"}
            {!loading && items.length > 0 && ` · page ${page + 1} of ${pageCount}`}
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", color: page === 0 ? "var(--border)" : "var(--text-muted)", cursor: page === 0 ? "default" : "pointer" }}
            >
              ← Prev
            </button>
            <button
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "4px 10px", color: page >= pageCount - 1 ? "var(--border)" : "var(--text-muted)", cursor: page >= pageCount - 1 ? "default" : "pointer" }}
            >
              Next →
            </button>
          </span>
        </div>
      </div>

      <ItemsDrawer
        open={drawerOpen}
        item={editing}
        saving={saving}
        error={drawerError}
        onClose={() => {
          setDrawerOpen(false);
          setEditing(null);
        }}
        onSubmit={(input) => void submit(input)}
      />
    </div>
  );
}

function Skeleton({ width }: { width: string }) {
  return (
    <div
      style={{
        width,
        height: 12,
        borderRadius: 6,
        background: "linear-gradient(90deg, var(--border) 25%, var(--surface) 50%, var(--border) 75%)",
        backgroundSize: "200% 100%",
        animation: "pulse 1.2s ease-in-out infinite",
      }}
    >
      <style>{`@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }`}</style>
    </div>
  );
}
