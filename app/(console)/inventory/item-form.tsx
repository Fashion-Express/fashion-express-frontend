"use client";

import { useActionState } from "react";
import { Field, Input, NumericInput, ReadOnlyValue, Select } from "@/components/ui/field";
import { Alert, FormCard } from "@/components/ui/surfaces";
import { FormCancel, SubmitButton } from "@/components/forms/form";
import type { ActionState } from "@/lib/api/errors";
import type { InventoryItem } from "@/lib/api/inventory";
import type { NamedOption, ShopOption } from "@/lib/api/types";

type Picker = { id: string; label: string };

export function ItemForm({
  action,
  item,
  shops,
  units,
  categories,
  suppliers,
  defaultShopId,
  cancelHref,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  item?: InventoryItem;
  shops: ShopOption[];
  units: Picker[];
  categories: Picker[];
  suppliers: NamedOption[];
  defaultShopId?: string | null;
  cancelHref: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(action, {});
  const editing = Boolean(item);

  return (
    <form action={formAction} className="mx-auto w-full max-w-[860px]">
      {item && <input type="hidden" name="id" value={item.id} />}

      <FormCard
        title="Product information"
        footer={
          <>
            <FormCancel href={cancelHref} />
            <SubmitButton>{submitLabel}</SubmitButton>
          </>
        }
      >
        {state.formError && <Alert tone="danger">{state.formError}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="partName" label="Product name" required error={state.fieldErrors?.partName}>
            {(props) => <Input {...props} defaultValue={item?.part_name ?? ""} autoFocus={!editing} />}
          </Field>

          <Field
            name="partCode"
            label="Product code"
            required
            error={state.fieldErrors?.partCode}
            hint="Unique within the shop, not across the business."
          >
            {(props) => <Input {...props} defaultValue={item?.part_code ?? ""} className="font-mono" />}
          </Field>

          {/*
            BR-54 — a record's shop is fixed at creation, and moving stock
            between shops is a transfer, explicitly out of scope. A PATCH
            carrying shopId is a 400, so it is a choice on create and a fact on
            edit.
          */}
          {editing ? (
            <Field name="shopDisplay" label="Shop" hint="Fixed when the product was created.">
              {() => <ReadOnlyValue>{item?.shop_name}</ReadOnlyValue>}
            </Field>
          ) : (
            <Field name="shopId" label="Shop" required error={state.fieldErrors?.shopId}>
              {(props) => (
                <Select {...props} defaultValue={defaultShopId ?? ""}>
                  <option value="" disabled>Choose a shop</option>
                  {shops.map((shop) => (
                    <option key={shop.id} value={shop.id}>{shop.name}</option>
                  ))}
                </Select>
              )}
            </Field>
          )}

          <Field
            name="unitId"
            label="Unit"
            required={!editing}
            error={state.fieldErrors?.unitId}
            hint={editing ? `Currently ${item?.unit_label}.` : "A quantity without a unit is meaningless."}
          >
            {(props) => (
              <Select {...props} defaultValue="">
                <option value="">{editing ? "Leave unchanged" : "Choose a unit"}</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>{unit.label}</option>
                ))}
              </Select>
            )}
          </Field>

          <Field name="categoryId" label="Category" error={state.fieldErrors?.categoryId}>
            {(props) => (
              <Select {...props} defaultValue={item?.category_id ?? ""}>
                <option value="">Uncategorised</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.label}</option>
                ))}
              </Select>
            )}
          </Field>

          <Field name="supplierId" label="Supplier" error={state.fieldErrors?.supplierId}>
            {(props) => (
              <Select {...props} defaultValue={item?.supplier_id ?? ""}>
                <option value="">Not linked</option>
                {suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </Select>
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {/*
            Two independent stock dimensions (BR-26): loose units carry three
            decimals so part units measure cleanly, boxes are whole. They are
            validated, deducted and logged separately.
          */}
          <Field
            name="quantity"
            label="Quantity"
            error={state.fieldErrors?.quantity}
            hint={editing ? "Changing this writes a movement." : "Recorded as opening stock."}
          >
            {(props) => (
              <NumericInput {...props} step="0.001" min="0" defaultValue={item?.quantity ?? "0"} />
            )}
          </Field>

          <Field name="boxCount" label="Box count" error={state.fieldErrors?.boxCount}>
            {(props) => (
              <NumericInput {...props} step="1" min="0" defaultValue={String(item?.box_count ?? 0)} />
            )}
          </Field>

          <Field
            name="minimumStock"
            label="Minimum stock"
            error={state.fieldErrors?.minimumStock}
            hint="Low stock is measured against this."
          >
            {(props) => (
              <NumericInput {...props} step="1" min="0" defaultValue={String(item?.minimum_stock ?? 10)} />
            )}
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Kept separate so margin stays visible (BR-22). */}
          <Field name="purchasePrice" label="Purchase price" error={state.fieldErrors?.purchasePrice}>
            {(props) => (
              <NumericInput {...props} step="0.01" min="0" defaultValue={item?.purchase_price ?? "0.00"} />
            )}
          </Field>

          <Field name="unitPrice" label="Unit price" error={state.fieldErrors?.unitPrice}>
            {(props) => (
              <NumericInput {...props} step="0.01" min="0" defaultValue={item?.unit_price ?? "0.00"} />
            )}
          </Field>
        </div>
      </FormCard>
    </form>
  );
}
