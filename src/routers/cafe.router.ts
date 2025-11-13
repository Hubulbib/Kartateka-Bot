import { Router } from "express";
import { prismaClient } from "../db";
import { ImageService } from "../services/image";
import { checkToxic } from "../utils/helpers";
import { ReviewStatus } from "@prisma/client";

const router = Router();

router.get("/catalog", async (req, res, next) => {
  const { city } = req.query;

  if (!(typeof city === "string")) {
    res.status(400).end();
    return;
  }

  const cityRepo = prismaClient.city,
    cafeRepo = prismaClient.cafe;

  if (!(await cityRepo.findUnique({ where: { name: city } }))) {
    res.status(400).end();
    return;
  }

  const cafeList = await cafeRepo.findMany({ where: { city: { name: city } } });

  res.json({
    data: await Promise.all(
      cafeList.map(async (el) => ({
        ...el,
        avatar: await ImageService.getImage(el.avatar),
      }))
    ),
  });
});

router.get("/rating/personal", async (req, res, next) => {
  const { city } = req.query;

  if (!(typeof city === "string")) {
    res.status(400).end();
    return;
  }

  const cafeRepo = prismaClient.cafe,
    userRepo = prismaClient.user;

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
    include: { criteria: true },
  });

  if (!user) {
    res.status(404).end();
    return;
  }

  if (user.criteria.length === 0) {
    res.json({ data: [] });
    return;
  }

  const cafeList = await cafeRepo.findMany({
    include: { reviews: { include: { criteria: true } } },
    where: { city: { name: city } },
  });

  for (const cafe of cafeList) {
    if (cafe.reviews.length === 0) {
      cafe["score"] = 0;
      continue;
    }

    let totalWeightedScore = 0;
    let totalEffectiveWeight = 0;

    for (const review of cafe.reviews.filter(
      (el) => el.status === ReviewStatus.APPROVED
    )) {
      // Для каждого отзыва считаем взвешенную оценку по ТЗ
      const activeRatings = [];
      let reviewTotalWeight = 0;

      // Собираем активные критерии отзыва
      for (const criteriaReview of review.criteria) {
        const userCriterion = user.criteria.find(
          (uc) => uc.criteriaId === criteriaReview.criteriaId
        );
        if (userCriterion) {
          activeRatings.push({
            rating: criteriaReview.mark,
            weight: userCriterion.weight,
          });
          reviewTotalWeight += userCriterion.weight;
        }
      }

      // Если в отзыве есть хотя бы 2 критерия (по ТЗ)
      if (activeRatings.length >= 2 && reviewTotalWeight > 0) {
        const reviewScore = activeRatings.reduce(
          (score, { rating, weight }) => {
            return score + (rating * weight) / reviewTotalWeight;
          },
          0
        );

        totalWeightedScore += reviewScore;
        totalEffectiveWeight += 1; // Каждый отзыв с валидными критериями
      }
    }

    cafe["score"] =
      totalEffectiveWeight > 0 ? totalWeightedScore / totalEffectiveWeight : 0;
  }

  cafeList.sort((a, b) => b["score"] - a["score"]);

  const resultList = await Promise.all(
    cafeList.map(async (el) => ({
      ...el,
      avatar: await ImageService.getImage(el.avatar),
    }))
  );

  res.json({ data: resultList });
});

router.get("/rating", async (req, res, next) => {
  const { city } = req.query;

  if (!(typeof city === "string")) {
    res.status(400).end();
    return;
  }

  const cafeRepo = prismaClient.cafe;

  const cafeList = await cafeRepo.findMany({
    include: { reviews: { include: { criteria: true } } },
    where: { city: { name: city } },
  }); //.filter((cafe) => cafe.reviews.length >= 100);

  for (const cafe of cafeList) {
    if (cafe.reviews.length === 0) {
      cafe["score"] = 0;
      continue;
    }

    let totalScore = 0;
    let validReviewsCount = 0;

    for (const review of cafe.reviews.filter(
      (el) => el.status === ReviewStatus.APPROVED
    )) {
      // Учитываем только отзывы с минимум 2 критериями
      if (review.criteria.length >= 2) {
        const reviewScore =
          review.criteria.reduce((sum, cr) => sum + cr.mark, 0) /
          review.criteria.length;
        totalScore += reviewScore;
        validReviewsCount++;
      }
    }

    cafe["score"] = validReviewsCount > 0 ? totalScore / validReviewsCount : 0;
  }

  cafeList.sort((a, b) => b["score"] - a["score"]);

  const resultList = await Promise.all(
    cafeList.map(async (el) => ({
      ...el,
      avatar: await ImageService.getImage(el.avatar),
    }))
  );

  res.json({ data: resultList });
});

router.get("/:id", async (req, res, next) => {
  const { id } = req.params;

  const cafeRepo = prismaClient.cafe;
  const cafe = await cafeRepo.findFirst({
    where: { id: +id },
    include: {
      reviews: {
        where: { status: ReviewStatus.APPROVED },
        include: { criteria: { include: { criteria: true } } },
      },
      city: true,
    },
  });

  if (!cafe) {
    res.status(404).end();
    return;
  }

  // Расчет общего рейтинга
  let totalScoreSum = 0;
  let totalScoresCount = 0;

  for (const review of cafe.reviews) {
    for (const criteriaReview of review.criteria) {
      totalScoreSum += criteriaReview.mark;
      totalScoresCount++;
    }
  }

  cafe["score"] = totalScoresCount > 0 ? totalScoreSum / totalScoresCount : 0;

  cafe.reviews.sort((a, b) =>
    new Date(a.createdAt) < new Date(b.createdAt) ? 1 : -1
  );

  res.json({
    data: { ...cafe, avatar: await ImageService.getImage(cafe.avatar) },
  });
});

router.get("/:id/review", async (req, res, next) => {
  const { id } = req.params;

  const reviewRepo = prismaClient.review;

  const reviewList = await reviewRepo.findMany({
    where: { cafe: { id: +id }, status: ReviewStatus.APPROVED },
  });

  res.json({ data: reviewList });
});

router.post("/:id/review", async (req, res, next) => {
  const { id } = req.params;
  const {
    criteria,
    text,
  }: { criteria: { [key: string]: number }[]; text: string } = req.body;

  const reviewRepo = prismaClient.review,
    userRepo = prismaClient.user,
    criteriaRepo = prismaClient.criteria;

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });
  if (!user) {
    res.status(401).end();
    return;
  }

  {
    const twentyFourHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const review = await reviewRepo.findFirst({
      where: {
        user: { tgId: req["user"]["id"] },
        createdAt: { gte: twentyFourHoursAgo, lte: new Date() },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (review) {
      res.status(403).end();
      return;
    }
  }

  if (
    await reviewRepo.findFirst({
      where: {
        user: { tgId: req["user"]["id"] },
        cafe: { id: +id },
      },
    })
  ) {
    res.status(403).end();
    return;
  }

  let status: ReviewStatus;
  const toxicity = await checkToxic(text);
  if (toxicity < 0.3) status = ReviewStatus.APPROVED;
  else if (toxicity >= 0.3 && toxicity < 0.7) status = ReviewStatus.MODERATION;
  else status = ReviewStatus.REJECTED;

  const review = await reviewRepo.create({
    data: {
      text,
      status,
      cafe: { connect: { id: +id } },
      user: { connect: { id: user.id } },
      criteria: {
        createMany: {
          data: await Promise.all(
            criteria.map(async (el) => {
              const key = Object.keys(el)[0],
                value = Object.values(el)[0];
              const criteria = await criteriaRepo.findUnique({
                where: { name: key },
              });
              return {
                mark: value,
                criteriaId: criteria.id,
              };
            })
          ),
        },
      },
    },
    include: { cafe: true },
  });

  res.status(201).json({ data: review });
});

router.patch("/review/:rid", async (req, res, next) => {
  const { rid } = req.params;

  const body: {
    criteria?: { mark: number; criteriaId: number }[];
    text?: string;
  } = req.body;

  const reviewRepo = prismaClient.review;

  {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const review = await reviewRepo.findFirst({
      where: {
        user: { tgId: req["user"]["id"] },
        createdAt: { gte: twentyFourHoursAgo, lte: new Date() },
        id: +rid,
      },
    });

    if (!review) {
      res.status(403).end();
      return;
    }

    if (review.updateCount >= 2) {
      res.status(403).end();
      return;
    }
  }

  let review = await reviewRepo.findFirst({
    where: { id: +rid },
  });

  let status: ReviewStatus = ReviewStatus.APPROVED;
  if (body?.text) {
    const toxicity = await checkToxic(body.text);
    if (toxicity >= 0.3 && toxicity < 0.7) status = ReviewStatus.MODERATION;
    else status = ReviewStatus.REJECTED;
  }

  review = await reviewRepo.update({
    where: { id: review.id },
    data: {
      text: body?.text,
      status,
      criteria: { createMany: { data: body?.criteria.map((el) => el) } },
      updateCount: review.updateCount + 1,
    },
  });

  res.json({ data: review });
});

export const cafeRouter = router;
