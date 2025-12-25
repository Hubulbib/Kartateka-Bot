import { Router } from "express";
import { prismaClient } from "../db";
import { ImageService } from "../services/image";
import {
  Cafe,
  CafeInfo,
  ReviewStatus,
  SocialNetworkType,
} from "@prisma/client";
import multer from "multer";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.get("/by-owner", async (req, res, next) => {
  const cafeRepo = prismaClient.cafe,
    userRepo = prismaClient.user;

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });

  if (!user) {
    res.status(404).end();
    return;
  }

  let cafes = await cafeRepo.findMany({
    where: { ownerId: user.id },
    include: { city: true },
  });

  cafes = await Promise.all(
    cafes.map(async (el) => ({
      ...el,
      avatar: await ImageService.getImage(el.avatar),
    }))
  );

  res.json({ data: cafes || [] });
});

router.get("/:id/stats", async (req, res, next) => {
  const { id } = req.params;

  const cafeRepo = prismaClient.cafe,
    postRepo = prismaClient.post,
    promotionRepo = prismaClient.promotion,
    reviewRepo = prismaClient.review,
    editorRepo = prismaClient.editor;
  if (!(await cafeRepo.findFirst({ where: { id: +id } }))) {
    res.status(404).end();
  }

  const totalPosts = (await postRepo.count({ where: { cafeId: +id } })) || 0;
  const totalPromotions =
    (await promotionRepo.count({ where: { cafeId: +id } })) || 0;
  const totalReviews =
    (await reviewRepo.count({ where: { cafeId: +id } })) || 0;
  const totalEditors =
    (await editorRepo.count({ where: { cafeId: +id } })) || 0;

  res.json({
    data: {
      posts: totalPosts,
      promotions: totalPromotions,
      reviews: totalReviews,
      editors: totalEditors,
    },
  });
});

router.get("/catalog", async (req, res, next) => {
  const { city } = req.query;

  if (!(typeof city === "string")) {
    res.status(400).end();
    return;
  }

  const cityRepo = prismaClient.city,
    cafeRepo = prismaClient.cafe;

  if (!(await cityRepo.findUnique({ where: { name: city } }))) {
    res.status(400).end();
    return;
  }

  const cafeList = await cafeRepo.findMany({ where: { city: { name: city } } });

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

  const cafeRepo = prismaClient.cafe,
    userRepo = prismaClient.user;

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
    include: { criteria: true },
  });

  if (!user) {
    res.status(404).end();
    return;
  }

  if (user.criteria.length === 0) {
    res.json({ data: [] });
    return;
  }

  const cafeList = await cafeRepo.findMany({
    include: { reviews: { include: { criteria: true } } },
    where: { city: { name: city } },
  });

  for (const cafe of cafeList) {
    if (cafe.reviews.length === 0) {
      cafe["score"] = 0;
      continue;
    }

    let totalWeightedScore = 0;
    let totalEffectiveWeight = 0;

    for (const review of cafe.reviews.filter(
      (el) => el.status === ReviewStatus.APPROVED
    )) {
      // Для каждого отзыва считаем взвешенную оценку по ТЗ
      const activeRatings = [];
      let reviewTotalWeight = 0;

      // Собираем активные критерии отзыва
      for (const criteriaReview of review.criteria) {
        const userCriterion = user.criteria.find(
          (uc) => uc.criteriaId === criteriaReview.criteriaId
        );
        if (userCriterion) {
          activeRatings.push({
            rating: criteriaReview.mark,
            weight: userCriterion.weight,
          });
          reviewTotalWeight += userCriterion.weight;
        }
      }

      // Если в отзыве есть хотя бы 2 критерия (по ТЗ)
      if (activeRatings.length >= 2 && reviewTotalWeight > 0) {
        const reviewScore = activeRatings.reduce(
          (score, { rating, weight }) => {
            return score + (rating * weight) / reviewTotalWeight;
          },
          0
        );

        totalWeightedScore += reviewScore;
        totalEffectiveWeight += 1; // Каждый отзыв с валидными критериями
      }
    }

    cafe["score"] =
      totalEffectiveWeight > 0 ? totalWeightedScore / totalEffectiveWeight : 0;
  }

  cafeList.sort((a, b) => b["score"] - a["score"]);

  const topCafeList = cafeList.slice(0, 20);

  const resultList = await Promise.all(
    topCafeList.map(async (el) => ({
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

  const cafeRepo = prismaClient.cafe;

  const cafeList = await cafeRepo.findMany({
    include: { reviews: { include: { criteria: true } } },
    where: { city: { name: city } },
  }); //.filter((cafe) => cafe.reviews.length >= 100);

  for (const cafe of cafeList) {
    if (cafe.reviews.length === 0) {
      cafe["score"] = 0;
      continue;
    }

    let totalScore = 0;
    let validReviewsCount = 0;

    for (const review of cafe.reviews.filter(
      (el) => el.status === ReviewStatus.APPROVED
    )) {
      // Учитываем только отзывы с минимум 2 критериями
      if (review.criteria.length >= 2) {
        const reviewScore =
          review.criteria.reduce((sum, cr) => sum + cr.mark, 0) /
          review.criteria.length;
        totalScore += reviewScore;
        validReviewsCount++;
      }
    }

    cafe["score"] = validReviewsCount > 0 ? totalScore / validReviewsCount : 0;
  }

  cafeList.sort((a, b) => b["score"] - a["score"]);

  const topCafeList = cafeList.slice(0, 20);

  const resultList = await Promise.all(
    topCafeList.map(async (el) => ({
      ...el,
      avatar: await ImageService.getImage(el.avatar),
    }))
  );

  res.json({ data: resultList });
});

router.get("/:id", async (req, res, next) => {
  const { id } = req.params;

  const cafeRepo = prismaClient.cafe;
  const cafe = await cafeRepo.findFirst({
    where: { id: +id },
    include: {
      reviews: {
        where: { status: ReviewStatus.APPROVED },
        include: { criteria: { include: { criteria: true } } },
      },
      city: true,
      info: true,
      user: true,
    },
  });

  if (!cafe) {
    res.status(404).end();
    return;
  }

  // Расчет общего рейтинга
  let totalScoreSum = 0;
  let totalScoresCount = 0;

  for (const review of cafe.reviews) {
    for (const criteriaReview of review.criteria) {
      totalScoreSum += criteriaReview.mark;
      totalScoresCount++;
    }
  }

  cafe["score"] = totalScoresCount > 0 ? totalScoreSum / totalScoresCount : 0;

  cafe.reviews.sort((a, b) =>
    new Date(a.createdAt) < new Date(b.createdAt) ? 1 : -1
  );

  res.json({
    data: {
      ...cafe,
      avatar: await ImageService.getImage(cafe.avatar),
      user: cafe.user
        ? { ...cafe.user, tgId: cafe.user.tgId.toString() }
        : null,
    },
  });
});

router.post("/:id/schedules", async (req, res, next) => {
  const { id } = req.params;
  const scheduleData: {
    scheduleMonday: string;
    scheduleTuesday: string;
    scheduleWednesday: string;
    scheduleThursday: string;
    scheduleFriday: string;
    scheduleSaturday: string;
    scheduleSunday: string;
    scheduleNotes: string;
  } = req.body;

  const userRepo = prismaClient.user,
    editorRepo = prismaClient.editor,
    cafeRepo = prismaClient.cafe,
    cafeScheduleRepo = prismaClient.cafeSchedule;

  const cafe = await cafeRepo.findFirst({
    where: { id: +id },
    include: { info: true },
  });

  if (!cafe) {
    res.status(404).end();
    return;
  }

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });
  if (!user) {
    res.status(404).end();
    return;
  }

  const editor = await editorRepo.findUnique({
    where: { userId: user?.id, cafeId: cafe.id },
  });
  if (cafe.ownerId !== user.id && !editor) {
    res.status(403).end();
    return;
  }

  const schedule = await cafeScheduleRepo.create({
    data: { ...scheduleData, cafe: { connect: { id: cafe.id } } },
  });

  res.status(201).json({ data: schedule });
});

router.get("/:id/schedules", async (req, res, next) => {
  const { id } = req.params;
  const cafeRepo = prismaClient.cafe,
    scheduleRepo = prismaClient.cafeSchedule;

  const cafe = await cafeRepo.findFirst({ where: { id: +id } });
  if (!cafe) {
    res.status(404).end();
    return;
  }

  let schedule = await scheduleRepo.findUnique({
    where: { cafeId: cafe.id },
  });
  if (!schedule) {
    schedule = await scheduleRepo.create({
      data: { cafe: { connect: { id: cafe.id } } },
    });
  }
  res.json({ data: schedule });
});

router.patch("/:id/schedules", async (req, res, next) => {
  const { id } = req.params;
  const scheduleData: Partial<{
    scheduleMonday: string;
    scheduleTuesday: string;
    scheduleWednesday: string;
    scheduleThursday: string;
    scheduleFriday: string;
    scheduleSaturday: string;
    scheduleSunday: string;
    scheduleNotes: string;
  }> = req.body;

  const userRepo = prismaClient.user,
    editorRepo = prismaClient.editor,
    cafeRepo = prismaClient.cafe,
    cafeScheduleRepo = prismaClient.cafeSchedule;

  const cafe = await cafeRepo.findFirst({
    where: { id: +id },
    include: { info: true },
  });

  if (!cafe) {
    res.status(404).end();
    return;
  }

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });
  if (!user) {
    res.status(404).end();
    return;
  }

  const editor = await editorRepo.findUnique({
    where: { userId: user?.id, cafeId: cafe.id },
  });
  if (cafe.ownerId !== user.id && !editor) {
    res.status(403).end();
    return;
  }

  const schedule = await cafeScheduleRepo.findFirst({
    where: { cafeId: cafe.id },
  });
  if (!schedule) {
    res.status(404).end();
    return;
  }

  const scheduleNewData: typeof scheduleData = {};
  for (const field in scheduleData) {
    scheduleNewData[field] = scheduleData[field];
  }

  const newSchedule = await cafeScheduleRepo.update({
    where: { id: schedule.id },
    data: { ...scheduleNewData },
  });

  res.json({ data: newSchedule });
});

router.get("/:id/social-networks", async (req, res, next) => {
  const { id } = req.params;
  const cafeRepo = prismaClient.cafe,
    cafeInfoRepo = prismaClient.cafeInfo,
    socialNetworkRepo = prismaClient.socialNetwork;

  const cafe = await cafeRepo.findFirst({
    where: { id: +id },
    include: { info: true },
  });
  if (!cafe) {
    res.status(404).end();
    return;
  }

  let cafeInfo = await cafeInfoRepo.findUnique({
    where: { cafeId: cafe.id },
  });
  if (!cafeInfo) {
    cafeInfo = await cafeInfoRepo.create({
      data: { cafe: { connect: { id: cafe.id } } },
    });
  }

  const socialNetworks = await socialNetworkRepo.findMany({
    where: { cafeInfoId: cafeInfo.id },
  });

  res.json({ data: socialNetworks });
});

router.post("/:id/social-networks", async (req, res, next) => {
  const { id } = req.params;
  const socialNetworkData: {
    type: SocialNetworkType;
    link: string;
  } = req.body;

  const userRepo = prismaClient.user,
    editorRepo = prismaClient.editor,
    cafeRepo = prismaClient.cafe,
    cafeInfoRepo = prismaClient.cafeInfo,
    socialNetworkRepo = prismaClient.socialNetwork;

  const cafe = await cafeRepo.findFirst({
    where: { id: +id },
    include: { info: true },
  });

  if (!cafe) {
    res.status(404).end();
    return;
  }

  if (!cafe.info) {
    await cafeInfoRepo.create({ data: { cafe: { connect: { id: cafe.id } } } });
  }

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });
  if (!user) {
    res.status(404).end();
    return;
  }

  const editor = await editorRepo.findUnique({
    where: { userId: user?.id, cafeId: cafe.id },
  });
  if (cafe.ownerId !== user.id && !editor) {
    res.status(403).end();
    return;
  }

  const socialNetwork = await socialNetworkRepo.create({
    data: { ...socialNetworkData, cafeInfo: { connect: { cafeId: cafe.id } } },
  });

  res.status(201).json({ data: socialNetwork });
});

router.patch("/:id/social-networks", async (req, res, next) => {
  const { id } = req.params;
  const socialNetworkData: {
    type: SocialNetworkType;
    link: string;
  }[] = req.body;

  const userRepo = prismaClient.user,
    editorRepo = prismaClient.editor,
    cafeRepo = prismaClient.cafe,
    cafeInfoRepo = prismaClient.cafeInfo,
    socialNetworkRepo = prismaClient.socialNetwork;

  const cafe = await cafeRepo.findFirst({
    where: { id: +id },
    include: { info: true },
  });

  if (!cafe) {
    res.status(404).end();
    return;
  }

  if (!cafe.info) {
    await cafeInfoRepo.create({ data: { cafe: { connect: { id: cafe.id } } } });
  }

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });
  if (!user) {
    res.status(404).end();
    return;
  }

  const editor = await editorRepo.findUnique({
    where: { userId: user?.id, cafeId: cafe.id },
  });
  if (cafe.ownerId !== user.id && !editor) {
    res.status(403).end();
    return;
  }

  await socialNetworkRepo.deleteMany({ where: { cafeInfoId: cafe.info.id } });
  const socialNetworks = socialNetworkData.map((el) => ({
    ...el,
    cafeInfoId: cafe.info.id,
  }));

  const newSocialNetworks = await socialNetworkRepo.createMany({
    data: socialNetworks,
    skipDuplicates: true,
  });
  res.json({ data: newSocialNetworks });
});

router.post("/:id/bages", async (req, res, next) => {
  const { id } = req.params;
  const bageData: {
    name: string;
  } = req.body;

  const userRepo = prismaClient.user,
    editorRepo = prismaClient.editor,
    cafeRepo = prismaClient.cafe,
    cafeBageRepo = prismaClient.cafeBage;

  const cafe = await cafeRepo.findFirst({
    where: { id: +id },
  });

  if (!cafe) {
    res.status(404).end();
    return;
  }

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });
  if (!user) {
    res.status(404).end();
    return;
  }

  const editor = await editorRepo.findUnique({
    where: { userId: user?.id, cafeId: cafe.id },
  });
  if (cafe.ownerId !== user.id && !editor) {
    res.status(403).end();
    return;
  }

  const bage = await cafeBageRepo.create({
    data: { ...bageData, cafe: { connect: { id: cafe.id } } },
  });

  res.status(201).json({ data: bage });
});

router.patch("/:id/bages/:bid", async (req, res, next) => {
  const { id, bid } = req.params;
  const bageData: Partial<{
    name: string;
  }> = req.body;

  const userRepo = prismaClient.user,
    editorRepo = prismaClient.editor,
    cafeRepo = prismaClient.cafe,
    cafeBageRepo = prismaClient.cafeBage;

  const cafe = await cafeRepo.findFirst({
    where: { id: +id },
    include: { info: true },
  });

  if (!cafe) {
    res.status(404).end();
    return;
  }

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });
  if (!user) {
    res.status(404).end();
    return;
  }

  const editor = await editorRepo.findUnique({
    where: { userId: user?.id, cafeId: cafe.id },
  });
  if (cafe.ownerId !== user.id && !editor) {
    res.status(403).end();
    return;
  }

  const bage = await cafeBageRepo.findFirst({
    where: { id: +bid },
  });
  if (!bage) {
    res.status(404).end();
    return;
  }

  const bageNewData: typeof bageData = {};
  for (const field in bageData) {
    bageNewData[field] = bageData[field];
  }

  const newBage = await cafeBageRepo.update({
    where: { id: bage.id },
    data: { ...bageNewData },
  });

  res.json({ data: newBage });
});

router.put("/:id/editors", async (req, res, next) => {
  const { id } = req.params;
  const editorData: {
    userId: string;
  }[] = req.body;

  const userRepo = prismaClient.user,
    editorRepo = prismaClient.editor,
    cafeRepo = prismaClient.cafe;

  const cafe = await cafeRepo.findFirst({
    where: { id: +id },
  });

  if (!cafe) {
    res.status(404).end();
    return;
  }

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });
  if (!user) {
    res.status(404).end();
    return;
  }

  if (cafe.ownerId !== user.id) {
    res.status(403).end();
    return;
  }

  const editorsUserId = await Promise.all(
    editorData.map(
      async (el) =>
        (
          await userRepo.findUnique({ where: { tgId: +el.userId } })
        ).id
    )
  );

  await editorRepo.deleteMany({ where: { cafeId: cafe.id } });
  const editors = await editorRepo.createMany({
    data: editorsUserId.map((el) => ({ userId: el, cafeId: cafe.id })),
    skipDuplicates: true,
  });

  res.json({ data: editors });
});

router.post("/:id/editors", async (req, res, next) => {
  const { id } = req.params;
  const editorData: {
    userId: number;
  } = req.body;

  const userRepo = prismaClient.user,
    editorRepo = prismaClient.editor,
    cafeRepo = prismaClient.cafe;

  const cafe = await cafeRepo.findFirst({
    where: { id: +id },
  });

  if (!cafe) {
    res.status(404).end();
    return;
  }

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });
  if (!user) {
    res.status(404).end();
    return;
  }

  if (cafe.ownerId !== user.id) {
    res.status(403).end();
    return;
  }

  const editor = await editorRepo.create({
    data: {
      cafe: { connect: { id: cafe.id } },
      user: { connect: { id: editorData.userId } },
    },
  });

  res.status(201).json({ data: editor });
});

router.delete("/:id/editors/:eid", async (req, res, next) => {
  const { id, eid } = req.params;

  const userRepo = prismaClient.user,
    editorRepo = prismaClient.editor,
    cafeRepo = prismaClient.cafe;

  const cafe = await cafeRepo.findFirst({
    where: { id: +id },
    include: { info: true },
  });

  if (!cafe) {
    res.status(404).end();
    return;
  }

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });
  if (!user) {
    res.status(404).end();
    return;
  }

  if (cafe.ownerId !== user.id) {
    res.status(403).end();
    return;
  }

  const editor = await editorRepo.findFirst({ where: { id: +eid } });
  if (!editor) {
    res.status(404).end();
    return;
  }

  await editorRepo.delete({ where: { id: editor.id } });

  res.status(200).end();
});

router.get("/:id/editors", async (req, res, next) => {
  const { id } = req.params;

  const cafeRepo = prismaClient.cafe,
    editorRepo = prismaClient.editor;
  if (!(await cafeRepo.findFirst({ where: { id: +id } }))) {
    res.status(404).end();
  }

  const editors = await editorRepo.findMany({
    where: { cafeId: +id },
    include: { user: { select: { tgId: true } } },
  });
  res.json({
    data: editors.map((el) => ({
      ...el,
      user: { ...el.user, tgId: el.user.tgId.toString() },
    })),
  });
});

router.patch("/:id/avatar", upload.single("avatar"), async (req, res, next) => {
  const { id } = req.params;
  const file = req.file;

  const userRepo = prismaClient.user,
    cafeRepo = prismaClient.cafe,
    editorRepo = prismaClient.editor;

  if (!file) {
    res.status(400).end();
    return;
  }

  const cafe = await cafeRepo.findFirst({ where: { id: +id } });
  if (!cafe) {
    res.status(404).end();
    return;
  }

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });
  if (!user) {
    res.status(404).end();
    return;
  }

  const editor = await editorRepo.findUnique({
    where: { userId: user.id, cafeId: cafe.id },
  });
  if (cafe.ownerId !== user.id && !editor) {
    res.status(403).end();
    return;
  }

  const photo = await ImageService.saveImage(file, +req["user"]["id"]);

  await cafeRepo.update({
    where: { id: cafe.id },
    data: { avatar: photo.file_id },
  });

  res.json({ data: { avatar: await ImageService.getImage(photo.file_id) } });
});

router.patch("/:id", async (req, res, next) => {
  const { id } = req.params;
  const cafeData: Partial<
    Omit<Cafe, "id" | "cityId" | "ownerId" | "createdAt" | "updatedAt"> & {
      info: Omit<CafeInfo, "id" | "cafeId">;
    }
  > = req.body;

  const userRepo = prismaClient.user,
    editorRepo = prismaClient.editor,
    cafeRepo = prismaClient.cafe,
    cafeInfoRepo = prismaClient.cafeInfo;
  const cafe = await cafeRepo.findFirst({
    where: { id: +id },
    include: { info: true },
  });
  const cafeInfo = await cafeInfoRepo.findUnique({
    where: { cafeId: cafe.id },
  });

  const user = await userRepo.findUnique({
    where: { tgId: req["user"]["id"] },
  });
  if (!user) {
    res.status(404).end();
    return;
  }
  const editor = await editorRepo.findUnique({
    where: { userId: user?.id, cafeId: cafe.id },
  });
  if (cafe.ownerId !== user.id && !editor) {
    res.status(403).end();
    return;
  }

  if (!cafe) {
    res.status(401).end();
    return;
  }

  const cafeNewData: Partial<
      Omit<Cafe, "id" | "cityId" | "ownerId" | "createdAt" | "updatedAt">
    > = {},
    cafeInfoNewData: Partial<Omit<CafeInfo, "id" | "cafeId">> = {};

  for (const field in cafeData) {
    if (field === "info") {
      for (const infoField in cafeData.info) {
        cafeInfoNewData[infoField] = cafeData.info[infoField];
      }
      continue;
    }
    cafeNewData[field] = cafeData[field];
  }

  if (!cafeInfo) {
    await cafeInfoRepo.create({
      data: {
        phones: [],
        ...cafeInfoNewData,
        cafe: { connect: { id: cafe.id } },
      },
    });
  } else {
    await cafeInfoRepo.update({
      where: { cafeId: +id },
      data: cafeInfoNewData,
    });
  }
  const newCafe = await cafeRepo.update({
    where: { id: +id },
    data: cafeNewData,
    include: { info: true },
  });

  res.json({
    data: { ...newCafe, avatar: await ImageService.getImage(newCafe.avatar) },
  });
});

export const cafeRouter = router;
