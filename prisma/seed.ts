// Fills the database with made-up test data: the Kowalski family caring for
// Halina. Every name, address and phone number here is fictional.
// Never put real people's data into this file.
import { createHash, randomBytes } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Permission } from "../src/generated/prisma/client";

if (process.env.NODE_ENV === "production") {
  throw new Error("Test data must never be loaded into a production database.");
}

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEMO_CIRCLE_ID = "demo-krag-kowalscy";

const COORDINATOR: Permission[] = [
  "PROFILE",
  "HEALTH",
  "TASKS",
  "VISITS",
  "DOCUMENTS",
  "MANAGE",
];
const FAMILY: Permission[] = [
  "PROFILE",
  "HEALTH",
  "TASKS",
  "VISITS",
  "DOCUMENTS",
];
// Everything a caregiver needs for care; documents only when the family allows.
const CAREGIVER: Permission[] = ["PROFILE", "HEALTH", "TASKS", "VISITS"];

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

function newTokenHash() {
  const token = randomBytes(32).toString("hex");
  return createHash("sha256").update(token).digest("hex");
}

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
          tokenHash: newTokenHash(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          invitedById: ania.id,
        },
      },
      devices: {
        create: { name: "Tablet mamy", tokenHash: newTokenHash() },
      },
    },
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
        userId: ewa.id,
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
