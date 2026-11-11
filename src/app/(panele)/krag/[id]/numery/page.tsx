import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { logAccess } from "@/lib/audit";
import { getCircleForMember } from "@/lib/circles";
import { MAX_CONTACTS } from "@/lib/contacts";
import { requireUser } from "@/lib/session";
import { deleteContactAction } from "./actions";
import { ContactForm } from "./contact-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Contacts");
  return { title: t("title") };
}

// Coordinators keep the emergency contacts here. The senior screen shows
// them as big "call" buttons.
export default async function ContactsPage({
  params,
}: PageProps<"/krag/[id]/numery">) {
  const { id } = await params;
  const user = await requireUser(`/krag/${id}/numery`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  const contacts = circle.contacts;
  if (!contacts || !circle.permissions.includes("MANAGE")) {
    redirect(`/krag/${id}`);
  }

  await logAccess({
    circleId: circle.id,
    userId: user.id,
    action: "VIEW",
    entity: "CareRecipient",
  });

  const t = await getTranslations("Contacts");
  const common = await getTranslations("Common");

  return (
    <>
      <Link
        href={`/krag/${id}`}
        className="font-bold text-brand hover:underline"
      >
        ← {circle.name}
      </Link>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">{t("title")}</h1>
        <p className="text-lg text-muted">{t("lead")}</p>
      </div>

      {contacts.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {contacts.map((contact) => (
            <li
              key={contact.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3"
            >
              <span className="flex flex-col">
                <span className="font-bold">
                  {contact.name}
                  {contact.relationship ? (
                    <span className="font-normal text-muted">
                      {" · "}
                      {contact.relationship}
                    </span>
                  ) : null}
                </span>
                <span className="text-muted">{contact.phone}</span>
              </span>
              <form action={deleteContactAction}>
                <input type="hidden" name="circleId" value={circle.id} />
                <input type="hidden" name="contactId" value={contact.id} />
                <ConfirmButton
                  label={t("remove")}
                  confirmLabel={t("confirmRemove")}
                  cancelLabel={common("cancel")}
                />
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-lg text-muted">{t("empty")}</p>
      )}

      {contacts.length < MAX_CONTACTS ? (
        <Card className="flex flex-col gap-4">
          <h2 className="text-xl font-extrabold">{t("addTitle")}</h2>
          <ContactForm circleId={circle.id} />
        </Card>
      ) : (
        <p className="text-muted">{t("full", { max: MAX_CONTACTS })}</p>
      )}

      <ButtonLink href={`/krag/${id}/podglad`} variant="secondary" size="lg">
        {t("preview")}
      </ButtonLink>
    </>
  );
}
