import { Router } from "express";
import { AppDataSource } from "../services/database";
import { User } from "../entities/user";
import { Criteria } from "../entities/types/criteria";

const router = Router();

router.get("/my", async (req, res) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOneBy({ tgId: req["user"]["id"] });
  if (!user) {
    res.status(404).end();
    return;
  }
  res.json({ data: user });
});

router.patch("/city", async (req, res) => {
  const { city } = req.body;

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOneBy({ tgId: req["user"]["id"] });
  await userRepo.save({
    ...user,
    city,
  });

  res.json({ data: user });
});

router.patch("/criteria", async (req, res) => {
  const { aroma, atmosphere, speed, taste }: Criteria = req.body;

  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOneBy({ tgId: req["user"]["id"] });
  await userRepo.save({
    ...user,
    criteria: { aroma, atmosphere, speed, taste },
  });

  res.json({ data: user });
});

export const userRouter = router;
