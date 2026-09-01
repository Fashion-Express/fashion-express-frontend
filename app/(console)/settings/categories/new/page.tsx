import type { Metadata } from "next";
import { forbidden } from "@/lib/api/guard";
import { can, requireSession } from "@/lib/auth/session";
import { PageBody, PageHeader } from "@/components/ui/surfaces";
import { CategoryForm } from "../category-form";

export const metadata: Metadata = { title: "Add category" };

export default async function NewCategoryPage() {
  const me = await requireSession();
  if (!can(me, "manage_referencedata")) {
    forbidden("Cannot manage reference data.");
  }

  return (
    <>
      <PageHeader eyebrow="Settings / Product categories" title="Add category" />
      <PageBody>
        <CategoryForm cancelHref="/settings/categories" />
      </PageBody>
    </>
  );
}
