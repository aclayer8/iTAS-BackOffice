"use client";

import Link from "next/link";
import { MoreHorizontal, FileText, Printer } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ContractEditDialog from "./ContractEditDialog";
import ContractDeleteButton from "./ContractDeleteButton";
import type { ContractListRow } from "@/lib/contract-list";
import styles from "./contracts.module.css";

export default function ContractRowActions({ row, canEdit, canDelete }: { row: ContractListRow; canEdit: boolean; canDelete: boolean }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!position) return;
    panel.current?.querySelector<HTMLElement>("a,button")?.focus();
    const close = () => { setPosition(null); trigger.current?.focus(); };
    const hasDialog = () => !!panel.current?.querySelector('[role="dialog"], [role="alertdialog"]');
    const outside = (event: PointerEvent) => {
      if (!hasDialog() && !panel.current?.contains(event.target as Node) && !trigger.current?.contains(event.target as Node)) close();
    };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !hasDialog()) close(); };
    const resize = () => { if (!hasDialog()) close(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    window.addEventListener("resize", resize);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); window.removeEventListener("resize", resize); };
  }, [position]);
  return <>
    <button ref={trigger} className={styles.actionButton} type="button" aria-label={`Actions for ${row.contractNo}`} aria-expanded={!!position} aria-controls={`actions-${row.id}`} onClick={() => {
      if (position) { setPosition(null); return; }
      const rect = trigger.current!.getBoundingClientRect();
      setPosition({ top: Math.max(8, Math.min(rect.bottom + 6, window.innerHeight - 230)), left: Math.max(8, Math.min(rect.right - 220, window.innerWidth - 228)) });
    }}><MoreHorizontal size={19} aria-hidden="true" /></button>
    {position && createPortal(<div ref={panel} id={`actions-${row.id}`} role="group" aria-label={`Contract actions for ${row.contractNo}`} className={styles.actionPanel} style={position}>
      <Link href={`/contracts/${row.id}`}><FileText size={16} /> View contract</Link>
      <Link href={`/contracts/${row.id}/print`}><Printer size={16} /> Preview / Print</Link>
      {canEdit && <div><ContractEditDialog contractId={row.id} contractNo={row.contractNo} /><span>Edit contract</span></div>}
      {canDelete && <div><ContractDeleteButton contractId={row.id} contractNo={row.contractNo} itemCount={row.assets} /><span>Delete contract</span></div>}
    </div>, document.body)}
  </>;
}
