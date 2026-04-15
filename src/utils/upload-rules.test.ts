import { hasValidUploadedFiles, normalizePromotionDates } from "./upload-rules";

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

runTest("hasValidUploadedFiles возвращает true для массива файлов", () => {
  assertStrictEqual(hasValidUploadedFiles([]), true);
});

runTest("hasValidUploadedFiles возвращает false для не-массива", () => {
  assertStrictEqual(hasValidUploadedFiles(null), false);
});

runTest("normalizePromotionDates использует текущую дату при отсутствии dateStart", () => {
  const dateEnd = "2026-08-01T00:00:00.000Z";
  const before = Date.now();
  const result = normalizePromotionDates(dateEnd);
  const after = Date.now();

  assertStrictEqual(result.dateEnd.toISOString(), dateEnd);

  const startTs = result.dateStart.getTime();
  if (startTs < before || startTs > after) {
    throw new Error("dateStart должен быть установлен во время вызова функции");
  }
});

runTest("normalizePromotionDates корректно преобразует переданный dateStart", () => {
  const dateStart = "2026-07-01T00:00:00.000Z";
  const dateEnd = "2026-08-01T00:00:00.000Z";
  const result = normalizePromotionDates(dateEnd, dateStart);

  assertStrictEqual(result.dateStart.toISOString(), dateStart);
  assertStrictEqual(result.dateEnd.toISOString(), dateEnd);
});
