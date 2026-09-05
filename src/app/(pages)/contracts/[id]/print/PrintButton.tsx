"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ className }: { className: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={className}
    >
      <Printer size={17} aria-hidden="true" />
      Print / Save PDF
    </button>
  );
}
