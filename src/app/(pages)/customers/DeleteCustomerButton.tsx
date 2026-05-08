"use client";
import { useRouter } from "next/navigation";

export default function DeleteCustomerButton({ id, name, contractCount }: { id: string; name: string; contractCount: number }) {
  const router = useRouter();

  async function handleDelete() {
    const msg = contractCount > 0
      ? `"${name}" มี ${contractCount} contract อยู่\nยืนยันลบ customer นี้? (contracts/assets จะยังคงอยู่ใน DB)`
      : `ยืนยันลบ "${name}"?`;
    if (!confirm(msg)) return;

    const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      router.refresh();
    } else {
      alert("Error: " + data.error);
    }
  }

  return (
    <button
      onClick={handleDelete}
      title="Delete customer"
      style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: "16px", padding: "4px 8px", borderRadius: "4px", lineHeight: 1 }}
    >
      x
    </button>
  );
}
