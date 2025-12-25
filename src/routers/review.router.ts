import { Router } from "express";
import { prismaClient } from "../db";
import { checkToxic } from "../utils/helpers";
import { ReviewStatus } from "@prisma/client";

const router = Router();

router.get("/:id/review", async (req, res, next) => {
  const { id } = req.params;

  const reviewRepo = prismaClient.review;

  const reviewList = await reviewRepo.findMany({
    where: { cafe: { id: +id }, status: ReviewStatus.APPROVED },
    include: { criteria: { include: { criteria: true } } },
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

export const reviewRouter = router;
