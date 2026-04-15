import { ReviewStatus } from "@prisma/client";
import {
  canCreateReviewByCooldown,
  getReviewStatusByToxicity,
} from "./review-rules";

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

runTest("getReviewStatusByToxicity возвращает APPROVED при токсичности ниже 0.3", () => {
  assertStrictEqual(getReviewStatusByToxicity(0.29), ReviewStatus.APPROVED);
});

runTest("getReviewStatusByToxicity возвращает MODERATION на границе 0.3", () => {
  assertStrictEqual(getReviewStatusByToxicity(0.3), ReviewStatus.MODERATION);
});

runTest("getReviewStatusByToxicity возвращает MODERATION при токсичности ниже 0.7", () => {
  assertStrictEqual(getReviewStatusByToxicity(0.69), ReviewStatus.MODERATION);
});

runTest("getReviewStatusByToxicity возвращает REJECTED на границе 0.7", () => {
  assertStrictEqual(getReviewStatusByToxicity(0.7), ReviewStatus.REJECTED);
});

runTest("canCreateReviewByCooldown разрешает создание, если предыдущего отзыва нет", () => {
  const now = new Date("2026-01-01T12:00:00.000Z");
  assertStrictEqual(canCreateReviewByCooldown(null, now, 6), true);
});

runTest("canCreateReviewByCooldown запрещает создание, если не прошел интервал 6 часов", () => {
  const now = new Date("2026-01-01T12:00:00.000Z");
  const latest = new Date("2026-01-01T07:00:01.000Z");
  assertStrictEqual(canCreateReviewByCooldown(latest, now, 6), false);
});

runTest("canCreateReviewByCooldown разрешает создание, если прошло ровно 6 часов", () => {
  const now = new Date("2026-01-01T12:00:00.000Z");
  const latest = new Date("2026-01-01T06:00:00.000Z");
  assertStrictEqual(canCreateReviewByCooldown(latest, now, 6), true);
});
