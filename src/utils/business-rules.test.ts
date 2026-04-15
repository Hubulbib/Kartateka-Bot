import {
  canCreateBusinessRequestByCooldown,
  pickLatestBusinessRequestsByCafe,
} from "./business-rules";

const runTest = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    throw error;
  }
};

const assertStrictEqual = <T>(actual: T, expected: T) => {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${expected}, got ${actual}`);
  }
};

runTest("canCreateBusinessRequestByCooldown разрешает создание при отсутствии прошлой заявки", () => {
  const now = new Date("2026-01-01T12:00:00.000Z");
  assertStrictEqual(canCreateBusinessRequestByCooldown(null, now, 24), true);
});

runTest("canCreateBusinessRequestByCooldown запрещает создание, если не прошло 24 часа", () => {
  const now = new Date("2026-01-02T12:00:00.000Z");
  const latest = new Date("2026-01-01T13:00:00.000Z");
  assertStrictEqual(canCreateBusinessRequestByCooldown(latest, now, 24), false);
});

runTest("canCreateBusinessRequestByCooldown разрешает создание, если прошло ровно 24 часа", () => {
  const now = new Date("2026-01-02T12:00:00.000Z");
  const latest = new Date("2026-01-01T12:00:00.000Z");
  assertStrictEqual(canCreateBusinessRequestByCooldown(latest, now, 24), true);
});

runTest("pickLatestBusinessRequestsByCafe выбирает только последние заявки по каждому кафе", () => {
  const requests = [
    { id: 1, cafeName: "Coffee A", createdAt: new Date("2026-01-01T10:00:00Z") },
    { id: 2, cafeName: "Coffee B", createdAt: new Date("2026-01-01T11:00:00Z") },
    { id: 3, cafeName: "Coffee A", createdAt: new Date("2026-01-01T12:00:00Z") },
  ];

  const result = pickLatestBusinessRequestsByCafe(requests);

  assertStrictEqual(result.length, 2);
  const latestA = result.find((item) => item.cafeName === "Coffee A");
  const latestB = result.find((item) => item.cafeName === "Coffee B");
  assertStrictEqual(latestA?.id, 3);
  assertStrictEqual(latestB?.id, 2);
});
