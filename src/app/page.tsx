import { redirect } from "next/navigation";
import { Landing } from "@/components/home/landing";
import { MyCircles } from "@/components/home/my-circles";
import { getMyCircles } from "@/lib/circles";
import { getPairedDevice } from "@/lib/senior-device";
import { getSession } from "@/lib/session";

// The start page. Visitors see what Krąg is; signed-in people see their
// circles; the senior's paired phone or tablet goes to the senior screen.
export default async function HomePage({ searchParams }: PageProps<"/">) {
  const session = await getSession();

  if (!session) {
    // Also when the senior opens Krąg from the icon on the home screen.
    const { device } = await getPairedDevice();
    if (device) redirect("/senior");
    return <Landing />;
  }

  const name = session.user.name.trim();
  if (!name) redirect("/witaj?next=%2F");

  const circles = await getMyCircles(session.user.id);
  const circleDeleted = (await searchParams).usunieto === "1";
  return (
    <MyCircles name={name} circles={circles} circleDeleted={circleDeleted} />
  );
}
