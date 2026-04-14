import { ReviewStatus } from "@prisma/client";
import { calculatePersonalCafeScore, calculatePublicCafeScore } from "./rating";

const runTest = (name: string, fn: () => void) => {
  try {
    fn();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    throw error;
  }
};

const assertStrictEqual = (actual: number, expected: number) => {
  if (actual !== expected) {
    throw new Error(`Assertion failed: expected ${expected}, got ${actual}`);
  }
};

const assertAlmostEqual = (
  actual: number,
  expected: number,
  epsilon: number = 1e-9
) => {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`Assertion failed: expected ~${expected}, got ${actual}`);
  }
};

runTest("calculatePublicCafeScore возвращает 0 при отсутствии валидных одобренных отзывов", () => {
  const score = calculatePublicCafeScore([
    {
      status: ReviewStatus.MODERATION,
      criteria: [
        { criteriaId: 1, mark: 10 },
        { criteriaId: 2, mark: 9 },
      ],
    },
    {
      status: ReviewStatus.APPROVED,
      criteria: [{ criteriaId: 1, mark: 8 }],
    },
  ]);

  assertStrictEqual(score, 0);
});

runTest("calculatePublicCafeScore корректно вычисляет среднюю оценку по одобренным отзывам", () => {
  const score = calculatePublicCafeScore([
    {
      status: ReviewStatus.APPROVED,
      criteria: [
        { criteriaId: 1, mark: 8 },
        { criteriaId: 2, mark: 6 },
      ],
    },
    {
      status: ReviewStatus.APPROVED,
      criteria: [
        { criteriaId: 1, mark: 10 },
        { criteriaId: 2, mark: 8 },
      ],
    },
  ]);

  assertStrictEqual(score, 8);
});

runTest(
  "calculatePersonalCafeScore игнорирует отзывы с менее чем 2 релевантными критериями",
  () => {
    const score = calculatePersonalCafeScore(
      [
        {
          status: ReviewStatus.APPROVED,
          criteria: [{ criteriaId: 1, mark: 10 }],
        },
        {
          status: ReviewStatus.APPROVED,
          criteria: [
            { criteriaId: 1, mark: 8 },
            { criteriaId: 2, mark: 6 },
          ],
        },
      ],
      [
        { criteriaId: 1, weight: 2 },
        { criteriaId: 2, weight: 1 },
      ]
    );

    assertStrictEqual(score, (8 * 2 + 6 * 1) / 3);
  }
);

runTest(
  "calculatePersonalCafeScore корректно считает взвешенное среднее по валидным отзывам",
  () => {
    const score = calculatePersonalCafeScore(
      [
        {
          status: ReviewStatus.APPROVED,
          criteria: [
            { criteriaId: 1, mark: 10 },
            { criteriaId: 2, mark: 4 },
          ],
        },
        {
          status: ReviewStatus.APPROVED,
          criteria: [
            { criteriaId: 1, mark: 7 },
            { criteriaId: 2, mark: 7 },
          ],
        },
        {
          status: ReviewStatus.REJECTED,
          criteria: [
            { criteriaId: 1, mark: 1 },
            { criteriaId: 2, mark: 1 },
          ],
        },
      ],
      [
        { criteriaId: 1, weight: 3 },
        { criteriaId: 2, weight: 1 },
      ]
    );

    const firstReviewScore = (10 * 3 + 4 * 1) / 4;
    const secondReviewScore = (7 * 3 + 7 * 1) / 4;
    const expected = (firstReviewScore + secondReviewScore) / 2;

    assertStrictEqual(score, expected);
  }
);

runTest(
  "calculatePersonalCafeScore возвращает 0, если не заданы пользовательские критерии",
  () => {
    const score = calculatePersonalCafeScore(
      [
        {
          status: ReviewStatus.APPROVED,
          criteria: [
            { criteriaId: 1, mark: 10 },
            { criteriaId: 2, mark: 8 },
          ],
        },
      ],
      []
    );

    assertStrictEqual(score, 0);
  }
);

runTest(
  "calculatePersonalCafeScore возвращает 0, если сумма релевантных весов равна нулю",
  () => {
    const score = calculatePersonalCafeScore(
      [
        {
          status: ReviewStatus.APPROVED,
          criteria: [
            { criteriaId: 1, mark: 9 },
            { criteriaId: 2, mark: 7 },
          ],
        },
      ],
      [
        { criteriaId: 1, weight: 0 },
        { criteriaId: 2, weight: 0 },
      ]
    );

    assertStrictEqual(score, 0);
  }
);

runTest(
  "calculatePublicCafeScore игнорирует неодобренные отзывы при расчете",
  () => {
    const score = calculatePublicCafeScore([
      {
        status: ReviewStatus.REJECTED,
        criteria: [
          { criteriaId: 1, mark: 1 },
          { criteriaId: 2, mark: 1 },
        ],
      },
      {
        status: ReviewStatus.APPROVED,
        criteria: [
          { criteriaId: 1, mark: 9 },
          { criteriaId: 2, mark: 7 },
        ],
      },
    ]);

    assertAlmostEqual(score, 8);
  }
);
