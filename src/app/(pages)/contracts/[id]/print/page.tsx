import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import PrintButton from "./PrintButton";
import styles from "./print.module.css";

export const dynamic = "force-dynamic";

function formatDate(value: Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(value);
}

function display(value: string | null | undefined) {
  return value?.trim() || "-";
}

export default async function ContractPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const contract = await prisma.contract.findFirst({
    where: { OR: [{ id }, { contractNo: id }], deletedAt: null },
    include: {
      customer: true,
      items: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });

  if (!contract) notFound();

  const printDate = new Date();
  const minimumRows = 12;
  const emptyRows = Math.max(0, minimumRows - contract.items.length);
  const companyPhone = process.env.COMPANY_PHONE || "099-456-6951, 089-672-2622";
  const companyEmail = process.env.COMPANY_EMAIL || "support@i-tas.co.th";
  const companyWebsite = process.env.COMPANY_WEBSITE || "www.i-tas.co.th";

  return (
    <main className={styles.previewPage}>
      <div className={styles.toolbar} aria-label="Contract print actions">
        <Link href={`/contracts/${contract.id}`} className={styles.backButton}>
          <ArrowLeft size={17} aria-hidden="true" />
          Back to Contract
        </Link>
        <PrintButton className={styles.printButton} />
      </div>

      <article className={styles.paper} aria-label={`Certification for ${contract.contractNo}`}>
        <header className={styles.documentHeader}>
          <Image
            src="/itas-logo.png"
            alt="iTAS Solutions"
            width={130}
            height={72}
            className={styles.logo}
            priority
          />
          <h1 className={styles.title}>Certification of Maintenance Service</h1>
        </header>

        <table className={styles.metaTable}>
          <tbody>
            <tr>
              <td className={styles.metaLabel}>Contract No</td><td>:</td>
              <td className={styles.metaValue}>{contract.contractNo}</td>
              <td className={styles.serviceLabel}>Date</td><td>:</td>
              <td>{formatDate(printDate)}</td>
            </tr>
            <tr>
              <td className={styles.metaLabel}>Purchase Order No.</td><td>:</td>
              <td className={styles.metaValue}>{display(contract.poNo)}</td>
              <td className={styles.serviceLabel}>Helpdesk Hotline</td><td>:</td>
              <td>{companyPhone}</td>
            </tr>
            <tr>
              <td className={styles.metaLabel}>Service Description</td><td>:</td>
              <td className={styles.metaValue}>{display(contract.serviceDesc)}</td>
              <td className={styles.serviceLabel}>Service E-mail</td><td>:</td>
              <td>{companyEmail}</td>
            </tr>
            <tr>
              <td className={styles.metaLabel}>SO / Remark</td><td>:</td>
              <td className={styles.metaValue}>{display(contract.soNo || contract.remark)}</td>
              <td className={styles.serviceLabel}>Website</td><td>:</td>
              <td>{companyWebsite}</td>
            </tr>
          </tbody>
        </table>

        <section className={styles.customerSection}>
          <h2 className={styles.sectionTitle}>Customer</h2>
          <table className={styles.customerTable}>
            <tbody>
              <tr><td className={styles.customerLabel}>Name</td><td>:</td><td>{contract.customer.companyName}</td></tr>
              <tr><td className={styles.customerLabel}>Address</td><td>:</td><td>{display(contract.customer.address)}</td></tr>
              <tr><td className={styles.customerLabel}>Contact Person</td><td>:</td><td>{display(contract.customer.contactPerson)}</td></tr>
              <tr><td className={styles.customerLabel}>Phone</td><td>:</td><td>{display(contract.customer.contactPhone)}</td></tr>
              <tr><td className={styles.customerLabel}>E-mail</td><td>:</td><td>{display(contract.customer.contactEmail)}</td></tr>
            </tbody>
          </table>
        </section>

        <table className={styles.itemsTable}>
          <colgroup>
            <col style={{ width: "5%" }} />
            <col style={{ width: "13%" }} />
            <col style={{ width: "27%" }} />
            <col style={{ width: "15%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "5%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "7%" }} />
          </colgroup>
          <thead>
            <tr>
              <th>Item</th>
              <th>Part Number</th>
              <th>Description</th>
              <th>Serial / Contract No.</th>
              <th>SLA</th>
              <th>PM</th>
              <th>Start date</th>
              <th>End date</th>
              <th>Remark</th>
            </tr>
          </thead>
          <tbody>
            {contract.items.map((item, index) => (
              <tr key={item.id}>
                <td className={styles.centerCell}>{item.sortOrder || index + 1}</td>
                <td>{display(item.partNumber)}</td>
                <td>{display(item.description)}</td>
                <td>{display(item.serialNumber)}</td>
                <td className={styles.centerCell}>{display(item.sla || contract.slaType.replaceAll("_", " "))}</td>
                <td className={styles.centerCell}>N/A</td>
                <td className={styles.centerCell}>{formatDate(item.startDate || contract.startDate)}</td>
                <td className={styles.centerCell}>{formatDate(item.endDate || contract.endDate)}</td>
                <td>{display(item.remark)}</td>
              </tr>
            ))}
            {Array.from({ length: emptyRows }, (_, index) => (
              <tr key={`empty-${index}`} aria-hidden="true">
                {Array.from({ length: 9 }, (_, cellIndex) => (
                  <td key={cellIndex} className={styles.emptyCell}>&nbsp;</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <p className={styles.terms}>
          For full terms and conditions of this maintenance agreement, please refer to<br />
          &quot;iTAS Solutions Service Policy&quot;
        </p>

        <table className={styles.signatureTable}>
          <tbody>
            <tr>
              <td>
                <div className={styles.signatureTitle}>Customer Signature</div>
                <div className={styles.signatureLine}>
                  ( {contract.customer.contactPerson || "                                      "} )
                </div>
                <div className={styles.signatureDate}>Date : __________________</div>
              </td>
              <td className={styles.signatureSpacer} />
              <td>
                <div className={styles.signatureTitle}>Company Signature</div>
                <div className={styles.signatureLine}>( AREE JARUMANEERAT )</div>
                <div className={styles.signatureDate}>Date : {formatDate(printDate)}</div>
              </td>
            </tr>
          </tbody>
        </table>
      </article>
    </main>
  );
}
