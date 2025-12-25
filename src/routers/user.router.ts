import { Router } from "express";
import { prismaClient } from "../db";
import { ImageService } from "../services/image";

const router = Router();

router.get("/my", async (req, res) => {
  const userRepo = prismaClient.user;
  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
    include: { city: true, criteria: { include: { criteria: true } } },
  });
  if (!user) {
    res.status(404).end();
    return;
  }
  res.json({ data: { ...user, tgId: user.tgId.toString() } });
});

router.patch("/city", async (req, res) => {
  const { city }: { city: number } = req.body;

  const userRepo = prismaClient.user;
  let user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });
  user = await userRepo.update({
    where: { id: user.id },
    data: {
      city: { connect: { id: +city } },
    },
  });

  res.json({ data: { ...user, tgId: user.tgId.toString() } });
});

router.patch("/criteria", async (req, res) => {
  const criteriaBody: Record<string, number> = req.body;

  const userRepo = prismaClient.user,
    criteriaRepo = prismaClient.criteria;
  let user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });

  const criteriaList = await Promise.all(
    Object.entries(criteriaBody).map(async (el) => ({
      weight: el[1],
      criteria: await criteriaRepo.findUnique({ where: { name: el[0] } }),
    }))
  );

  const result = await prismaClient.$transaction([
    prismaClient.criteriaUser.deleteMany({
      where: { userId: user.id },
    }),
    userRepo.update({
      where: {
        id: user.id,
      },
      data: {
        criteria: {
          createMany: {
            data: criteriaList.map((el) => ({
              weight: el.weight,
              criteriaId: el.criteria.id,
            })),
          },
        },
      },
      include: { criteria: { include: { criteria: true } } },
    }),
  ]);

  user = result[1];

  res.json({ data: { ...user, tgId: user.tgId.toString() } });
});

router.get("/reviews", async (req, res) => {
  const reviewRepo = prismaClient.review;
  const userReviews = await reviewRepo.findMany({
    where: { user: { tgId: req["user"]["id"] } },
    orderBy: { createdAt: "desc" },
    include: { cafe: true, criteria: { include: { criteria: true } } },
  });

  for (const review of userReviews) {
    if (review.cafe) {
      review.cafe.avatar = await ImageService.getImage(review.cafe.avatar);
    }
  }

  res.json({ data: userReviews });
});

export const userRouter = router;
