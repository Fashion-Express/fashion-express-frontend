"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DateInput, Field, Input, NumericInput, Select, Textarea } from "@/components/ui/field";
import { Alert, Card, FormCard } from "@/components/ui/surfaces";
import { FormCancel, SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import type { InventoryOption } from "@/lib/api/inventory";
import type { Option, ShopOption } from "@/lib/api/types";
import { formatMoney, formatQuantity, toDecimal } from "@/lib/format/money";
import { createQuotationAction, createSaleAction } from "../actions";

type Line = {
  key: number;
  itemType: "inventory" | "non_inventory";
  inventoryItemId: string;
  description: string;
  quantity: string;
  boxQuantity: string;
  unitPrice: string;
};

const blankLine = (key: number): Line => ({
  key,
  itemType: "inventory",
  inventoryItemId: "",
  description: "",
  quantity: "1",
  boxQuantity: "0",
  unitPrice: "",
});

/**
 * The sale form: customer, lines, and an optional first payment in one
 * submission (FR-02.2).
 *
 * The running total here is an ESTIMATE for the user's benefit only. Line
 * totals and the order total are calculated by the system and never accepted
 * from the caller — `line_total` is a generated column and the sale total is
 * maintained by a trigger — so what is shown before saving can differ from what
 * comes back, most obviously when a stocked line takes the product's current
 * price because none was entered.
 */
export function SaleForm({
  mode,
  shopId,
  customers,
  products,
  shops,
  methods,
  today,
}: {
  mode: "sale" | "quotation";
  /** Owns the customer and product pickers, so it lives in the URL. */
  shopId: string;
  customers: Option[];
  products: InventoryOption[];
  shops: ShopOption[];
  methods: Array<{ id: string; label: string }>;
  today: string;
}) {
  const isQuotation = mode === "quotation";
  const router = useRouter();
  const [switching, startSwitching] = useTransition();
  const [state, formAction] = useActionState<ActionState, FormData>(
    isQuotation ? createQuotationAction : createSaleAction,
    {},
  );

  const [lines, setLines] = useState<Line[]>([blankLine(0)]);
  const [nextKey, setNextKey] = useState(1);

  function update(key: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  const estimate = lines.reduce(
    (total, line) =>
      total.plus(toDecimal(line.quantity || "0").times(toDecimal(line.unitPrice || "0"))),
    toDecimal("0"),
  );

  return (
    <form action={formAction} className="mx-auto flex w-full max-w-[980px] flex-col gap-4">
      <input type="hidden" name="shopId" value={shopId} />

      {state.formError && <Alert tone="danger">{state.formError}</Alert>}

      <FormCard title="Customer details">
        <div className="grid gap-4 sm:grid-cols-2">
          {/*
            BR-53 — a sale's customer must belong to the sale's shop, and BR-50
            says the same of its stock. Both pickers are therefore fed PER SHOP,
            which is why changing the shop reloads the page rather than just
            setting a field: keeping stale options would offer choices the
            database is guaranteed to refuse.
          */}
          <Field
            name="shopSelector"
            label="Shop"
            required
            error={state.fieldErrors?.shopId}
            hint="Changing this reloads the customer and product lists."
          >
            {(props) => (
              <Select
                {...props}
                value={shopId}
                disabled={switching}
                onChange={(event) =>
                  startSwitching(() =>
                    router.replace(
                      `/sales/new?mode=${mode}&shopId=${encodeURIComponent(event.target.value)}`,
                    ),
                  )
                }
              >
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
              </Select>
            )}
          </Field>

          <Field
            name="customerId"
            label="Customer"
            required
            error={state.fieldErrors?.customerId}
            hint={
              customers.length === 0
                ? "No active customers in the selected shop yet."
                : undefined
            }
          >
            {(props) => (
              <Select {...props} defaultValue="">
                <option value="" disabled>Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.label}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </FormCard>

      <Card
        title="Products"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLines((current) => [...current, blankLine(nextKey)]);
              setNextKey((key) => key + 1);
            }}
          >
            + Add line
          </Button>
        }
      >
        <div className="flex flex-col gap-4">
          {lines.map((line, index) => (
            <div
              key={line.key}
              className="grid gap-3 rounded-control border border-line p-3.5 sm:grid-cols-12"
            >
              <input type="hidden" name={`items.${index}.itemType`} value={line.itemType} />

              <div className="sm:col-span-3">
                <Field name={`line-type-${line.key}`} label="Type">
                  {() => (
                    <Select
                      value={line.itemType}
                      onChange={(event) =>
                        update(line.key, {
                          itemType: event.target.value as Line["itemType"],
                        })
                      }
                    >
                      <option value="inventory">Inventory</option>
                      <option value="non_inventory">Machine</option>
                    </Select>
                  )}
                </Field>
              </div>

              {/*
                BR-04 — the two kinds are not interchangeable. A stocked line
                needs a product and draws stock at finalisation; a machine line
                needs a description, and that description IS the machine. Only
                the relevant field is rendered, so neither can be sent by
                accident.
              */}
              <div className="sm:col-span-5">
                {line.itemType === "inventory" ? (
                  <Field name={`items.${index}.inventoryItemId`} label="Inventory item" required>
                    {(props) => (
                      <Select
                        {...props}
                        value={line.inventoryItemId}
                        onChange={(event) => {
                          const product = products.find((p) => p.id === event.target.value);
                          update(line.key, {
                            inventoryItemId: event.target.value,
                            // Show the price the server would default to, so
                            // the estimate is not silently low. A price the
                            // user has already typed is left alone.
                            unitPrice:
                              line.unitPrice.trim() === "" && product
                                ? product.unit_price
                                : line.unitPrice,
                          });
                        }}
                      >
                        <option value="">Select item</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.part_name} ({product.part_code}) —{" "}
                            {formatQuantity(product.quantity)} {product.unit_label} on hand
                          </option>
                        ))}
                      </Select>
                    )}
                  </Field>
                ) : (
                  <Field name={`items.${index}.description`} label="Description" required>
                    {(props) => (
                      <Input
                        {...props}
                        value={line.description}
                        onChange={(event) => update(line.key, { description: event.target.value })}
                        placeholder="Lathe machine XL"
                      />
                    )}
                  </Field>
                )}
              </div>

              <div className="sm:col-span-1">
                <Field name={`items.${index}.quantity`} label="Qty" required>
                  {(props) => (
                    <NumericInput
                      {...props}
                      step="0.001"
                      min="0"
                      value={line.quantity}
                      onChange={(event) => update(line.key, { quantity: event.target.value })}
                    />
                  )}
                </Field>
              </div>

              {line.itemType === "inventory" && (
                <div className="sm:col-span-1">
                  <Field name={`items.${index}.boxes`} label="Boxes">
                    {(props) => (
                      <NumericInput
                        {...props}
                        step="1"
                        min="0"
                        value={line.boxQuantity}
                        onChange={(event) => update(line.key, { boxQuantity: event.target.value })}
                      />
                    )}
                  </Field>
                </div>
              )}

              <div className={line.itemType === "inventory" ? "sm:col-span-2" : "sm:col-span-3"}>
                <Field
                  name={`items.${index}.unitPrice`}
                  label="Unit price"
                  hint={line.itemType === "inventory" ? "Blank uses the product's price" : undefined}
                >
                  {(props) => (
                    <NumericInput
                      {...props}
                      step="0.01"
                      min="0"
                      value={line.unitPrice}
                      onChange={(event) => update(line.key, { unitPrice: event.target.value })}
                      placeholder="0.00"
                    />
                  )}
                </Field>
              </div>

              {lines.length > 1 && (
                <div className="flex items-end sm:col-span-12 sm:justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setLines((current) => current.filter((l) => l.key !== line.key))}
                  >
                    Remove line
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Summary">
        <div className="flex items-center justify-between">
          <span className="text-[12.5px] text-muted">Estimated total</span>
          <span className="font-mono text-[20px] font-semibold text-ink">
            {formatMoney(estimate.toFixed(2))}
          </span>
        </div>
        <p className="mt-2 text-[11.5px] leading-relaxed text-faint">
          The system calculates the real total when the sale is saved. A stocked line
          left without a price takes the product&rsquo;s current selling price, so this
          estimate can read low.
        </p>
      </Card>

      {/*
        BR-11 — nothing may be paid against a quotation, so the section is
        absent rather than disabled: there is nothing owed against an offer.
      */}
      {!isQuotation && (
        <FormCard title="Payment (optional)">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field name="initialPayment" label="Amount" error={state.fieldErrors?.initialPayment}>
              {(props) => <NumericInput {...props} step="0.01" min="0" placeholder="0.00" />}
            </Field>

            <Field name="initialPaymentDate" label="Payment date">
              {(props) => <DateInput {...props} defaultValue={today} />}
            </Field>

            <Field
              name="initialPaymentMethodId"
              label="Payment method"
              error={state.fieldErrors?.initialPaymentMethodId}
            >
              {(props) => (
                <Select {...props} defaultValue="">
                  <option value="">Not paying now</option>
                  {methods.map((method) => (
                    <option key={method.id} value={method.id}>{method.label}</option>
                  ))}
                </Select>
              )}
            </Field>

            <Field name="initialPaymentNotes" label="Details (optional)">
              {(props) => <Input {...props} placeholder="Payment details" />}
            </Field>
          </div>
        </FormCard>
      )}

      <FormCard
        title="Notes"
        footer={
          <>
            <FormCancel href="/sales" />
            <SubmitButton>
              {isQuotation ? "Create quotation" : "Create sale"}
            </SubmitButton>
          </>
        }
      >
        <Field name="notes" label="Notes">
          {(props) => <Textarea {...props} rows={2} placeholder="Optional notes…" />}
        </Field>

        <p className="text-[11.5px] leading-relaxed text-faint">
          {isQuotation
            ? "A quotation touches no stock and counts toward no total. Convert it to a draft invoice when it is accepted."
            : "This creates a draft. Stock is only deducted when the sale is finalized."}
        </p>
      </FormCard>
    </form>
  );
}
