// Tests of the circle settings against a real database: roles, what each
// person sees, removing people, leaving, and the readable access log.
// Like the other tests, they create and remove their own made-up people.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { getAccessLog, ACCESS_LOG_PAGE_SIZE } from "@/lib/access-log";
import { createCircle, getCircleForMember } from "@/lib/circles";
import { db } from "@/lib/db";
import {
  createPairing,
  findDeviceByToken,
  pairDevice,
  recordDeviceVisit,
  unpairDevice,
} from "@/lib/devices";
import { acceptInvitation, createInvitation } from "@/lib/invitations";
import { removeMember, updateMember } from "@/lib/members";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";

const run = randomUUID().slice(0, 8);
const emails = ["ola", "piotr", "irena"].map(
  (name) => `${name}.ustawienia.${run}@example.com`,
);
let olaId = ""; // creates the circle, so she starts as its only coordinator
let piotrId = ""; // family member
let irenaId = ""; // caregiver
let circleId = "";

before(async () => {
  const [ola, piotr, irena] = await Promise.all(
    emails.map((email, index) =>
      db.user.create({
        data: { email, name: ["Ola", "Piotr", "Irena"][index] },
      }),
    ),
  );
  olaId = ola.id;
  piotrId = piotr.id;
  irenaId = irena.id;

  circleId = (
    await createCircle(olaId, {
      name: `Ustawienia ${run}`,
      firstName: "Halina",
      birthDate: new Date("1948-03-12T00:00:00Z"),
      city: "Łódź",
    })
  ).id;
  for (const [userId, role] of [
    [piotrId, "FAMILY"],
    [irenaId, "CAREGIVER"],
  ] as const) {
    const { token } = await createInvitation({
      circleId,
      invitedById: olaId,
      role,
    });
    await acceptInvitation(token, userId);
  }
});

after(async () => {
  await db.careCircle.deleteMany({ where: { id: circleId } });
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
});

describe("roles and permissions", () => {
  test("a coordinator can let the caregiver see documents", async () => {
    const result = await updateMember({
      circleId,
      memberId: irenaId,
      role: "CAREGIVER",
      permissions: [...DEFAULT_PERMISSIONS.CAREGIVER, "DOCUMENTS", "MANAGE"],
      userId: olaId,
    });
    assert.equal(result, "ok");

    const view = await getCircleForMember(circleId, irenaId);
    assert.ok(view?.permissions.includes("DOCUMENTS"));
    assert.ok(
      !view?.permissions.includes("MANAGE"),
      "managing the circle comes only with the coordinator role",
    );
    assert.equal(view?.invitations, null);
  });

  test("without the profile permission the senior's details stay hidden", async () => {
    await updateMember({
      circleId,
      memberId: irenaId,
      role: "CAREGIVER",
      permissions: ["TASKS"],
      userId: olaId,
    });
    const view = await getCircleForMember(circleId, irenaId);
    assert.deepEqual(view?.permissions, ["TASKS"]);
    assert.equal(view?.recipient?.firstName, "Halina");
    assert.equal(view?.recipient?.age, null);
    assert.equal(view?.recipient?.city, null);
    assert.equal(view?.contacts, null);
  });

  test("the only coordinator can neither step down nor leave", async () => {
    assert.equal(
      await updateMember({
        circleId,
        memberId: olaId,
        role: "FAMILY",
        permissions: [],
        userId: olaId,
      }),
      "lastCoordinator",
    );
    assert.equal(
      await removeMember({ circleId, memberId: olaId, userId: olaId }),
      "lastCoordinator",
    );
  });

  test("a family member can become a coordinator", async () => {
    assert.equal(
      await updateMember({
        circleId,
        memberId: piotrId,
        role: "COORDINATOR",
        permissions: [],
        userId: olaId,
      }),
      "ok",
    );
    const view = await getCircleForMember(circleId, piotrId);
    assert.deepEqual(view?.permissions, DEFAULT_PERMISSIONS.COORDINATOR);
    assert.notEqual(view?.invitations, null);
  });

  test("with a second coordinator the first one can step down", async () => {
    assert.equal(
      await updateMember({
        circleId,
        memberId: olaId,
        role: "FAMILY",
        permissions: DEFAULT_PERMISSIONS.FAMILY,
        userId: olaId,
      }),
      "ok",
    );
    assert.equal(
      await removeMember({ circleId, memberId: piotrId, userId: piotrId }),
      "lastCoordinator",
      "now Piotr is the only coordinator",
    );
  });
});

describe("removing people and leaving", () => {
  test("a coordinator can remove someone from the circle", async () => {
    assert.equal(
      await removeMember({ circleId, memberId: irenaId, userId: piotrId }),
      "ok",
    );
    assert.equal(await getCircleForMember(circleId, irenaId), null);
    assert.equal(
      await removeMember({ circleId, memberId: irenaId, userId: piotrId }),
      "notFound",
    );
  });

  test("anyone else can leave the circle", async () => {
    assert.equal(
      await removeMember({ circleId, memberId: olaId, userId: olaId }),
      "ok",
    );
    assert.equal(await getCircleForMember(circleId, olaId), null);
  });
});

describe("access log", () => {
  test("names the people and devices entries are about", async () => {
    const pairing = await createPairing({
      circleId,
      createdById: piotrId,
      deviceName: "Tablet",
    });
    const paired = await pairDevice(pairing.token);
    assert.ok(paired.status === "paired");
    const device = await findDeviceByToken(paired.token);
    assert.ok(device);
    await recordDeviceVisit(device);
    await unpairDevice({ circleId, deviceId: device.id, userId: piotrId });

    const { entries } = await getAccessLog(circleId);
    const lines = new Set(
      entries.map(
        (entry) => `${entry.actor ?? "?"} | ${entry.event} | ${entry.subject}`,
      ),
    );
    for (const line of [
      "Piotr | join | Piotr",
      "Ola | changeMember | Irena",
      "Ola | changeMember | Piotr",
      "Piotr | removeMember | Irena",
      "Ola | leave | Ola",
      "Piotr | createPairing | Tablet",
      "Piotr | pairDevice | Tablet",
      "Tablet | seniorScreen | null",
      "Piotr | unpairDevice | Tablet",
    ]) {
      assert.ok(lines.has(line), `${line}\n${[...lines].join("\n")}`);
    }
  });

  test("entries older than 12 months are deleted", async () => {
    const old = await db.auditLog.create({
      data: {
        circleId,
        userId: piotrId,
        action: "VIEW",
        entity: "CareRecipient",
        createdAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000),
      },
    });
    await getAccessLog(circleId);
    assert.equal(await db.auditLog.count({ where: { id: old.id } }), 0);
  });

  test("the log comes in pages, newest first", async () => {
    await db.auditLog.createMany({
      data: Array.from({ length: ACCESS_LOG_PAGE_SIZE + 5 }, () => ({
        circleId,
        userId: piotrId,
        action: "VIEW" as const,
        entity: "CareRecipient",
      })),
    });
    const first = await getAccessLog(circleId, 1);
    const second = await getAccessLog(circleId, 2);
    assert.equal(first.entries.length, ACCESS_LOG_PAGE_SIZE);
    assert.equal(first.hasMore, true);
    assert.equal(second.hasMore, false);
    assert.ok(second.entries.length > 0);

    const firstIds = new Set(first.entries.map((entry) => entry.id));
    assert.ok(second.entries.every((entry) => !firstIds.has(entry.id)));
    const times = [...first.entries, ...second.entries].map((entry) =>
      entry.createdAt.getTime(),
    );
    assert.deepEqual(
      times,
      [...times].sort((a, b) => b - a),
    );
  });
});
