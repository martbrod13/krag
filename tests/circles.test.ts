// Tests of circles and invitations against a real database.
// On GitHub they run on the temporary test database; locally they need
// DATABASE_URL in .env.local. They create and remove their own made-up people.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import {
  createCircle,
  getCircleForMember,
  parseNewCircle,
} from "@/lib/circles";
import { db } from "@/lib/db";
import {
  acceptInvitation,
  cancelInvitation,
  createInvitation,
  findInvitation,
} from "@/lib/invitations";
import { DEFAULT_PERMISSIONS } from "@/lib/permissions";

const run = randomUUID().slice(0, 8);
const emails = ["koordynator", "opiekunka", "rodzina"].map(
  (name) => `${name}.${run}@example.com`,
);
let coordinatorId = "";
let caregiverId = "";
let familyId = "";
let circleId = "";

before(async () => {
  const [coordinator, caregiver, family] = await Promise.all(
    emails.map((email, index) =>
      db.user.create({
        data: { email, name: ["Ola", "Irena", "Piotr"][index] },
      }),
    ),
  );
  coordinatorId = coordinator.id;
  caregiverId = caregiver.id;
  familyId = family.id;
});

after(async () => {
  if (circleId) await db.careCircle.deleteMany({ where: { id: circleId } });
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
});

describe("new circle form", () => {
  const today = new Date("2026-11-11T12:00:00Z");

  test("accepts a full form and trims text", () => {
    const result = parseNewCircle(
      {
        name: "  Mama Halina ",
        firstName: "Halina",
        birthDate: "1948-03-12",
        city: " Łódź ",
      },
      today,
    );
    assert.ok("input" in result);
    assert.equal(result.input.name, "Mama Halina");
    assert.equal(result.input.city, "Łódź");
    assert.equal(
      result.input.birthDate?.toISOString(),
      "1948-03-12T00:00:00.000Z",
    );
  });

  test("needs a circle name and a first name", () => {
    assert.deepEqual(parseNewCircle({ firstName: "Halina" }, today), {
      error: "nameRequired",
    });
    assert.deepEqual(parseNewCircle({ name: "Mama" }, today), {
      error: "firstNameRequired",
    });
  });

  test("rejects impossible or future birth dates", () => {
    for (const birthDate of [
      "1948-02-30",
      "2030-01-01",
      "1850-01-01",
      "12.03.1948",
    ]) {
      assert.deepEqual(
        parseNewCircle({ name: "Mama", firstName: "Halina", birthDate }, today),
        { error: "birthDateInvalid" },
        birthDate,
      );
    }
  });
});

describe("circles and invitations", () => {
  test("the person who creates a circle becomes its coordinator", async () => {
    const circle = await createCircle(coordinatorId, {
      name: `Test ${run}`,
      firstName: "Halina",
      birthDate: new Date("1948-03-12T00:00:00Z"),
      city: "Łódź",
    });
    circleId = circle.id;

    const view = await getCircleForMember(circleId, coordinatorId);
    assert.ok(view);
    assert.equal(view.role, "COORDINATOR");
    assert.deepEqual(view.permissions, DEFAULT_PERMISSIONS.COORDINATOR);
    assert.equal(view.recipient?.firstName, "Halina");
    assert.deepEqual(view.invitations, []);
  });

  test("people outside the circle see nothing", async () => {
    assert.equal(await getCircleForMember(circleId, caregiverId), null);
  });

  test("an invitation link adds a caregiver once, with caregiver permissions", async () => {
    const { token } = await createInvitation({
      circleId,
      invitedById: coordinatorId,
      role: "CAREGIVER",
    });

    const preview = await findInvitation(token);
    assert.equal(preview?.role, "CAREGIVER");
    assert.equal(preview?.invitedBy?.name, "Ola");

    assert.deepEqual(await acceptInvitation(token, caregiverId), {
      status: "joined",
      circleId,
    });
    const view = await getCircleForMember(circleId, caregiverId);
    assert.equal(view?.role, "CAREGIVER");
    assert.deepEqual(view?.permissions, DEFAULT_PERMISSIONS.CAREGIVER);
    assert.ok(!view?.permissions.includes("DOCUMENTS"));
    assert.equal(
      view?.invitations,
      null,
      "caregivers do not manage invitations",
    );

    // The same link does not work a second time.
    assert.deepEqual(await acceptInvitation(token, familyId), {
      status: "invalid",
    });
    assert.equal(await findInvitation(token), null);
  });

  test("a member who opens a link does not use it up", async () => {
    const { token } = await createInvitation({
      circleId,
      invitedById: coordinatorId,
      role: "FAMILY",
    });
    assert.deepEqual(await acceptInvitation(token, caregiverId), {
      status: "already-member",
      circleId,
    });
    assert.deepEqual(await acceptInvitation(token, familyId), {
      status: "joined",
      circleId,
    });
    const view = await getCircleForMember(circleId, familyId);
    assert.deepEqual(view?.permissions, DEFAULT_PERMISSIONS.FAMILY);
  });

  test("an expired link does not work", async () => {
    const { token, id } = await createInvitation({
      circleId,
      invitedById: coordinatorId,
      role: "FAMILY",
    });
    await db.invitation.update({
      where: { id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    assert.deepEqual(await acceptInvitation(token, randomUUID()), {
      status: "invalid",
    });
    assert.equal(await findInvitation(token), null);
  });

  test("a coordinator can cancel a pending invitation", async () => {
    const { token, id } = await createInvitation({
      circleId,
      invitedById: coordinatorId,
      role: "COORDINATOR",
    });
    const pending = await getCircleForMember(circleId, coordinatorId);
    assert.ok(pending?.invitations?.some((invitation) => invitation.id === id));

    assert.equal(
      await cancelInvitation({
        circleId,
        invitationId: id,
        userId: coordinatorId,
      }),
      true,
    );
    assert.equal(await findInvitation(token), null);
  });

  test("every change is in the access log", async () => {
    const entries = await db.auditLog.findMany({
      where: { circleId },
      select: { action: true, entity: true },
    });
    const kinds = new Set(
      entries.map((entry) => `${entry.action} ${entry.entity}`),
    );
    for (const kind of [
      "CREATE CareCircle",
      "CREATE Invitation",
      "CREATE Membership",
      "DELETE Invitation",
    ]) {
      assert.ok(kinds.has(kind), kind);
    }
  });
});
