// Tests of the senior screen against a real database: pairing a phone or
// tablet with a QR code and the numbers shown as "call" buttons.
// Like tests/circles.test.ts, they create and remove their own made-up people.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { createCircle, getCircleForMember } from "@/lib/circles";
import {
  MAX_CONTACTS,
  addContact,
  deleteContact,
  isPhoneNumber,
  listContacts,
  parseContact,
  telHref,
} from "@/lib/contacts";
import { db } from "@/lib/db";
import {
  createPairing,
  findDeviceByToken,
  findPairing,
  getPairingStatus,
  pairDevice,
  parseDeviceName,
  recordDeviceVisit,
  unpairDevice,
} from "@/lib/devices";
import { acceptInvitation, createInvitation } from "@/lib/invitations";
import { qrCodePath } from "@/lib/qr";

const run = randomUUID().slice(0, 8);
const emails = ["koordynatorka", "opiekun"].map(
  (name) => `${name}.senior.${run}@example.com`,
);
let coordinatorId = "";
let caregiverId = "";
let circleId = "";
let otherCircleId = "";

before(async () => {
  const [coordinator, caregiver] = await Promise.all(
    emails.map((email, index) =>
      db.user.create({ data: { email, name: ["Marta", "Olek"][index] } }),
    ),
  );
  coordinatorId = coordinator.id;
  caregiverId = caregiver.id;

  const newCircle = (name: string, firstName: string) =>
    createCircle(coordinatorId, {
      name,
      firstName,
      birthDate: null,
      city: null,
    });
  circleId = (await newCircle(`Senior ${run}`, "Stefania")).id;
  otherCircleId = (await newCircle(`Inny ${run}`, "Jan")).id;
});

after(async () => {
  await db.careCircle.deleteMany({
    where: { id: { in: [circleId, otherCircleId] } },
  });
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
});

describe("QR code", () => {
  test("draws the link as squares, starting with the corner square", () => {
    const qr = qrCodePath("https://krag.example/senior/polacz/abc");
    assert.ok(qr.size >= 21, `size ${qr.size}`);
    assert.equal((qr.size - 17) % 4, 0, "17 + 4 × version squares per side");
    // The top left corner square starts with a row of 7 dark squares.
    assert.ok(qr.path.startsWith("M0 0h7v1h-7z"), qr.path.slice(0, 40));
  });
});

describe("form checks", () => {
  test("a phone number has 7 to 15 digits", () => {
    for (const number of [
      "600 100 200",
      "+48 600-100-200",
      "(22) 123 45 67",
      "+380 44 123 4567",
    ]) {
      assert.ok(isPhoneNumber(number), number);
    }
    for (const number of [
      "",
      "12345",
      "600 100 200 wew. 5",
      "+48 600 100 200 300 400",
      "tel:600100200",
    ]) {
      assert.ok(!isPhoneNumber(number), number);
    }
  });

  test("a call link keeps only the plus and the digits", () => {
    assert.equal(telHref("+48 100 000 001"), "tel:+48100000001");
    assert.equal(telHref("(22) 123-45-67"), "tel:221234567");
  });

  test("the number form trims text and needs a name and a number", () => {
    assert.deepEqual(
      parseContact({
        name: "  Ania ",
        phone: " 600  100 200 ",
        relationship: " córka ",
      }),
      { input: { name: "Ania", phone: "600 100 200", relationship: "córka" } },
    );
    assert.deepEqual(
      parseContact({ name: "Ania", phone: "600 100 200", relationship: "" }),
      { input: { name: "Ania", phone: "600 100 200", relationship: null } },
    );
    assert.deepEqual(parseContact({ phone: "600 100 200" }), {
      error: "nameRequired",
    });
    assert.deepEqual(parseContact({ name: "Ania", phone: "abc" }), {
      error: "phoneInvalid",
    });
  });

  test("a device without a name gets the default name", () => {
    assert.equal(parseDeviceName("  Telefon   mamy ", "Ekran"), "Telefon mamy");
    assert.equal(parseDeviceName("", "Ekran"), "Ekran");
    assert.equal(parseDeviceName(null, "Ekran"), "Ekran");
  });
});

describe("pairing a senior device", () => {
  let deviceToken = "";

  test("a QR code pairs one device, once", async () => {
    const pairing = await createPairing({
      circleId,
      createdById: coordinatorId,
      deviceName: "Telefon mamy",
    });
    assert.deepEqual(await findPairing(pairing.token), {
      deviceName: "Telefon mamy",
      circleName: `Senior ${run}`,
    });
    assert.equal(await getPairingStatus(circleId, pairing.id), "waiting");

    const result = await pairDevice(pairing.token);
    assert.ok(result.status === "paired");
    assert.equal(result.circleId, circleId);
    deviceToken = result.token;

    const device = await findDeviceByToken(deviceToken);
    assert.equal(device?.circleId, circleId);
    assert.equal(device?.name, "Telefon mamy");

    assert.equal(await getPairingStatus(circleId, pairing.id), "paired");
    assert.equal(
      await getPairingStatus(otherCircleId, pairing.id),
      "expired",
      "another circle cannot ask about the code",
    );
    assert.equal(await findPairing(pairing.token), null);
    assert.deepEqual(await pairDevice(pairing.token), { status: "invalid" });
  });

  test("the database holds only hashes of codes and tokens", async () => {
    const pairing = await createPairing({
      circleId,
      createdById: coordinatorId,
      deviceName: "Sprawdzenie",
    });
    assert.equal(
      await db.devicePairing.count({ where: { tokenHash: pairing.token } }),
      0,
    );
    assert.equal(
      await db.pairedDevice.count({ where: { tokenHash: deviceToken } }),
      0,
    );
    await db.devicePairing.delete({ where: { id: pairing.id } });
  });

  test("the coordinator sees the device, a caregiver does not", async () => {
    const { token } = await createInvitation({
      circleId,
      invitedById: coordinatorId,
      role: "CAREGIVER",
    });
    await acceptInvitation(token, caregiverId);

    const coordinatorView = await getCircleForMember(circleId, coordinatorId);
    assert.deepEqual(
      coordinatorView?.devices?.map((device) => [device.name, device.pairedBy]),
      [["Telefon mamy", "Marta"]],
    );
    const caregiverView = await getCircleForMember(circleId, caregiverId);
    assert.equal(caregiverView?.devices, null);
    assert.deepEqual(
      caregiverView?.contacts,
      [],
      "caregivers see the emergency contacts",
    );
  });

  test("opening the senior screen is logged at most once an hour", async () => {
    const device = await findDeviceByToken(deviceToken);
    assert.ok(device);
    await recordDeviceVisit(device);
    await recordDeviceVisit(device);

    const visits = await db.auditLog.count({
      where: { circleId, deviceId: device.id, action: "VIEW" },
    });
    assert.equal(visits, 1);
    const stored = await db.pairedDevice.findUnique({
      where: { id: device.id },
      select: { lastUsedAt: true },
    });
    assert.ok(stored?.lastUsedAt);
  });

  test("pairing the same device again replaces its old pairing", async () => {
    const pairing = await createPairing({
      circleId,
      createdById: coordinatorId,
      deviceName: "Tablet",
    });
    const result = await pairDevice(pairing.token, deviceToken);
    assert.ok(result.status === "paired");
    assert.equal(
      await findDeviceByToken(deviceToken),
      null,
      "the old token no longer works",
    );

    const devices = await db.pairedDevice.findMany({
      where: { circleId },
      select: { name: true },
    });
    assert.deepEqual(
      devices.map((device) => device.name),
      ["Tablet"],
    );
    deviceToken = result.token;
  });

  test("an expired code does not pair", async () => {
    const pairing = await createPairing({
      circleId,
      createdById: coordinatorId,
      deviceName: "Stary kod",
    });
    await db.devicePairing.update({
      where: { id: pairing.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    assert.equal(await findPairing(pairing.token), null);
    assert.equal(await getPairingStatus(circleId, pairing.id), "expired");
    assert.deepEqual(await pairDevice(pairing.token), { status: "invalid" });
  });

  test("an unpaired device stops working at once", async () => {
    const device = await findDeviceByToken(deviceToken);
    assert.ok(device);
    assert.equal(
      await unpairDevice({
        circleId: otherCircleId,
        deviceId: device.id,
        userId: coordinatorId,
      }),
      false,
      "only in its own circle",
    );
    assert.equal(
      await unpairDevice({
        circleId,
        deviceId: device.id,
        userId: coordinatorId,
      }),
      true,
    );
    assert.equal(await findDeviceByToken(deviceToken), null);
  });
});

describe("numbers on the senior screen", () => {
  const add = (circle: string, name: string, phone = "600 100 200") =>
    addContact({
      circleId: circle,
      userId: coordinatorId,
      input: { name, phone, relationship: null },
    });

  test("numbers keep the order in which they were added", async () => {
    assert.equal(await add(circleId, "Ania"), "added");
    assert.equal(await add(circleId, "Tomek"), "added");
    assert.deepEqual(
      (await listContacts(circleId)).map((contact) => contact.name),
      ["Ania", "Tomek"],
    );
    assert.deepEqual(await listContacts(otherCircleId), []);
  });

  test("the screen has room for a limited number of numbers", async () => {
    const existing = (await listContacts(circleId)).length;
    for (let index = existing; index < MAX_CONTACTS; index++) {
      assert.equal(await add(circleId, `Osoba ${index}`), "added");
    }
    assert.equal(await add(circleId, "Za dużo"), "tooMany");
  });

  test("a number can be removed only in its own circle", async () => {
    const [first] = await listContacts(circleId);
    const remove = (circle: string) =>
      deleteContact({
        circleId: circle,
        contactId: first.id,
        userId: coordinatorId,
      });
    assert.equal(await remove(otherCircleId), false);
    assert.equal(await remove(circleId), true);
    const left = await listContacts(circleId);
    assert.ok(!left.some((contact) => contact.id === first.id));
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
      "CREATE DevicePairing",
      "CREATE PairedDevice",
      "DELETE PairedDevice",
      "VIEW CareRecipient",
      "CREATE EmergencyContact",
      "DELETE EmergencyContact",
    ]) {
      assert.ok(kinds.has(kind), kind);
    }
  });
});
