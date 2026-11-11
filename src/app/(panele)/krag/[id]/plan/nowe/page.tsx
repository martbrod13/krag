import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCircleForMember } from "@/lib/circles";
import { isDay } from "@/lib/dates";
import { requireUser } from "@/lib/session";
import { listTaskPeople } from "@/lib/tasks";
import { TaskForm } from "../task-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("TaskForm");
  return { title: t("newTitle") };
}

// A new task. "?dzien=YYYY-MM-DD" fills in the day, e.g. "add for today".
export default async function NewTaskPage({
  params,
  searchParams,
}: PageProps<"/krag/[id]/plan/nowe">) {
  const { id } = await params;
  const { dzien } = await searchParams;
  const user = await requireUser(`/krag/${id}/plan/nowe`);
  const circle = await getCircleForMember(id, user.id);
  if (!circle) notFound();
  if (!circle.permissions.includes("TASKS")) redirect(`/krag/${id}`);

  const people = await listTaskPeople(circle.id);
  const t = await getTranslations("TaskForm");
  const day = typeof dzien === "string" && isDay(dzien) ? dzien : "";

  return (
    <>
      <Link
        href={`/krag/${id}/plan`}
        className="font-bold text-brand hover:underline"
      >
        ← {t("back")}
      </Link>
      <h1 className="text-3xl font-extrabold">{t("newTitle")}</h1>
      <TaskForm
        circleId={circle.id}
        people={people}
        saved={{
          title: "",
          date: day,
          time: "",
          assigneeId: "",
          note: "",
          showToSenior: "",
        }}
      />
    </>
  );
}
