import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/brand/logo";
import { Button, ButtonLink } from "@/components/ui/button";
import { isMember } from "@/lib/circles";
import { findInvitation } from "@/lib/invitations";
import { getSession } from "@/lib/session";
import { joinCircleAction } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Join");
  return { title: t("title") };
}

// Opened from an invitation link. Shows who invites, to which circle and in
// which role; signing in is needed before joining.
export default async function InvitationPage({
  params,
}: PageProps<"/zaproszenie/[token]">) {
  const { token } = await params;
  const path = `/zaproszenie/${token}`;
  const t = await getTranslations("Join");
  const roles = await getTranslations("Circles.roles");
  const invitation = await findInvitation(token);

  if (!invitation) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-start justify-center gap-5 px-5 py-10">
        <Logo className="size-12" />
        <h1 className="text-3xl font-extrabold">{t("invalidTitle")}</h1>
        <p className="text-lg text-muted">{t("invalidLead")}</p>
        <ButtonLink href="/">{t("home")}</ButtonLink>
      </main>
    );
  }

  const session = await getSession();
  if (session && !session.user.name.trim()) {
    redirect(`/witaj?next=${encodeURIComponent(path)}`);
  }
  const alreadyMember = session
    ? await isMember(invitation.circle.id, session.user.id)
    : false;

  const values = {
    circle: invitation.circle.name,
    role: roles(invitation.role),
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-5 py-10">
      <Logo className="size-12" />
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">{t("title")}</h1>
        <p className="text-lg">
          {invitation.invitedBy?.name
            ? t("lead", { ...values, inviter: invitation.invitedBy.name })
            : t("leadNoInviter", values)}
        </p>
      </div>

      {!session ? (
        <>
          <ButtonLink
            href={`/logowanie?next=${encodeURIComponent(path)}`}
            size="lg"
          >
            {t("signInToJoin")}
          </ButtonLink>
          <p className="text-muted">{t("signInHint")}</p>
        </>
      ) : alreadyMember ? (
        <>
          <p className="text-lg text-muted">{t("alreadyMember")}</p>
          <ButtonLink href={`/krag/${invitation.circle.id}`} size="lg">
            {t("openCircle")}
          </ButtonLink>
        </>
      ) : (
        <form action={joinCircleAction}>
          <input type="hidden" name="token" value={token} />
          <Button type="submit" size="lg" className="w-full">
            {t("join")}
          </Button>
        </form>
      )}
    </main>
  );
}
