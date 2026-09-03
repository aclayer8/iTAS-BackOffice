"use client";

import { AlertTriangle, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export default function ContractDeleteButton({
  contractId,
  contractNo,
  itemCount,
}: {
  contractId: string;
  contractNo: string;
  itemCount: number;
}) {
  const router = useRouter();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const closeDialog = useCallback(() => {
    if (deleting) return;
    setOpen(false);
    setError("");
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, [deleting]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (deleting) dialogRef.current?.focus();
    else cancelRef.current?.focus();
  }, [open, deleting]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !deleting) {
        closeDialog();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, deleting, closeDialog]);

  function openDialog() {
    setError("");
    setOpen(true);
  }

  async function deleteContract() {
    setDeleting(true);
    setError("");

    try {
      const response = await fetch(`/api/contracts/${contractId}`, { method: "DELETE" });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        throw new Error(
          response.redirected
            ? "Your session has expired. Sign in again before deleting this contract."
            : result?.error ?? "Unable to delete contract.",
        );
      }

      setOpen(false);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unable to delete contract.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={openDialog}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Delete contract ${contractNo}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "32px",
          height: "32px",
          border: "1px solid #fecaca",
          borderRadius: "7px",
          padding: 0,
          backgroundColor: "#fff7f7",
          color: "#b91c1c",
          cursor: "pointer",
        }}
        title="Delete contract"
      >
        <Trash2 size={15} aria-hidden="true" />
      </button>

      {open && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={`contract-delete-title-${contractId}`}
          aria-describedby={`contract-delete-description-${contractId}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDialog();
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 70,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backgroundColor: "rgba(15,23,42,.5)",
            textAlign: "left",
            whiteSpace: "normal",
          }}
        >
          <div ref={dialogRef} tabIndex={-1} aria-busy={deleting} style={{ width: "min(480px, 100%)", borderRadius: "12px", backgroundColor: "white", boxShadow: "0 24px 70px rgba(15,23,42,.3)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", padding: "20px 22px", borderBottom: "1px solid #fee2e2" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <span style={{ display: "inline-flex", padding: "8px", borderRadius: "99px", backgroundColor: "#fee2e2", color: "#b91c1c" }}>
                  <AlertTriangle size={20} aria-hidden="true" />
                </span>
                <div>
                  <h2 id={`contract-delete-title-${contractId}`} style={{ margin: 0, color: "#991b1b", fontSize: "18px" }}>Delete contract?</h2>
                  <div style={{ marginTop: "4px", overflowWrap: "anywhere", color: "#475569", fontFamily: "monospace", fontSize: "14px", fontWeight: 700 }}>{contractNo}</div>
                </div>
              </div>
              <button type="button" onClick={closeDialog} disabled={deleting} aria-label="Close delete contract dialog" style={{ border: "none", padding: "5px", background: "transparent", color: "#64748b", cursor: deleting ? "not-allowed" : "pointer" }}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <div style={{ padding: "20px 22px" }}>
              <p id={`contract-delete-description-${contractId}`} style={{ margin: 0, color: "#334155", fontSize: "14px", lineHeight: 1.6 }}>
                This contract will be removed from active screens. Its {itemCount} item{itemCount === 1 ? "" : "s"} will be preserved for audit and recovery, and linked Assets will not be deleted.
              </p>
              {error && (
                <div role="alert" style={{ marginTop: "14px", padding: "10px 12px", border: "1px solid #fecaca", borderRadius: "7px", backgroundColor: "#fef2f2", color: "#b91c1c", fontSize: "13px" }}>
                  {error}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", padding: "15px 22px", borderTop: "1px solid #e2e8f0", backgroundColor: "#f8fafc", borderRadius: "0 0 12px 12px" }}>
              <button ref={cancelRef} type="button" onClick={closeDialog} disabled={deleting} style={{ border: "1px solid #cbd5e1", borderRadius: "7px", padding: "9px 14px", backgroundColor: "white", color: "#334155", cursor: deleting ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700 }}>
                Cancel
              </button>
              <button type="button" onClick={deleteContract} disabled={deleting} style={{ display: "inline-flex", alignItems: "center", gap: "7px", border: "none", borderRadius: "7px", padding: "9px 14px", backgroundColor: deleting ? "#fca5a5" : "#b91c1c", color: "white", cursor: deleting ? "not-allowed" : "pointer", fontSize: "14px", fontWeight: 700 }}>
                <Trash2 size={16} aria-hidden="true" />
                {deleting ? "Deleting..." : "Delete Contract"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
