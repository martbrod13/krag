// Tests of the care recipient's data and of deleting a circle, against a
// real database. Like the other tests, they create and remove their own
// made-up people.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import {
  ageInYears,
  confirmsCircleName,
  createCircle,
  deleteCircle,
  getCircleForMember,
  getCircleFormValues,
  parseCircleForm,
  updateCircle,
} from "@/lib/circles";
import { addContact } from "@/lib/contacts";
import { db } from "@/lib/db";
import { createPairing, findDeviceByToken, pairDevice } from "@/lib/devices";
import { acceptInvitation, createInvitation } from "@/lib/invitations";
import { updateMember } from "@/lib/members";

const run = randomUUID().slice(0, 8);
const emails = ["koordynator", "opiekunka"].map(
  (name) => `${name}.dane.${run}@example.com`,
);
let coordinatorId = "";
let caregiverId = "";
let circleId = "";

before(async () => {
  const [coordinator, caregiver] = await Promise.all(
    emails.map((email, index) =>
      db.user.create({ data: { email, name: ["Marek", "Irena"][index] } }),
    ),
  );
  coordinatorId = coordinator.id;
  caregiverId = caregiver.id;
  circleId = (
    await createCircle(coordinatorId, {
      name: `Dane ${run}`,
      firstName: "Halina",
      birthDate: null,
      city: null,
    })
  ).id;
  const { token } = await createInvitation({
    circleId,
    invitedById: coordinatorId,
    role: "CAREGIVER",
  });
  await acceptInvitation(token, caregiverId);
});

after(async () => {
  await db.careCircle.deleteMany({ where: { id: circleId } });
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
});

const today = new Date("2026-11-11T12:00:00Z");

describe("the care recipient's data", () => {
  test("the form trims text and turns empty fields into nothing", () => {
    const result = parseCircleForm(
      {
        name: "Mama",
        firstName: "Halina",
        address: "  ul. Lipowa 5/2 ",
        primaryDoctor: "",
        city: " ",
      },
      today,
    );
    assert.ok("input" in result);
    assert.equal(result.input.address, "ul. Lipowa 5/2");
    assert.equal(result.input.primaryDoctor, null);
    assert.equal(result.input.city, null);
    assert.equal(result.input.birthDate, null);
  });

  test("a coordinator can change the circle's name and the data", async () => {
    const parsed = parseCircleForm(
      {
        name: `Mama Halina ${run}`,
        firstName: "Halina",
        birthDate: "1948-03-12",
        city: "Łódź",
        address: "ul. Przykładowa 1/2",
        primaryDoctor: "dr Jan Testowy",
      },
      today,
    );
    assert.ok("input" in parsed);
    assert.equal(
      await updateCircle({
        circleId,
        userId: coordinatorId,
        input: parsed.input,
      }),
      true,
    );

    assert.deepEqual(await getCircleFormValues(circleId), {
      name: `Mama Halina ${run}`,
      firstName: "Halina",
      birthDate: "1948-03-12",
      city: "Łódź",
      address: "ul. Przykładowa 1/2",
      primaryDoctor: "dr Jan Testowy",
    });
    const view = await getCircleForMember(circleId, coordinatorId);
    assert.equal(view?.name, `Mama Halina ${run}`);
    assert.equal(view?.recipient?.primaryDoctor, "dr Jan Testowy");
    assert.equal(
      view?.recipient?.age,
      ageInYears(new Date("1948-03-12T00:00:00Z"), new Date()),
    );

    const changes = await db.auditLog.findMany({
      where: { circleId, action: "UPDATE" },
      select: { entity: true },
    });
    assert.deepEqual(changes.map((change) => change.entity).sort(), [
      "CareCircle",
      "CareRecipient",
    ]);

    // Saving the same data again changes nothing and adds nothing to the log.
    await updateCircle({
      circleId,
      userId: coordinatorId,
      input: parsed.input,
    });
    assert.equal(
      await db.auditLog.count({ where: { circleId, action: "UPDATE" } }),
      2,
    );
  });

  test("without the profile permission the doctor stays hidden", async () => {
    assert.equal(
      (await getCircleForMember(circleId, caregiverId))?.recipient
        ?.primaryDoctor,
      "dr Jan Testowy",
    );
    await updateMember({
      circleId,
      memberId: caregiverId,
      role: "CAREGIVER",
      permissions: ["TASKS"],
      userId: coordinatorId,
    });
    const view = await getCircleForMember(circleId, caregiverId);
    assert.equal(view?.recipient?.primaryDoctor, null);
    assert.equal(view?.recipient?.address, null);
  });

  test("there is nothing to change in a circle that does not exist", async () => {
    const parsed = parseCircleForm({ name: "X", firstName: "Y" }, today);
    assert.ok("input" in parsed);
    assert.equal(
      await updateCircle({
        circleId: "nie-ma-takiego-kregu",
        userId: coordinatorId,
        input: parsed.input,
      }),
      false,
    );
    assert.equal(await getCircleFormValues("nie-ma-takiego-kregu"), null);
  });
});

describe("deleting a circle", () => {
  test("only the circle's exact name confirms it", () => {
    assert.ok(confirmsCircleName("mama  halina ", "Mama Halina"));
    assert.ok(confirmsCircleName("MAMA HALINA", "Mama Halina"));
    assert.ok(!confirmsCircleName("Mama", "Mama Halina"));
    assert.ok(!confirmsCircleName("   ", "Mama Halina"));
  });

  test("removes everything in the circle, but not people's accounts", async () => {
    await addContact({
      circleId,
      userId: coordinatorId,
      input: { name: "Ania", phone: "600 100 200", relationship: null },
    });
    await createInvitation({
      circleId,
      invitedById: coordinatorId,
      role: "FAMILY",
    });
    const pairing = await createPairing({
      circleId,
      createdById: coordinatorId,
      deviceName: "Tablet",
    });
    const paired = await pairDevice(pairing.token);
    assert.ok(paired.status === "paired");

    assert.equal(await deleteCircle(circleId), true);

    assert.equal(await getCircleForMember(circleId, coordinatorId), null);
    assert.equal(await findDeviceByToken(paired.token), null);
    for (const count of [
      db.membership.count({ where: { circleId } }),
      db.invitation.count({ where: { circleId } }),
      db.careRecipient.count({ where: { circleId } }),
      db.emergencyContact.count({ where: { recipient: { circleId } } }),
      db.pairedDevice.count({ where: { circleId } }),
      db.devicePairing.count({ where: { circleId } }),
      db.auditLog.count({ where: { circleId } }),
    ]) {
      assert.equal(await count, 0);
    }
    assert.equal(
      await db.user.count({
        where: { id: { in: [coordinatorId, caregiverId] } },
      }),
      2,
      "accounts stay",
    );
    assert.equal(await deleteCircle(circleId), false);
  });
});
