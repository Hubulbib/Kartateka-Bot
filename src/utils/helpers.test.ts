import { formatPrice } from "./helpers";

const runTest = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    throw error;
  }
};

const assertStrictEqual = (actual: string, expected: string) => {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected "${expected}", got "${actual}"`);
  }
};

runTest("formatPrice форматирует целое число с двумя знаками после запятой", () => {
  const result = formatPrice(1000);
  assertStrictEqual(result, "1 000,00");
});

runTest("formatPrice корректно форматирует дробное число", () => {
  const result = formatPrice(1234.5);
  assertStrictEqual(result, "1 234,50");
});

runTest("formatPrice сохраняет знак отрицательных чисел", () => {
  const result = formatPrice(-50.1);
  assertStrictEqual(result, "-50,10");
});
