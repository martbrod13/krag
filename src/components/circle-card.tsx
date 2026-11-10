import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { MyCircle } from "@/lib/circles";

/** One care circle: who is cared for and what role the user has in it. */
export function CircleCard({ circle }: { circle: MyCircle }) {
  const t = useTranslations("Circles");
  const recipient = circle.recipient;

  return (
    <Card className="flex flex-col items-start gap-2">
      <Badge tone={circle.role === "CAREGIVER" ? "info" : "brand"}>
        {t(`roles.${circle.role}`)}
      </Badge>
      <h3 className="text-xl font-extrabold">{circle.name}</h3>
      {recipient ? (
        <p className="text-lg">
          {recipient.age === null
            ? recipient.firstName
            : t("recipientWithAge", {
                name: recipient.firstName,
                age: recipient.age,
              })}
          {recipient.city ? (
            <span className="text-muted"> · {recipient.city}</span>
          ) : null}
        </p>
      ) : null}
    </Card>
  );
}
