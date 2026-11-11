import { useTranslations } from "next-intl";
import { PhoneIcon } from "@/components/icons";
import { SeniorClock } from "@/components/senior/senior-clock";
import { type Contact, telHref } from "@/lib/contacts";
import { cx } from "@/lib/cx";

type SeniorScreenProps = {
  contacts: Contact[];
  /** In the family's preview the buttons only show what the senior sees. */
  preview?: boolean;
};

const buttonClass =
  "flex min-h-24 w-full items-center gap-5 rounded-3xl bg-brand px-5 py-4 text-left text-white";

/** What the senior sees: the date, the time and big buttons to call family. */
export function SeniorScreen({ contacts, preview = false }: SeniorScreenProps) {
  const t = useTranslations("Senior");

  return (
    <div className="flex flex-col gap-8">
      {preview ? null : <h1 className="sr-only">{t("title")}</h1>}
      <SeniorClock />

      <section aria-labelledby="call-title" className="flex flex-col gap-4">
        <h2 id="call-title" className="text-2xl font-extrabold">
          {t("callTitle")}
        </h2>
        {contacts.length > 0 ? (
          <ul className="flex flex-col gap-4">
            {contacts.map((contact) => {
              const content = (
                <>
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <PhoneIcon className="size-8" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-3xl font-extrabold break-words">
                      {contact.name}
                    </span>
                    <span className="text-xl">
                      {contact.relationship ?? contact.phone}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={contact.id}>
                  {preview ? (
                    <div className={buttonClass}>{content}</div>
                  ) : (
                    <a
                      href={telHref(contact.phone)}
                      className={cx(
                        buttonClass,
                        "transition-colors hover:bg-brand-strong focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-brand",
                      )}
                    >
                      <span className="sr-only">{t("call")} </span>
                      {content}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xl text-muted">{t("noContacts")}</p>
        )}
      </section>
    </div>
  );
}
