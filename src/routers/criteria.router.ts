import { Router } from "express";
import { prismaClient } from "../db";

const router = Router();

router.get("/", async (req, res) => {
  const criteriaRepo = prismaClient.criteria;
  const criteriaList = await criteriaRepo.findMany({
    orderBy: { name: "asc" },
  });

  res.json({ data: criteriaList });
});

export const criteriaRouter = router;
