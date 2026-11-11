import { redirect } from "next/navigation";

// The caregiver's circles are now on the start page ("My circles").
// This address stays so old links and bookmarks keep working.
export default function CaregiverPage() {
  redirect("/");
}
