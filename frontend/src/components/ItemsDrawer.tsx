import { useEffect, useState } from "react";
import type { Item, ItemInput } from "../lib/api";

const field: React.CSSProperties = {
  width: "100%",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "10px 12px",
  color: "var(--text)",
  marginTop: 6,
};

/**
 * UI/UX §2 — slide-out drawer for create/edit so the user keeps sight of the
 * underlying data table (no context loss).
 */
export function ItemsDrawer({
  open,
  item,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  item: Item | null; // null = create mode
  saving: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: ItemInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [completed, setCompleted] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(item?.title ?? "");
      setDescription(item?.description ?? "");
      setCompleted(item?.completed ?? false);
      setTouched(false);
    }
  }, [open, item]);

  if (!open) return null;

  const titleInvalid = title.trim().length === 0 || title.length > 200;
  const showTitleError = touched && titleInvalid;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 420,
          maxWidth: "90vw",
          height: "100%",
          background: "var(--surface)",
          borderLeft: "1px solid var(--border)",
          padding: 24,
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>{item ? "Edit item" : "New item"}</h2>
          <button onClick={onClose} style={{ background: "none", border: 0, color: "var(--text-muted)", cursor: "pointer" }}>
            ✕
          </button>
        </div>

        <form
          style={{ marginTop: 20 }}
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (titleInvalid) return;
            onSubmit({ title: title.trim(), description: description || null, completed });
          }}
        >
          <label style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>
            TITLE
            <input
              style={{ ...field, borderColor: showTitleError ? "var(--error)" : "var(--border)" }}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="e.g. Ship v1 launch page"
              autoFocus
            />
          </label>
          {showTitleError && (
            <div style={{ color: "var(--error)", fontSize: 12, marginTop: 4 }}>
              Title is required (max 200 characters).
            </div>
          )}

          <label style={{ display: "block", marginTop: 16, fontSize: 12, fontWeight: 500, color: "var(--text-muted)" }}>
            DESCRIPTION
            <textarea
              style={{ ...field, minHeight: 90, resize: "vertical" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional details…"
            />
          </label>

          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 16, color: "var(--text-muted)" }}>
            <input
              type="checkbox"
              checked={completed}
              onChange={(e) => setCompleted(e.target.checked)}
            />
            Completed
          </label>

          {error && (
            <div
              style={{
                marginTop: 16,
                border: "1px solid var(--error)",
                borderRadius: 8,
                padding: "10px 12px",
                color: "var(--error)",
                fontSize: 13,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 24 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1,
                background: saving ? "var(--border)" : "var(--accent)",
                color: "#fff",
                border: 0,
                borderRadius: 8,
                padding: "10px 14px",
                fontWeight: 500,
                cursor: saving ? "default" : "pointer",
              }}
            >
              {saving ? "Saving…" : item ? "Save changes" : "Create item"}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "var(--text-muted)",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
