"use client";

import { ActionIcon, Alert, Badge, Button, FileInput, Group, Image, List, Modal, NumberInput, Paper, Select, SimpleGrid, Stack, Table, Text, TextInput, Textarea, Tooltip } from "@mantine/core";
import { Eye, File, ImageIcon, KeyRound, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const ACCEPT = "application/pdf,image/jpeg,image/png,image/gif,.doc,.docx,.xls,.xlsx";
const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
  doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

type LicenseFile = { id: string; fileName: string; fileSize: number; mimeType: string };
export type ContractLicenseRow = {
  id: string; licenseName: string; vendor: string | null; product: string | null; edition: string | null;
  quantity: number | null; unit: string | null; startDate: string | null; endDate: string | null;
  renewalStatus: string; note: string | null; files: LicenseFile[];
};

function mimeType(file: File) {
  return file.type || MIME_BY_EXTENSION[file.name.split(".").pop()?.toLowerCase() ?? ""] || "application/octet-stream";
}

function readableSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function Preview({ url, type, name }: { url: string; type: string; name: string }) {
  if (type.startsWith("image/")) return <Image src={url} alt={`Preview of ${name}`} fit="contain" mah={620} />;
  if (type === "application/pdf") return <iframe src={url} title={`Preview of ${name}`} width="100%" height="620" />;
  return <Alert icon={<File size={18} />} title="Inline preview unavailable">
    <Stack gap="xs"><Text size="sm">This file type is handled by its desktop application.</Text><Button component="a" href={url} target="_blank" rel="noopener noreferrer" variant="light">Open file</Button></Stack>
  </Alert>;
}

export function AddLicenseButton({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [opened, setOpened] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [createdLicenseId, setCreatedLicenseId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; type: string; name: string } | null>(null);
  const [form, setForm] = useState({ licenseName: "", vendor: "", product: "", edition: "", quantity: 1, unit: "USERS", startDate: "", endDate: "", renewalStatus: "ACTIVE", note: "" });

  useEffect(() => () => { if (preview?.url.startsWith("blob:")) URL.revokeObjectURL(preview.url); }, [preview]);

  function showLocalPreview(file: File) {
    if (preview?.url.startsWith("blob:")) URL.revokeObjectURL(preview.url);
    setPreview({ url: URL.createObjectURL(file), type: mimeType(file), name: file.name });
  }

  function resetForm() {
    setOpened(false);
    setFiles([]);
    setCreatedLicenseId(null);
    setError(null);
    setForm({ licenseName: "", vendor: "", product: "", edition: "", quantity: 1, unit: "USERS", startDate: "", endDate: "", renewalStatus: "ACTIVE", note: "" });
  }

  async function save() {
    if (form.licenseName.trim().length < 2) { setError("License name is required."); return; }
    if (files.length > 10 || files.some(file => file.size <= 0 || file.size > 25 * 1024 * 1024)) { setError("Select up to 10 files, maximum 25 MB each."); return; }
    setSaving(true); setError(null);
    try {
      let licenseId = createdLicenseId;
      if (!licenseId) {
        const response = await fetch(`/api/contracts/${contractId}/licenses`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, licenseName: form.licenseName.trim(), startDate: form.startDate || null, endDate: form.endDate || null }) });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error ?? "Unable to add license.");
        licenseId = result.data.id as string;
        setCreatedLicenseId(licenseId);
      }
      for (const file of [...files]) {
        const metadata = { fileName: file.name, fileSize: file.size, mimeType: mimeType(file) };
        const initResponse = await fetch(`/api/licenses/${licenseId}/attachments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(metadata) });
        const init = await initResponse.json();
        if (!initResponse.ok || !init.success) throw new Error(init.error ?? `Unable to prepare ${file.name}.`);
        const uploadResponse = await fetch(init.data.uploadUrl, { method: "PUT", headers: { "Content-Type": metadata.mimeType }, body: file });
        if (!uploadResponse.ok) throw new Error(`Upload failed for ${file.name}.`);
        const completeResponse = await fetch(`/api/licenses/${licenseId}/attachments`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...metadata, s3Key: init.data.s3Key }) });
        const complete = await completeResponse.json();
        if (!completeResponse.ok || !complete.success) throw new Error(complete.error ?? `Unable to confirm ${file.name}.`);
        setFiles(current => current.filter(candidate => candidate !== file));
      }
      resetForm();
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to add license."); }
    finally { setSaving(false); }
  }

  return <>
    <Button leftSection={<KeyRound size={16} />} variant="light" color="indigo" onClick={() => setOpened(true)}>Add License</Button>
    <Modal opened={opened} onClose={() => !saving && !createdLicenseId && resetForm()} title="Add License" size="xl" centered closeOnClickOutside={!saving && !createdLicenseId} closeOnEscape={!saving && !createdLicenseId} withCloseButton={!createdLicenseId}>
      <Stack>
        {error && <Alert color="red" title="Unable to save">{error}</Alert>}
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <TextInput required label="License name" value={form.licenseName} onChange={event => setForm({ ...form, licenseName: event.currentTarget.value })} maxLength={200} />
          <TextInput label="Vendor" value={form.vendor} onChange={event => setForm({ ...form, vendor: event.currentTarget.value })} maxLength={100} />
          <TextInput label="Product" value={form.product} onChange={event => setForm({ ...form, product: event.currentTarget.value })} maxLength={100} />
          <TextInput label="Edition" value={form.edition} onChange={event => setForm({ ...form, edition: event.currentTarget.value })} maxLength={100} />
          <NumberInput label="Quantity" value={form.quantity} onChange={value => setForm({ ...form, quantity: Number(value) || 1 })} min={1} max={1_000_000} />
          <Select label="Unit" data={["USERS", "DEVICES", "CORES", "SEATS", "LICENSES"]} value={form.unit} onChange={value => setForm({ ...form, unit: value ?? "USERS" })} />
          <TextInput type="date" label="Start date" value={form.startDate} onChange={event => setForm({ ...form, startDate: event.currentTarget.value })} />
          <TextInput type="date" label="End date" value={form.endDate} min={form.startDate || undefined} onChange={event => setForm({ ...form, endDate: event.currentTarget.value })} />
        </SimpleGrid>
        <Textarea label="Note" value={form.note} onChange={event => setForm({ ...form, note: event.currentTarget.value })} maxLength={2000} autosize minRows={2} />
        <FileInput leftSection={<Upload size={16} />} label="License files or images" description="PDF, JPG, PNG, GIF, Word or Excel; up to 10 files, 25 MB each" placeholder="Select files" accept={ACCEPT} multiple clearable value={files} onChange={setFiles} />
        {files.length > 0 && <List spacing="xs">{files.map(file => <List.Item key={`${file.name}-${file.lastModified}`} icon={file.type.startsWith("image/") ? <ImageIcon size={16} /> : <File size={16} />}>
          <Group gap="xs"><Text size="sm">{file.name} ({readableSize(file.size)})</Text><Button variant="subtle" size="compact-xs" onClick={() => showLocalPreview(file)}>Preview</Button></Group>
        </List.Item>)}</List>}
        <Group justify="flex-end">
          {createdLicenseId ? <Button variant="default" onClick={() => { resetForm(); router.refresh(); }} disabled={saving}>Finish without remaining files</Button> : <Button variant="default" onClick={resetForm} disabled={saving}>Cancel</Button>}
          <Button onClick={save} loading={saving}>{createdLicenseId ? "Retry remaining files" : "Save License"}</Button>
        </Group>
      </Stack>
    </Modal>
    <Modal opened={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.name ?? "File preview"} size="xl" centered>{preview && <Preview {...preview} name={preview.name} />}</Modal>
  </>;
}

export function ContractLicensePanel({ licenses }: { licenses: ContractLicenseRow[] }) {
  const [preview, setPreview] = useState<{ url: string; type: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  async function openFile(licenseId: string, file: LicenseFile) {
    setError(null);
    const response = await fetch(`/api/licenses/${licenseId}/attachments/${file.id}`);
    const result = await response.json();
    if (!response.ok || !result.success) { setError(result.error ?? "Unable to preview file."); return; }
    setPreview({ url: result.data.url, type: file.mimeType, name: file.fileName });
  }
  if (!licenses.length) return <Paper withBorder p="lg" mt="md"><Text c="dimmed" ta="center">No licenses linked to this contract.</Text></Paper>;
  return <Paper withBorder mt="md" radius="md">
    <Group justify="space-between" p="md"><Text fw={700} c="dark.8">Licenses ({licenses.length})</Text></Group>
    {error && <Alert color="red" m="md">{error}</Alert>}
    <Table.ScrollContainer minWidth={900}><Table striped highlightOnHover>
      <Table.Thead><Table.Tr><Table.Th>License</Table.Th><Table.Th>Vendor / Product</Table.Th><Table.Th>Quantity</Table.Th><Table.Th>Period</Table.Th><Table.Th>Status</Table.Th><Table.Th>Files</Table.Th></Table.Tr></Table.Thead>
      <Table.Tbody>{licenses.map(license => <Table.Tr key={license.id}>
        <Table.Td><Text fw={600}>{license.licenseName}</Text>{license.edition && <Text size="xs" c="dimmed">{license.edition}</Text>}</Table.Td>
        <Table.Td>{[license.vendor, license.product].filter(Boolean).join(" / ") || "–"}</Table.Td>
        <Table.Td>{license.quantity ?? "–"} {license.unit ?? ""}</Table.Td>
        <Table.Td>{license.startDate ? new Date(license.startDate).toLocaleDateString("en-GB") : "–"} – {license.endDate ? new Date(license.endDate).toLocaleDateString("en-GB") : "–"}</Table.Td>
        <Table.Td><Badge color={license.renewalStatus === "ACTIVE" ? "green" : license.renewalStatus === "EXPIRED" ? "red" : "yellow"}>{license.renewalStatus.replaceAll("_", " ")}</Badge></Table.Td>
        <Table.Td><Group gap="xs">{license.files.length || "–"}{license.files.map(file => <Tooltip key={file.id} label={`Preview ${file.fileName}`}><ActionIcon variant="subtle" aria-label={`Preview ${file.fileName}`} onClick={() => openFile(license.id, file)}><Eye size={16} /></ActionIcon></Tooltip>)}</Group></Table.Td>
      </Table.Tr>)}</Table.Tbody>
    </Table></Table.ScrollContainer>
    <Modal opened={Boolean(preview)} onClose={() => setPreview(null)} title={preview?.name ?? "File preview"} size="xl" centered>{preview && <Preview {...preview} name={preview.name} />}</Modal>
  </Paper>;
}
