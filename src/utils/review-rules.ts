import { ReviewStatus } from "@prisma/client";

/**
 * Определяет статус отзыва по коэффициенту токсичности.
 */
export const getReviewStatusByToxicity = (toxicity: number): ReviewStatus => {
  if (toxicity < 0.3) {
    return ReviewStatus.APPROVED;
  }

  if (toxicity < 0.7) {
    return ReviewStatus.MODERATION;
  }

  return ReviewStatus.REJECTED;
};

/**
 * Проверяет ограничение на частоту публикации отзывов.
 * Разрешено не более одного отзыва за интервал в часах.
 */
export const canCreateReviewByCooldown = (
  latestReviewCreatedAt: Date | null,
  now: Date,
  cooldownHours: number = 6
): boolean => {
  if (!latestReviewCreatedAt) {
    return true;
  }

  const cooldownMs = cooldownHours * 60 * 60 * 1000;
  return now.getTime() - latestReviewCreatedAt.getTime() >= cooldownMs;
};
