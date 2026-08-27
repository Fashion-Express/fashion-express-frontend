import Decimal from "decimal.js";

/**
 * The API returns money and quantities as decimal STRINGS ("45000.50"), never
 * JSON numbers — NFR-01 forbids floating point anywhere near money, and a JSON
 * number is a float. IDs are strings for the same class of reason: they are
 * 64-bit integers that would lose precision.
 *
 * So: parse with decimal.js, never `parseFloat`, and convert to a number only
 * at a display boundary.
 */
export type Money = string;
export type Quantity = string;

export const TAKA = "৳"; // ৳

export function toDecimal(value: Money | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  return new Decimal(value);
}

export function isZero(value: Money | null | undefined): boolean {
  return toDecimal(value).isZero();
}

export function isNegative(value: Money | null | undefined): boolean {
  return toDecimal(value).isNegative();
}

/** Strictly greater than zero, decided in decimal rather than as a float. */
export function isPositive(value: Money | null | undefined): boolean {
  return toDecimal(value).greaterThan(0);
}

/** Sum a column of API money strings without ever leaving decimal arithmetic. */
export function sum(values: Array<Money | null | undefined>): Money {
  return values
    .reduce((total, v) => total.plus(toDecimal(v)), new Decimal(0))
    .toFixed(2);
}

export function subtract(a: Money, b: Money): Money {
  return toDecimal(a).minus(toDecimal(b)).toFixed(2);
}

type MoneyOptions = {
  /** Show the ৳ sign. Off inside a column already headed "AMOUNT". */
  symbol?: boolean;
  /** Drop the decimal part — for KPI tiles, where ৳440,000 reads better. */
  compact?: boolean;
};

/**
 * Formats to Bangladeshi grouping. `Intl` takes a number, so the conversion
 * happens here and only here — after the value has already been rounded to the
 * two decimal places the database stores.
 */
export function formatMoney(
  value: Money | null | undefined,
  { symbol = true, compact = false }: MoneyOptions = {},
): string {
  const decimal = toDecimal(value);
  const fractionDigits = compact ? 0 : 2;

  const formatted = new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number(decimal.toFixed(fractionDigits)));

  if (!symbol) return formatted;

  // Keep the minus sign in front of the symbol: −৳90,350.00, as the mockup's
  // "CURRENT BALANCE" tile shows it.
  return decimal.isNegative()
    ? `−${TAKA}${formatted.replace("-", "")}`
    : `${TAKA}${formatted}`;
}

/**
 * Quantities carry three decimals in the schema ("4750.000"). Trailing zeros
 * are dropped for display — "250" reads better than "250.000" — but a genuine
 * fraction is kept in full.
 */
export function formatQuantity(value: Quantity | null | undefined): string {
  const decimal = toDecimal(value);
  const trimmed = decimal.toDecimalPlaces(3).toString();

  return new Intl.NumberFormat("en-BD", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(Number(trimmed));
}

/** Turn a form field into the string shape the API expects. */
export function parseMoneyInput(value: FormDataEntryValue | null): Money | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    return new Decimal(value.trim()).toFixed(2);
  } catch {
    return null;
  }
}
