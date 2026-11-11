// Fills the database with made-up test data: the Kowalski family caring for
// Halina. Every name, address and phone number here is fictional.
// Never put real people's data into this file.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { addDays, dayToDate, todayInPoland } from "../src/lib/dates";
import { DEFAULT_PERMISSIONS } from "../src/lib/permissions";
import { hashToken, newToken } from "../src/lib/tokens";

if (process.env.NODE_ENV === "production") {
  throw new Error("Test data must never be loaded into a production database.");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEMO_CIRCLE_ID = "demo-krag-kowalscy";

// Secret token of the demo tablet ("Tablet mamy"). The smoke test opens the
// senior screen with it. It belongs to made-up test data only; real devices
// get a random token when they are paired with a QR code.
const DEMO_DEVICE_TOKEN = "demo-tablet-mamy-tylko-dane-testowe";

const { COORDINATOR, FAMILY, CAREGIVER } = DEFAULT_PERMISSIONS;

// Test people can sign in with their email; in development the code is
// printed in the terminal.
const people = {
  ania: {
    name: "Ania Kowalska",
    email: "ania.kowalska@example.com",
    emailVerified: true,
    phone: "+48 100 000 001",
  },
  tomek: {
    name: "Tomek Kowalski",
    email: "tomek.kowalski@example.com",
    emailVerified: true,
    phone: "+48 100 000 002",
  },
  kasia: {
    name: "Kasia Nowak",
    email: "kasia.nowak@example.com",
    emailVerified: true,
  },
  ewa: {
    name: "Ewa Wiśniewska",
    email: "ewa.wisniewska@example.com",
    emailVerified: true,
    phone: "+48 100 000 004",
    locale: "uk",
  },
};

async function main() {
  // Remove the previous copy of the test data, so the seed can run many times.
  await db.careCircle.deleteMany({ where: { id: DEMO_CIRCLE_ID } });
  await db.user.deleteMany({
    where: {
      email: { in: Object.values(people).map((person) => person.email) },
    },
  });

  const ania = await db.user.create({ data: people.ania });
  const tomek = await db.user.create({ data: people.tomek });
  const kasia = await db.user.create({ data: people.kasia });
  const ewa = await db.user.create({ data: people.ewa });

  const circle = await db.careCircle.create({
    data: {
      id: DEMO_CIRCLE_ID,
      name: "Mama Halina",
      recipient: {
        create: {
          firstName: "Halina",
          birthDate: new Date("1948-03-12"),
          city: "Łódź",
          address: "ul. Przykładowa 1/2, 90-001 Łódź",
          primaryDoctor: "dr Jan Testowy, Przychodnia Testowa",
          emergencyContacts: {
            create: [
              {
                name: "Ania Kowalska",
                phone: "+48 100 000 001",
                relationship: "córka",
                position: 0,
              },
              {
                name: "Tomek Kowalski",
                phone: "+48 100 000 002",
                relationship: "syn",
                position: 1,
              },
              {
                name: "Zofia Testowa",
                phone: "+48 100 000 005",
                relationship: "sąsiadka",
                position: 2,
              },
            ],
          },
        },
      },
      memberships: {
        create: [
          { userId: ania.id, role: "COORDINATOR", permissions: COORDINATOR },
          {
            userId: tomek.id,
            role: "FAMILY",
            permissions: FAMILY,
            invitedById: ania.id,
          },
          {
            userId: kasia.id,
            role: "FAMILY",
            permissions: FAMILY,
            invitedById: ania.id,
          },
          {
            userId: ewa.id,
            role: "CAREGIVER",
            permissions: CAREGIVER,
            invitedById: ania.id,
          },
        ],
      },
      invitations: {
        create: {
          role: "FAMILY",
          permissions: FAMILY,
          email: "wnuczka@example.com",
          tokenHash: hashToken(newToken()),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          invitedById: ania.id,
        },
      },
      devices: {
        create: {
          name: "Tablet mamy",
          tokenHash: hashToken(DEMO_DEVICE_TOKEN),
          pairedById: ania.id,
        },
      },
    },
  });

  // The plan is built around the day the test data is loaded.
  const today = todayInPoland();
  const day = (offset: number) => dayToDate(addDays(today, offset));
  await db.task.createMany({
    data: [
      {
        circleId: circle.id,
        title: "Zapłacić rachunek za prąd",
        date: day(-1),
        assigneeId: kasia.id,
        createdById: ania.id,
      },
      {
        circleId: circle.id,
        title: "Odebrać recepty z przychodni",
        date: day(0),
        time: "12:00",
        assigneeId: ania.id,
        createdById: ania.id,
      },
      {
        circleId: circle.id,
        title: "Spacer po parku",
        date: day(0),
        time: "16:00",
        assigneeId: ewa.id,
        createdById: ania.id,
        showToSenior: true,
      },
      {
        circleId: circle.id,
        title: "Wizyta u lekarza rodzinnego",
        note: "Zabrać listę leków i dowód osobisty.",
        date: day(1),
        time: "10:00",
        assigneeId: tomek.id,
        createdById: ania.id,
        showToSenior: true,
      },
      {
        circleId: circle.id,
        title: "Przyjazd Kasi z dziećmi",
        date: day(3),
        time: "15:00",
        assigneeId: kasia.id,
        createdById: kasia.id,
        showToSenior: true,
      },
      {
        circleId: circle.id,
        title: "Kupić żarówki do łazienki",
        createdById: tomek.id,
      },
      {
        circleId: circle.id,
        title: "Wymienić baterie w pilocie",
        createdById: ewa.id,
        assigneeId: ewa.id,
        doneAt: new Date(),
        doneById: ewa.id,
      },
    ],
  });

  await db.auditLog.createMany({
    data: [
      {
        circleId: circle.id,
        userId: ania.id,
        action: "CREATE",
        entity: "CareCircle",
        entityId: circle.id,
      },
      {
        circleId: circle.id,
        userId: tomek.id,
        action: "CREATE",
        entity: "Membership",
        entityId: tomek.id,
      },
      {
        circleId: circle.id,
        userId: ewa.id,
        action: "VIEW",
        entity: "CareRecipient",
      },
      {
        circleId: circle.id,
        deviceName: "Tablet mamy",
        action: "VIEW",
        entity: "CareRecipient",
      },
    ],
  });

  console.log(
    `Test data ready: circle "${circle.name}" with 4 people, 1 invitation and 1 paired device.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
