import { Router } from "express";
import { AppDataSource } from "../services/database";
import { City } from "../entities/city";
import { Cafe } from "../entities/cafe";
import { Review } from "../entities/review";
import { Criteria } from "../entities/types/criteria";
import { Between } from "typeorm";
import { User } from "../entities/user";
import { ImageService } from "../services/image";

const router = Router();

router.get("/catalog", async (req, res, next) => {
  const { city } = req.query;

  if (!(typeof city === "string")) {
    res.status(400).end();
    return;
  }

  const cityRepo = AppDataSource.getRepository(City),
    cafeRepo = AppDataSource.getRepository(Cafe);

  if (!(await cityRepo.findOneBy({ name: city }))) {
    res.status(400).end();
    return;
  }

  const cafeList = await cafeRepo.findBy({ city: { name: city } });

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

  const cafeRepo = AppDataSource.getRepository(Cafe),
    userRepo = AppDataSource.getRepository(User);

  const user = await userRepo.findOneBy({ tgId: req["user"]["id"] });

  if (!user) {
    res.status(404).end();
  }

  const cafeList = await cafeRepo.find({
    relations: { reviews: true },
    where: { reviews: { user: { id: user.id } }, city: { name: city } },
  });

  for (const cafe of cafeList) {
    const aroma = cafe.reviews[0].criteria.aroma,
      taste = cafe.reviews[0].criteria.taste,
      atmosphere = cafe.reviews[0].criteria.atmosphere,
      speed = cafe.reviews[0].criteria.speed;

    const score =
      (user.criteria.aroma * aroma +
        user.criteria.atmosphere * atmosphere +
        user.criteria.speed * speed +
        user.criteria.taste * taste) /
      (user.criteria.aroma +
        user.criteria.atmosphere +
        user.criteria.speed +
        user.criteria.taste || 1);

    cafe["score"] = score;
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

  const cafeRepo = AppDataSource.getRepository(Cafe);

  const cafeList = await cafeRepo.find({
    relations: { reviews: true },
    where: { city: { name: city } },
  }); //.filter((cafe) => cafe.reviews.length >= 100);

  for (const cafe of cafeList) {
    let taste = 0,
      atmosphere = 0,
      speed = 0,
      aroma = 0;
    for (const review of cafe.reviews) {
      aroma += review.criteria.aroma;
      taste += review.criteria.taste;
      atmosphere += review.criteria.atmosphere;
      speed += review.criteria.speed;
    }
    aroma /= cafe.reviews.length || 1;
    taste /= cafe.reviews.length || 1;
    atmosphere /= cafe.reviews.length || 1;
    speed /= cafe.reviews.length || 1;

    cafe["score"] = (aroma + taste + atmosphere + speed) / 4;
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

  const cafeRepo = AppDataSource.getRepository(Cafe);
  const cafe = await cafeRepo.findOne({
    where: { id: +id },
    relations: { reviews: true },
  });

  if (!cafe) {
    res.status(404).end();
    return;
  }

  let taste = 0,
    atmosphere = 0,
    speed = 0,
    aroma = 0;
  for (const review of cafe.reviews) {
    aroma += review.criteria.aroma;
    taste += review.criteria.taste;
    atmosphere += review.criteria.atmosphere;
    speed += review.criteria.speed;
  }
  aroma /= cafe.reviews.length || 1;
  taste /= cafe.reviews.length || 1;
  atmosphere /= cafe.reviews.length || 1;
  speed /= cafe.reviews.length || 1;
  cafe["score"] = (aroma + taste + atmosphere + speed) / 4;

  res.json({
    data: { ...cafe, avatar: await ImageService.getImage(cafe.avatar) },
  });
});

router.get("/:id/review", async (req, res, next) => {
  const { id } = req.params;

  const reviewRepo = AppDataSource.getRepository(Review);

  const reviewList = await reviewRepo.findBy({ cafe: { id: +id } });

  res.json({ data: reviewList });
});

router.post("/:id/review", async (req, res, next) => {
  const { id } = req.params;
  const { criteria, text }: { criteria: Criteria; text: string } = req.body;

  const reviewRepo = AppDataSource.getRepository(Review),
    userRepo = AppDataSource.getRepository(User);

  const user = await userRepo.findOneBy({ tgId: req["user"]["id"] });
  if (!user) {
    res.status(401).end();
    return;
  }

  {
    const twentyFourHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const review = await reviewRepo.findOne({
      where: {
        user: { tgId: req["user"]["id"] },
        createdAt: Between(twentyFourHoursAgo, new Date()),
      },
      order: {
        createdAt: "DESC",
      },
    });

    if (review) {
      res.status(403).end();
      return;
    }
  }

  if (
    await reviewRepo.findOneBy({
      user: { tgId: req["user"]["id"] },
      cafe: { id: +id },
    })
  ) {
    res.status(403).end();
    return;
  }

  const review = reviewRepo.create({
    criteria,
    text,
    cafe: { id: +id },
    user,
  });

  await reviewRepo.save(review);

  res.status(201).json({ data: review });
});

router.patch("/review/:rid", async (req, res, next) => {
  const { rid } = req.params;

  const body: { criteria?: Criteria; text?: string } = req.body;

  const reviewRepo = AppDataSource.getRepository(Review);

  {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const review = await reviewRepo.findOne({
      where: {
        user: { tgId: req["user"]["id"] },
        createdAt: Between(twentyFourHoursAgo, new Date()),
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

  const review = await reviewRepo.findOne({
    where: { id: +rid },
    relations: { cafe: true },
  });

  await reviewRepo.save({
    ...review,
    ...body,
    updateCount: review.updateCount + 1,
  });

  await reviewRepo.update({ id: +rid }, { ...body });

  res.json({ data: review });
});

export const cafeRouter = router;
