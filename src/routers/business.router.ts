import { SocialNetworkRequest } from "@prisma/client";
import { Router } from "express";
import { prismaClient } from "../db";
import { canCreateBusinessRequestByCooldown } from "../utils/business-rules";

const router = Router();

/**
 * Роутер заявок на подтверждение владения заведением.
 */
router.get("/", async (req, res, next) => {
  const userRepo = prismaClient.user,
    businessRequestRepo = prismaClient.businessRequest;

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });
  if (!user) {
    res.status(401);
    return;
  }

  // Оставляем только последнюю заявку для каждого названия заведения.
  const latestRequests = await businessRequestRepo.groupBy({
    by: ["cafeName"],
    where: { ownerId: user.id },
    _max: {
      createdAt: true,
    },
  });

  const businessRequests = await Promise.all(
    latestRequests.map(async (request) => {
      return await businessRequestRepo.findFirst({
        where: {
          ownerId: user.id,
          cafeName: request.cafeName,
          createdAt: request._max.createdAt,
        },
      });
    })
  );

  res.json({ data: businessRequests });
});

router.post("/request", async (req, res, next) => {
  const {
    cafeName,
    cafeUsername,
    socialNetwork,
  }: {
    cafeName: string;
    cafeUsername: string;
    socialNetwork: SocialNetworkRequest;
  } = req.body;

  const userRepo = prismaClient.user,
    businessRequestRepo = prismaClient.businessRequest;

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });
  if (!user) {
    res.status(401);
    return;
  }

  // Защита от спама: не более одной заявки в 24 часа.
  const now = new Date();
  const latestRequest = await businessRequestRepo.findFirst({
    where: {
      ownerId: user.id,
      createdAt: {
        gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
  if (!canCreateBusinessRequestByCooldown(latestRequest?.createdAt || null, now, 24)) {
    res.status(400);
    return;
  }
  const businessRequest = await businessRequestRepo.create({
    data: {
      cafeName,
      cafeUsername,
      socialNetwork,
      owner: { connect: { id: user.id } },
    },
  });

  res.status(201).json({ data: businessRequest });
});

export const businessRouter = router;
