import { SocialNetworkRequest } from "@prisma/client";
import { Router } from "express";
import { prismaClient } from "../db";

const router = Router();

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

  if (
    await businessRequestRepo.findFirst({
      where: {
        ownerId: user.id,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    })
  ) {
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
