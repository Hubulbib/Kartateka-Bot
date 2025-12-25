import { ReportType } from "@prisma/client";
import { Router } from "express";
import { prismaClient } from "../db";

const router = Router();

router.post("/", async (req, res, next) => {
  const { type, text }: { type: ReportType; text: string } = req.body;

  const reportRepo = prismaClient.report;

  const report = await reportRepo.create({
    data: { type, text, user: { connect: { tgId: req["user"]["id"] } } },
  });

  res.status(201).json({ data: report });
});

router.get("/", async (req, res, next) => {
  const reportRepo = prismaClient.report;

  const reports = await reportRepo.findMany({
    where: { userId: req["user"]["id"] },
    orderBy: { createdAt: "desc" },
  });

  res.json({ data: reports });
});

export const reportRouter = router;
