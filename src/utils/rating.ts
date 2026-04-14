import { ReviewStatus } from "@prisma/client";

type ReviewCriteria = {
  criteriaId: number;
  mark: number;
};

type ReviewLike = {
  status: ReviewStatus;
  criteria: ReviewCriteria[];
};

type UserCriteriaLike = {
  criteriaId: number;
  weight: number;
};

/**
 * Рассчитывает среднюю оценку заведения по одобренным отзывам.
 * В расчет включаются только отзывы, где оценено минимум 2 критерия.
 */
export const calculatePublicCafeScore = (reviews: ReviewLike[]): number => {
  const approvedReviews = reviews.filter(
    (review) => review.status === ReviewStatus.APPROVED
  );

  let totalScore = 0;
  let validReviewsCount = 0;

  for (const review of approvedReviews) {
    if (review.criteria.length < 2) {
      continue;
    }

    const reviewScore =
      review.criteria.reduce((sum, criterion) => sum + criterion.mark, 0) /
      review.criteria.length;

    totalScore += reviewScore;
    validReviewsCount += 1;
  }

  return validReviewsCount > 0 ? totalScore / validReviewsCount : 0;
};

/**
 * Рассчитывает персональный рейтинг заведения на основе весов пользователя.
 * Учитываются только одобренные отзывы с минимум 2 релевантными критериями.
 */
export const calculatePersonalCafeScore = (
  reviews: ReviewLike[],
  userCriteria: UserCriteriaLike[]
): number => {
  const approvedReviews = reviews.filter(
    (review) => review.status === ReviewStatus.APPROVED
  );

  let totalWeightedScore = 0;
  let totalEffectiveReviews = 0;

  for (const review of approvedReviews) {
    let reviewWeightedScore = 0;
    let reviewTotalWeight = 0;
    let relevantCriteriaCount = 0;

    for (const criterion of review.criteria) {
      const userCriterion = userCriteria.find(
        (item) => item.criteriaId === criterion.criteriaId
      );

      if (!userCriterion) {
        continue;
      }

      reviewWeightedScore += criterion.mark * userCriterion.weight;
      reviewTotalWeight += userCriterion.weight;
      relevantCriteriaCount += 1;
    }

    if (relevantCriteriaCount < 2 || reviewTotalWeight === 0) {
      continue;
    }

    totalWeightedScore += reviewWeightedScore / reviewTotalWeight;
    totalEffectiveReviews += 1;
  }

  return totalEffectiveReviews > 0
    ? totalWeightedScore / totalEffectiveReviews
    : 0;
};
