import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ApiError } from "@/lib/api/errors";
import { forbidden } from "@/lib/api/guard";
import { getReference, type ReferenceRow } from "@/lib/api/reference";
import { can, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { CategoryForm } from "../../category-form";

export const metadata: Metadata = { title: "Edit category" };

export default async function EditCategoryPage(
  props: PageProps<"/settings/categories/[id]/edit">,
) {
  const { id } = await props.params;
  const me = await requireSession();
  if (!can(me, "manage_referencedata")) {
    forbidden("Cannot manage reference data.");
  }

  let category: ReferenceRow;
  try {
    category = await getReference("categories", id);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) notFound();
    throw error;
  }

  return (
    <>
      <PageHeader
        eyebrow="Settings / Product categories"
        title={category.name ?? "Edit category"}
      />
      <PageBody>
        <CategoryForm
          category={category}
          cancelHref={`/settings/categories/${id}`}
        />
      </PageBody>
    </>
  );
}
