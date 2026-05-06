// ─────────────────────────────────────────────────────────────────────────────
// iTAS Excel Parser — Certification of Maintenance Service
// Reads each sheet, returns structured data ready for DB import
// ─────────────────────────────────────────────────────────────────────────────
import * as XLSX from "xlsx";

export interface ParsedItem {
  itemNo: number;
  partNumber: string;
  description: string;
  serialNumber: string | null;
  sla: string;
  pm: string;
  startDate: Date | null;
  endDate: Date | null;
  remark: string;
  quantity: string;
}

export interface ParsedCustomer {
  name: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
}

export interface ParsedCertification {
  sheetName: string;
  contractNo: string;
  poNo: string;
  soNo: string;
  date: Date | null;
  serviceDesc: string;
  customer: ParsedCustomer;
  items: ParsedItem[];
  parseErrors: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function cellStr(v: unknown): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v).trim().replace(/\s+/g, " ").replace(/ /g, " ");
}

function cellDate(v: unknown): Date | null {
  if (v == null) return null;
  if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
  if (typeof v === "number") {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(v);
    if (!d) return null;
    return new Date(d.y, d.m - 1, d.d);
  }
  if (typeof v === "string") {
    const parsed = new Date(v);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

/** Find first row index (0-based) where any cell contains the given substring (case-insensitive) */
function findRowWith(rows: unknown[][], keyword: string): number {
  const kw = keyword.toLowerCase();
  return rows.findIndex((row) =>
    row.some((cell) => cellStr(cell).toLowerCase().includes(kw))
  );
}

/** Find value in a row: look for a cell matching label, return next non-empty cell value */
function extractAfterLabel(
  row: unknown[],
  label: string
): string {
  const lbl = label.toLowerCase();
  for (let i = 0; i < row.length - 1; i++) {
    if (cellStr(row[i]).toLowerCase().includes(lbl)) {
      // Return first non-empty cell after it (skip ':' separators)
      for (let j = i + 1; j < row.length; j++) {
        const v = cellStr(row[j]);
        if (v && v !== ":") return v;
      }
    }
  }
  return "";
}

/** Get col D value (index 3) which is the standard value column */
function colDValue(row: unknown[]): string {
  return cellStr(row[3]) || cellStr(row[4]) || "";
}

/** Get value from the rightmost non-empty cell in a row after a position */
function rightmostValue(row: unknown[], fromCol: number): string {
  for (let i = row.length - 1; i >= fromCol; i--) {
    const v = cellStr(row[i]);
    if (v && v !== ":") return v;
  }
  return "";
}

// ─── Main Parser ─────────────────────────────────────────────────────────────

export function parseSheet(
  sheetName: string,
  sheet: XLSX.WorkSheet
): ParsedCertification {
  const errors: string[] = [];

  // Convert to 2D array (with dates preserved)
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: false, // keep as strings except dates
    dateNF: "yyyy-mm-dd",
  });

  // Re-parse with dates to get proper Date objects
  const rawDates: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: null,
    raw: true, // get raw values (numbers for dates)
  });

  // ── Find Contract No row ──────────────────────────────────────────────────
  const contractRowIdx = findRowWith(raw, "contract no");
  if (contractRowIdx === -1) {
    errors.push("Could not find 'Contract No' row");
    return emptyResult(sheetName, errors);
  }

  const contractRow = raw[contractRowIdx];
  const contractRowDates = rawDates[contractRowIdx];

  // Contract No is always in col D (index 3)
  let contractNo = cellStr(contractRow[3]);
  // Sometimes contract no uses colE if D has merged
  if (!contractNo) contractNo = cellStr(contractRow[4]);

  // Date: search right side of contract row
  let docDate: Date | null = null;
  for (let i = 5; i < contractRow.length; i++) {
    const label = cellStr(contractRow[i]).toLowerCase();
    if (label.includes("date")) {
      // Value should be next cell
      for (let j = i + 1; j < contractRowDates.length; j++) {
        const dv = rawDates[contractRowIdx][j];
        if (dv != null) {
          docDate = cellDate(dv);
          break;
        }
      }
      break;
    }
  }
  // Fallback: first date-looking cell in row
  if (!docDate) {
    for (let i = 4; i < contractRowDates.length; i++) {
      const d = cellDate(rawDates[contractRowIdx][i]);
      if (d) { docDate = d; break; }
    }
  }

  // ── PO No ─────────────────────────────────────────────────────────────────
  const poRow = raw[contractRowIdx + 1] ?? [];
  let poNo = colDValue(poRow);

  // ── Service Description ───────────────────────────────────────────────────
  const descRow = raw[contractRowIdx + 2] ?? [];
  let serviceDesc = colDValue(descRow);
  // Continuation on next row
  const descRow2 = raw[contractRowIdx + 3] ?? [];
  const cont2 = colDValue(descRow2);
  if (cont2 && !cont2.startsWith("(SO")) serviceDesc += " " + cont2;
  // Extract SO number from continuation
  let soNo = "";
  for (const r of [raw[contractRowIdx + 3], raw[contractRowIdx + 4], raw[contractRowIdx + 2]]) {
    if (!r) continue;
    for (const cell of r) {
      const v = cellStr(cell);
      if (/SO\d{2}-\d{4}/.test(v)) {
        soNo = v.match(/(SO\d{2}-\d{4})/)?.[1] ?? "";
        break;
      }
    }
    if (soNo) break;
  }

  // ── Customer Section ──────────────────────────────────────────────────────
  const custHeaderIdx = findRowWith(raw, "customer");
  if (custHeaderIdx === -1) errors.push("Could not find Customer section");

  let custName = "";
  let custAddress = "";
  let custContact = "";
  let custPhone = "";
  let custEmail = "";

  // Search rows after Customer header for label → value pairs
  const custStart = custHeaderIdx === -1 ? contractRowIdx + 4 : custHeaderIdx + 1;
  for (let i = custStart; i < Math.min(custStart + 15, raw.length); i++) {
    const row = raw[i];
    if (!row) continue;
    const labelCell = cellStr(row[0]) + " " + cellStr(row[1]);
    const val = colDValue(row);

    if (!custName && labelCell.toLowerCase().includes("name")) {
      custName = val || cellStr(row[8]) || ""; // some sheets have value in col I
    }
    if (!custAddress && labelCell.toLowerCase().includes("address")) {
      custAddress = val;
      // Check continuation row (next row has empty label but value in col D)
      const nextRow = raw[i + 1] ?? [];
      const nextLabel = cellStr(nextRow[0]);
      if (!nextLabel || nextLabel.trim() === "") {
        const contVal = colDValue(nextRow);
        if (contVal) custAddress += " " + contVal;
      }
    }
    if (!custContact && labelCell.toLowerCase().includes("contact")) {
      custContact = val;
    }
    if (!custPhone && labelCell.toLowerCase().includes("phone")) {
      custPhone = val;
    }
    if (!custEmail && labelCell.toLowerCase().includes("e-mail")) {
      custEmail = val;
    }
  }

  // ── Items Table ───────────────────────────────────────────────────────────
  const itemHeaderIdx = findRowWith(raw, "part number");
  const items: ParsedItem[] = [];

  if (itemHeaderIdx === -1) {
    errors.push("Could not find items table header");
  } else {
    const headerRow = raw[itemHeaderIdx];

    // Dynamically detect column positions from header
    const colMap: Record<string, number> = {};
    headerRow.forEach((cell, idx) => {
      const v = cellStr(cell).toLowerCase();
      if (v.includes("part"))        colMap.partNumber  = idx;
      if (v.includes("description")) colMap.description = idx;
      if (v.includes("serial"))      colMap.serial      = idx;
      if (v === "sla")               colMap.sla         = idx;
      if (v === "pm")                colMap.pm          = idx;
      if (v.includes("start"))       colMap.startDate   = idx;
      if (v.includes("end"))         colMap.endDate     = idx;
      if (v.includes("remark"))      colMap.remark      = idx;
      if (v.includes("quantity") || v.includes("qty")) colMap.quantity = idx;
      if (v === "period")            colMap.period      = idx;
    });

    // Defaults if not found
    if (!("description" in colMap)) colMap.description = 3;
    if (!("serial"      in colMap)) colMap.serial      = 4;
    if (!("sla"         in colMap)) colMap.sla         = 5;
    if (!("pm"          in colMap)) colMap.pm          = 6;
    if (!("startDate"   in colMap)) colMap.startDate   = 7;
    if (!("endDate"     in colMap)) colMap.endDate     = 8;

    // Read data rows
    let itemNo = 0;
    for (let i = itemHeaderIdx + 1; i < raw.length; i++) {
      const row = raw[i];
      const rowDates = rawDates[i];
      if (!row) continue;

      // Check if this row has an item number in col A
      const colA = cellStr(row[0]);
      if (!colA && !cellStr(row[colMap.description])) continue; // skip empty

      // If col A is a number, it's a new item
      if (/^\d+$/.test(colA)) {
        itemNo = parseInt(colA);

        const partNumber  = cellStr(row[colMap.partNumber  ?? 1]);
        const description = cellStr(row[colMap.description ?? 3]);
        const serial      = cellStr(row[colMap.serial      ?? 4]);
        const sla         = cellStr(row[colMap.sla         ?? 5]);
        const pm          = cellStr(row[colMap.pm          ?? 6]);
        const remark      = cellStr(row[colMap.remark      ?? 9]);
        const quantity    = cellStr(row[colMap.quantity    ?? -1]) || "1";
        const period      = cellStr(row[colMap.period      ?? -1]);

        let startDate: Date | null = null;
        let endDate: Date | null = null;

        if (colMap.startDate !== undefined) {
          startDate = cellDate(rowDates?.[colMap.startDate]);
        }
        if (colMap.endDate !== undefined) {
          endDate = cellDate(rowDates?.[colMap.endDate]);
        }

        // If only "period" column exists, try to parse
        if (!endDate && period && startDate) {
          const m = period.match(/(\d+)\s*month/i);
          if (m) {
            const months = parseInt(m[1]);
            endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + months);
          }
        }

        if (description) {
          items.push({
            itemNo,
            partNumber,
            description,
            serialNumber: serial && serial.toLowerCase() !== "n/a" && serial !== "-" ? serial : null,
            sla,
            pm,
            startDate,
            endDate,
            remark,
            quantity,
          });
        }
      } else if (colA === "" && items.length > 0) {
        // Continuation row — append description
        const contDesc = cellStr(row[colMap.description ?? 3]);
        if (contDesc && contDesc.startsWith("-")) {
          items[items.length - 1].description += "\n" + contDesc;
        }
      }
    }
  }

  // ── Derive Contract No from sheet name if missing ─────────────────────────
  if (!contractNo) {
    const match = sheetName.match(/(iTAS-MA\d+)/i) || sheetName.match(/(MA\d+)/i);
    if (match) contractNo = match[1].startsWith("iTAS") ? match[1] : "iTAS-" + match[1];
  }

  return {
    sheetName,
    contractNo: contractNo.trim(),
    poNo: poNo.trim(),
    soNo: soNo.trim(),
    date: docDate,
    serviceDesc: serviceDesc.trim(),
    customer: {
      name:          custName.trim(),
      address:       custAddress.trim(),
      contactPerson: custContact.trim(),
      phone:         custPhone.trim(),
      email:         custEmail.trim(),
    },
    items,
    parseErrors: errors,
  };
}

function emptyResult(sheetName: string, errors: string[]): ParsedCertification {
  return {
    sheetName, contractNo: "", poNo: "", soNo: "", date: null, serviceDesc: "",
    customer: { name: "", address: "", contactPerson: "", phone: "", email: "" },
    items: [], parseErrors: errors,
  };
}

// ─── Parse whole workbook ────────────────────────────────────────────────────

export function parseCertificationWorkbook(buffer: Buffer): ParsedCertification[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  return workbook.SheetNames.map((name) =>
    parseSheet(name, workbook.Sheets[name])
  );
}
