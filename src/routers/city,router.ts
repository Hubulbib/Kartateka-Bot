import { Router } from "express";
import { AppDataSource } from "../services/database";
import { City } from "../entities/city";

const router = Router();

router.get("/", async (req, res) => {
  const cityRepo = AppDataSource.getRepository(City);
  const cities = await cityRepo.find();

  res.json({ data: cities });
});

export const cityRouter = router;
