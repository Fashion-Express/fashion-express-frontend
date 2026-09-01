import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BUSINESS_FALLBACK,
  getBusinessSettings,
  logoSrc,
  type BusinessSettings,
} from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";
import { getSale, type SaleDetail, type SalePayment } from "@/lib/api/sales";
import { formatDate, formatDateTime } from "@/lib/format/date";
import { formatMoney, isZero } from "@/lib/format/money";
import { AutoPrint } from "../../../../../auto-print";
import { PrintButton } from "../../../../../print-button";

/**
 * FR-02.9 — the receipt for one payment, as a printable page.
 *
 * A PAGE rather than the API's PDF, for the reason the invoice is one: the
 * browser's print dialog offers "Save as PDF" to anyone who wants the file,
 * while a download puts a file manager in the middle of handing a customer
 * their receipt. `GET /documents/payments/:id/receipt` still serves the bytes
 * for anything that needs them directly.
 *
 * Unlike the invoice, this opens its print dialog on load (`AutoPrint`) — a
 * receipt is printed essentially every time it is opened.
 *
 * BR-01 applies through `getSale`, and the payment is read out of that sale
 * rather than fetched by its own id: a receipt id that belongs to a sale the
 * caller cannot see is a 404 here, not somebody else's receipt.
 */

/** Browsers print the page title across the top of the paper. */
export async function generateMetadata(
  props: PageProps<"/sales/[id]/payments/[paymentId]/receipt">,
): Promise<Metadata> {
  const { id, paymentId } = await props.params;
  const sale = await getSale(id).catch(() => null);
  const payment = sale?.payments.find((p) => p.id === paymentId);

  return { title: payment ? `Receipt ${payment.receipt_number}` : "Receipt" };
}

const LABEL =
  "text-[10px] font-semibold tracking-[0.14em] text-[#9a9189] uppercase";

export default async function PaymentReceiptPage(
  props: PageProps<"/sales/[id]/payments/[paymentId]/receipt">,
) {
  const { id, paymentId } = await props.params;

  let sale: SaleDetail;
  try {
    sale = await getSale(id);
  } catch (error) {
    if (error instanceof ApiError && (error.isNotFound || error.isForbidden)) notFound();
    throw error;
  }

  const payment: SalePayment | undefined = sale.payments.find(
    (candidate) => candidate.id === paymentId,
  );
  if (!payment) notFound();

  // A receipt still prints without a letterhead.
  const business = await getBusinessSettings().catch(
    (): BusinessSettings => BUSINESS_FALLBACK,
  );
  const logo = logoSrc(business.logo);
  const settled = isZero(sale.balance_due);

  return (
    <div className="mx-auto max-w-[720px] px-4 py-8 print:max-w-none print:p-0">
      <AutoPrint />

      {/* Chrome, not document: it never reaches the paper. */}
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
              // from the settings row, and a document wants the bytes as stored.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="" className="mb-2 h-11 w-auto object-contain" />
            )}
            <p className="text-[15px] font-bold text-[#1a1714]">{business.name}</p>
            {business.address && <p>{business.address}</p>}
            {business.phone && <p>Phone: {business.phone}</p>}
            {business.email && <p>Email: {business.email}</p>}
          </div>

          <div className="text-right">
            <h1 className="text-[26px] font-bold tracking-tight">RECEIPT</h1>
            <p className="mt-0.5 font-mono text-[11.5px] font-semibold">
              # {payment.receipt_number}
            </p>
          </div>
        </header>

        <div className="mt-7 grid grid-cols-2 gap-x-8 gap-y-5 border-t border-[#e5e0d9] pt-5 text-[13px]">
          <Detail label="Sale no." value={sale.sale_number} mono />
          <Detail label="Customer" value={sale.customer_name} />
          <Detail label="Payment date" value={formatDate(payment.payment_date)} mono />
          <Detail label="Method" value={payment.method_label} />
        </div>

        {payment.notes && (
          <div className="mt-5">
            <p className={LABEL}>Payment details</p>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#4a433c]">
              {payment.notes}
            </p>
          </div>
        )}

        <div className="mt-7 border-t border-[#e5e0d9] pt-6">
          <div className="flex items-end justify-between gap-8">
            <div>
              <p className={LABEL}>Amount received</p>
              <p className="mt-1 font-mono text-[28px] leading-none font-bold tabular-nums">
                {formatMoney(payment.amount)}
              </p>
            </div>

            {/* The two figures that tell the customer where this payment
                leaves them, which is the question a receipt is handed over to
                answer. */}
            <div className="flex gap-8 text-right">
              <div>
                <p className={LABEL}>Total paid</p>
                <p className="mt-1 font-mono text-[15px] font-semibold tabular-nums">
                  {formatMoney(sale.amount_paid)}
                </p>
              </div>
              <div>
                <p className={LABEL}>Balance due</p>
                <p
                  className={`mt-1 font-mono text-[15px] font-semibold tabular-nums ${
                    settled ? "text-[#129a63]" : "text-[#c0392b]"
                  }`}
                >
                  {formatMoney(sale.balance_due)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-8 border-t border-[#e5e0d9] pt-4 text-[11px] text-[#9a9189]">
          Generated on {formatDateTime(payment.created_at)}. Keep this receipt for your
          records.
        </p>
      </article>
    </div>
  );
}

function Detail({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className={LABEL}>{label}</p>
      <p className={`mt-1.5 font-semibold ${mono ? "font-mono tabular-nums" : ""}`}>
        {value}
      </p>
    </div>
  );
}
