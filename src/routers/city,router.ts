import { Router } from "express";
import { prismaClient } from "../db";

const router = Router();

router.get("/", async (req, res) => {
  const cityRepo = prismaClient.city;
  const cities = await cityRepo.findMany({ orderBy: { name: "asc" } });

  res.json({ data: cities });
});

export const cityRouter = router;
