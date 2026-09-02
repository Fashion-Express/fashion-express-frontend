/**
 * The API refuses things in three different shapes, and a form needs to render
 * all three the same way — next to the field that caused it, where possible.
 *
 *   400  { message: string[], error: "Bad Request", statusCode: 400 }
 *        class-validator collects every problem at once, each sentence starting
 *        with the property name: "phone must be a string".
 *
 *   409  { statusCode: 409, message: "...", constraint: "uq_shops_name_ci" }
 *   422  same shape — a CHECK constraint refused it (a business rule).
 *        The message is written for a person; show it as it stands.
 *
 *   better-auth { message, code } on /api/auth/* only — no statusCode field.
 */

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  readonly status: number;
  /** The database constraint that refused it, when one did. */
  readonly constraint?: string;
  /** better-auth's machine-readable code, e.g. ACCOUNT_TEMPORARILY_LOCKED. */
  readonly code?: string;
  /** Per-field messages, ready to hand to a <Field>. */
  readonly fields: FieldErrors;

  constructor(init: {
    status: number;
    message: string;
    constraint?: string;
    code?: string;
    fields?: FieldErrors;
  }) {
    super(init.message);
    this.name = "ApiError";
    this.status = init.status;
    this.constraint = init.constraint;
    this.code = init.code;
    this.fields = init.fields ?? {};
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** True when every problem could be attached to a specific field. */
  get isFieldOnly(): boolean {
    return Object.keys(this.fields).length > 0;
  }
}

/**
 * Constraints whose name identifies a form field, so the message can land on
 * the input instead of floating above the form. Anything not listed here still
 * shows its message — just at form level, which is the honest default.
 */
const CONSTRAINT_FIELDS: Record<string, string> = {
  uq_shops_name_ci: "name",
  users_username_key: "username",
  uq_customers_customer_id: "customerId",
  uq_inventory_code_shop: "code",
  uq_suppliers_phone: "phone",
};

/**
 * class-validator writes "<property> must be ...". Take the leading token as
 * the field name when the sentence looks like that, so "name should not be
 * empty" lands on the name input.
 */
function fieldFromMessage(message: string): string | undefined {
  const match = /^([a-zA-Z][a-zA-Z0-9_.]*)\s+(must|should|has to|is|cannot|may)\b/.exec(
    message,
  );
  return match?.[1];
}

type ErrorBody = {
  message?: string | string[];
  statusCode?: number;
  error?: string;
  constraint?: string;
  code?: string;
};

export function toApiError(status: number, body: unknown, fallback: string): ApiError {
  const parsed: ErrorBody = body && typeof body === "object" ? (body as ErrorBody) : {};
  const fields: FieldErrors = {};

  if (Array.isArray(parsed.message)) {
    for (const line of parsed.message) {
      const field = fieldFromMessage(line);
      // Keep the first problem per field; class-validator can report several
      // for one input and the first is the one the user hits first.
      if (field && !fields[field]) fields[field] = line;
    }
  }

  if (parsed.constraint) {
    const field = CONSTRAINT_FIELDS[parsed.constraint];
    if (field && typeof parsed.message === "string") fields[field] = parsed.message;
  }

  const message = Array.isArray(parsed.message)
    ? (parsed.message[0] ?? fallback)
    : (parsed.message ?? fallback);

  return new ApiError({
    status,
    message,
    constraint: parsed.constraint,
    code: parsed.code,
    fields,
  });
}

/**
 * What a Server Action hands back to `useActionState`. A form renders
 * `formError` above itself and `fieldErrors` inside each Field.
 */
export type ActionState = {
  formError?: string;
  fieldErrors?: FieldErrors;
  /**
   * Set by actions that stay on the page, so the UI can tell "succeeded" from
   * "not submitted yet" — both of which otherwise look like an empty state.
   * Actions that redirect never need it.
   */
  ok?: true;
  /**
   * What the user submitted, echoed back so a refused form can repopulate
   * itself — React resets an uncontrolled form once its action completes, and
   * an error state is no exception. Built with `valuesOf` in `lib/form.ts`,
   * which drops password fields. Actions that redirect never need it.
   */
  values?: Record<string, string>;
};

/** Turn any thrown value into something a form can render. */
export function toActionState(error: unknown): ActionState {
  if (error instanceof ApiError) {
    return {
      // A field-level problem is already shown next to its input; repeating it
      // at the top of the form is noise.
      formError: error.isFieldOnly ? undefined : error.message,
      fieldErrors: error.fields,
    };
  }

  return {
    formError:
      error instanceof Error && error.message
        ? error.message
        : "Something went wrong. Please try again.",
  };
}
