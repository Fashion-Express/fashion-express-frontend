import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BUSINESS_FALLBACK,
  getBusinessSettings,
  logoSrc,
  type BusinessSettings,
} from "@/lib/api/admin";
import { getCustomer, type Customer } from "@/lib/api/customers";
import { ApiError } from "@/lib/api/errors";
import { listInventoryOptions } from "@/lib/api/inventory";
import { getSale, type SaleDetail, type SaleItem } from "@/lib/api/sales";
import { formatDate } from "@/lib/format/date";
import { formatMoney, formatQuantity } from "@/lib/format/money";
import { PrintButton } from "../../../print-button";

/**
 * FR-02.9 — the printable sale document, and the distinct QUOTATION template
 * when the sale is a quotation.
 *
 * It is a PAGE, not a download. The person printing wants to read the document
 * first — check the customer, the lines, the balance — and only then print it;
 * a PDF that lands in the downloads folder puts a file manager in the middle of
 * that. The browser's print dialog still offers "Save as PDF" for anyone who
 * wants the file.
 *
 * Rendered light in both themes, on purpose. This is a document rather than a
 * screen: what is on the monitor is what comes out of the printer, so its
 * colours are literal rather than theme tokens.
 *
 * BR-01 applies through `getSale`: a sale outside the caller's scope is a 404
 * here exactly as it is everywhere else.
 */

/**
 * Worth a fetch of its own: browsers print the document title in the page
 * header, so this is what ends up written across the top of the paper. The
 * second `getSale` costs nothing — `fetch` is memoized across `generateMetadata`
 * and the page within one render pass.
 */
export async function generateMetadata(
  props: PageProps<"/sales/[id]/invoice">,
): Promise<Metadata> {
  const { id } = await props.params;
  const sale = await getSale(id).catch(() => null);
  if (!sale) return { title: "Invoice" };

  return {
    title: `${sale.status_code === "quote" ? "Quotation" : "Invoice"} ${sale.sale_number}`,
  };
}

/** Label styling shared by the two column headings and the detail keys. */
const LABEL =
  "text-[10px] font-semibold tracking-[0.14em] text-[#9a9189] uppercase";

export default async function SaleInvoicePage(
  props: PageProps<"/sales/[id]/invoice">,
) {
  const { id } = await props.params;

  let sale: SaleDetail;
  try {
    sale = await getSale(id);
  } catch (error) {
    if (error instanceof ApiError && (error.isNotFound || error.isForbidden)) notFound();
    throw error;
  }

  // None of these three may take the document down: an invoice still prints
  // without a letterhead, without the customer's address, and without the unit
  // each line is measured in.
  const [business, customer, units] = await Promise.all([
    getBusinessSettings().catch((): BusinessSettings => BUSINESS_FALLBACK),
    getCustomer(sale.customer_id).catch((): Customer | null => null),
    unitLabels(sale.shop_id),
  ]);

  const isQuotation = sale.status_code === "quote";
  const logo = logoSrc(business.logo);

  // FR-02.9 — a quotation is valid for 30 days from issue, and says so.
  const validUntil = new Date(
    new Date(sale.created_at).getTime() + 30 * 24 * 60 * 60 * 1000,
  ).toISOString();

  return (
    <div className="mx-auto max-w-[820px] px-4 py-8 print:max-w-none print:p-0">
      {/* The toolbar is chrome, not document: it never reaches the paper. */}
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <Link
          href={`/sales/${sale.id}`}
          className="text-[12.5px] font-semibold text-[#3a342e] no-underline hover:underline"
        >
          ← Back to sale
        </Link>
        <PrintButton />
      </div>

      <article className="rounded-card bg-white px-10 py-9 text-[#1a1714] shadow-card print:rounded-none print:px-0 print:py-0 print:shadow-none">
        <header className="flex items-start justify-between gap-8">
          <div className="text-[11.5px] leading-relaxed text-[#6b6259]">
            {logo && (
              // Not next/image: the source is a data URI or an absolute URL
              // from the settings row, neither of which the optimizer is
              // configured for, and a document wants the bytes as stored.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt=""
                className="mb-2 h-11 w-auto object-contain"
              />
            )}
            <p className="text-[15px] font-bold text-[#1a1714]">
              {business.name}
            </p>
            {business.address && <p>{business.address}</p>}
            {business.phone && <p>Phone: {business.phone}</p>}
            {business.email && <p>Email: {business.email}</p>}
          </div>

          <div className="text-right">
            <h1 className="text-[26px] font-bold tracking-tight">
              {isQuotation ? "QUOTATION" : "INVOICE"}
            </h1>
            <p className="mt-0.5 font-mono text-[11.5px] font-semibold">
              # {sale.sale_number}
            </p>
          </div>
        </header>

        {/* FR-02.9 — a document that looks like an invoice but is not one gets
            paid, or gets argued about. So a quotation says what it is. */}
        {isQuotation && (
          <p className="mt-6 rounded-badge bg-[#f7f1e4] px-3 py-2 text-[11.5px] font-semibold text-[#8a6402]">
            This is a quotation, not an invoice. No payment is due against this
            document. Valid for 30 days — until {formatDate(validUntil)}.
          </p>
        )}

        <div className="mt-7 grid grid-cols-2 gap-8 border-t border-[#e5e0d9] pt-5">
          <section className="text-[11.5px] leading-relaxed text-[#6b6259]">
            <p className={LABEL}>Bill to</p>
            <p className="mt-2 text-[15px] font-bold text-[#1a1714]">
              {sale.customer_name}
            </p>
            {customer?.company && <p>{customer.company}</p>}
            {customer?.address && <p>{customer.address}</p>}
            {customer?.city && <p>{customer.city}</p>}
            {customer?.phone && <p>Phone: {customer.phone}</p>}
            {customer?.email && <p>Email: {customer.email}</p>}
            <p className="font-mono text-[10.5px] text-[#9a9189]">
              {sale.customer_number}
            </p>
          </section>

          <section className="text-right">
            <p className={LABEL}>
              {isQuotation ? "Quotation details" : "Invoice details"}
            </p>
            <dl className="mt-2 grid grid-cols-[auto_auto] justify-end gap-x-5 gap-y-1.5 text-[11.5px]">
              <Detail label={isQuotation ? "Quotation #" : "Invoice #"}>
                {sale.sale_number}
              </Detail>
              <Detail label="Date">{formatDate(sale.created_at)}</Detail>
              {isQuotation ? (
                <Detail label="Valid until">{formatDate(validUntil)}</Detail>
              ) : (
                sale.finalized_at && (
                  <Detail label="Finalized">
                    {formatDate(sale.finalized_at)}
                  </Detail>
                )
              )}
              <Detail label="Shop" mono={false}>
                {sale.shop_name}
              </Detail>
              <dt className="self-center text-[#6b6259]">Status</dt>
              <dd className="justify-self-end">
                <span
                  className="print-fill inline-flex rounded-badge px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                  style={STATUS_STYLE[sale.status_code]}
                >
                  {sale.status_label}
                </span>
              </dd>
            </dl>
          </section>
        </div>

        <table className="mt-7 w-full border-collapse text-[11.5px]">
          <thead>
            <tr className="print-fill bg-[#1a1714] text-white">
              <th className={`${TH} w-8 text-left`}>#</th>
              <th className={`${TH} text-left`}>Item &amp; description</th>
              <th className={`${TH} text-right`}>Qty</th>
              <th className={`${TH} text-right`}>Rate</th>
              <th className={`${TH} text-right`}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {sale.items.map((item, index) => (
              <tr key={item.id} className="border-b border-[#eeeae4]">
                <td className="px-3 py-2.5 align-top font-mono text-[#9a9189]">
                  {index + 1}
                </td>
                <td className="px-3 py-2.5 align-top">
                  <span className="font-semibold">{describe(item)}</span>
                  {item.part_code && (
                    <span className="ml-1.5 font-mono text-[10.5px] text-[#9a9189]">
                      ({item.part_code})
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right align-top font-mono whitespace-nowrap">
                  {formatQuantity(item.quantity)}
                  {unitOf(item, units) && ` ${unitOf(item, units)}`}
                  {/* BR-26 — boxes are a second, independently tracked stock
                      dimension, so a line that carries them has to say so. */}
                  {item.boxes > 0 && (
                    <span className="block text-[10.5px] text-[#9a9189]">
                      + {item.boxes} {item.boxes === 1 ? "box" : "boxes"}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-right align-top font-mono">
                  {formatMoney(item.unit_price, { symbol: false })}
                </td>
                <td className="px-3 py-2.5 text-right align-top font-mono">
                  {formatMoney(item.line_total, { symbol: false })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end break-inside-avoid">
          <div className="w-full max-w-[300px] text-[11.5px]">
            {/* The schema carries no tax and no discount, so the sub total is
                the total. Both are shown because a reader looks for the line. */}
            <Total label="Sub total" value={formatMoney(sale.total_amount)} />
            <div className="mt-1 border-t border-[#1a1714] pt-1">
              <Total
                label="Total"
                value={formatMoney(sale.total_amount)}
                strong
              />
            </div>

            {/* BR-11 — nothing is owed against a quotation, so it shows no
                payment and no balance at all rather than zeroes. */}
            {!isQuotation && (
              <>
                <Total
                  label="Paid"
                  value={`(-) ${formatMoney(sale.amount_paid)}`}
                />
                <div className="print-fill mt-3 flex items-center justify-between gap-4 rounded-badge bg-[#1a1714] px-4 py-3 text-white">
                  <span className="text-[10.5px] font-semibold tracking-[0.12em] uppercase">
                    Balance due
                  </span>
                  <span className="font-mono text-[15px] font-semibold">
                    {formatMoney(sale.balance_due)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {sale.notes && (
          <p className="mt-8 border-t border-[#e5e0d9] pt-4 text-[11.5px] leading-relaxed whitespace-pre-wrap text-[#6b6259]">
            {sale.notes}
          </p>
        )}

        {/* FR-10.1 — the footer is configured once and every future document
            follows; it is the business's own words, so it prints verbatim. */}
        {business.invoice_footer && (
          <p className="mt-10 text-center text-[11.5px] font-semibold italic text-[#6b6259]">
            {business.invoice_footer}
          </p>
        )}

        <div className="mt-16 grid grid-cols-2 gap-16 break-inside-avoid">
          <Signature>Customer signature</Signature>
          <Signature align="right">Authorized signature</Signature>
        </div>
      </article>
    </div>
  );
}

const TH = "px-3 py-2 text-[10px] font-semibold tracking-[0.12em] uppercase";

/** Literal colours rather than the semantic tokens: the pill has to read the
 * same on a monitor in dark mode and on paper. */
const STATUS_STYLE: Record<SaleDetail["status_code"], React.CSSProperties> = {
  quote: { background: "#eef1f8", color: "#33518f" },
  draft: { background: "#f0ece7", color: "#6b6259" },
  finalized: { background: "#e7f2ee", color: "#0e5f49" },
  cancelled: { background: "#fbedea", color: "#a6362b" },
};

function Detail({
  label,
  mono = true,
  children,
}: {
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <dt className="text-[#6b6259]">{label}</dt>
      <dd
        className={`justify-self-end font-semibold ${mono ? "font-mono" : ""}`}
      >
        {children}
      </dd>
    </>
  );
}

function Total({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1">
      <span className={strong ? "font-semibold" : "text-[#6b6259]"}>
        {label}
      </span>
      <span className={`font-mono ${strong ? "font-semibold" : ""}`}>
        {value}
      </span>
    </div>
  );
}

function Signature({
  align = "left",
  children,
}: {
  align?: "left" | "right";
  children: React.ReactNode;
}) {
  return (
    <div className={align === "right" ? "text-right" : ""}>
      <div className="border-t border-[#9a9189]" />
      <p className="mt-2 text-[10px] font-semibold tracking-[0.12em] text-[#6b6259] uppercase">
        {children}
      </p>
    </div>
  );
}

/** BR-04 — a stocked line names its product; a machine line's description IS
 * the machine. Either way the invoice needs one line of text. */
function describe(item: SaleItem): string {
  return (
    (item.item_type_code === "inventory" ? item.part_name : item.description) ??
    "—"
  );
}

/**
 * `GET /sales/:id/items` does not carry the unit a quantity is measured in, and
 * "250 Pieces" is what an invoice has to say. `/inventory/options` is the one
 * route that returns the unit alongside the item id, and it is shop-scoped
 * (BR-50) — which is exactly the sale's own shop.
 */
async function unitLabels(shopId: string): Promise<Map<string, string>> {
  const options = await listInventoryOptions(shopId).catch(() => []);
  return new Map(options.map((option) => [option.id, option.unit_label]));
}

function unitOf(
  item: SaleItem,
  units: Map<string, string>,
): string | undefined {
  return item.inventory_item_id ? units.get(item.inventory_item_id) : undefined;
}
