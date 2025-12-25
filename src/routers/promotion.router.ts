import { Router } from "express";
import { prismaClient } from "../db";
import { Promotion } from "@prisma/client";
import { ImageService } from "../services/image";
import multer from "multer";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post(
  "/:id/promotions",
  upload.array("files"),
  async (req, res, next) => {
    const { id } = req.params;
    const files = req.files;
    const promotionData: Omit<
      Promotion,
      "id" | "createdAt" | "updatedAt" | "cafeId" | "media" | "dateStart"
    > & { dateStart?: Date } = req.body;

    const cafeRepo = prismaClient.cafe,
      promotionRepo = prismaClient.promotion;

    const cafe = await cafeRepo.findFirst({ where: { id: +id } });
    if (!cafe) {
      res.status(404).end();
      return;
    }

    if (!Array.isArray(files)) {
      res.status(400).end();
      return;
    }

    const media = await Promise.all(
      files.map(
        async (el) => await ImageService.saveImage(el, +req["user"]["id"])
      )
    );

    const promotion = await promotionRepo.create({
      data: {
        ...promotionData,
        dateEnd: new Date(promotionData.dateEnd),
        dateStart: promotionData.dateStart
          ? new Date(promotionData.dateStart)
          : new Date(),
        media: media.map((el) => el.file_id),
        cafe: { connect: { id: cafe.id } },
      },
    });

    res.json({ data: promotion });
  }
);

router.get("/:id/promotions", async (req, res, next) => {
  const { id } = req.params;

  const cafeRepo = prismaClient.cafe,
    promotionRepo = prismaClient.promotion;

  const cafe = await cafeRepo.findFirst({ where: { id: +id } });
  if (!cafe) {
    res.status(404).end();
    return;
  }

  const promotions = await promotionRepo.findMany({
    where: { cafeId: cafe.id },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    data: await Promise.all(
      promotions.map(async (el) => ({
        ...el,
        media: await Promise.all(
          el.media.map(async (el) => await ImageService.getImage(el))
        ),
      }))
    ),
  });
});

router.get("/:id/promotions/:pid", async (req, res, next) => {
  const { id, pid } = req.params;

  const cafeRepo = prismaClient.cafe,
    promotionRepo = prismaClient.promotion;

  const cafe = await cafeRepo.findFirst({ where: { id: +id } });
  if (!cafe) {
    res.status(404).end();
    return;
  }

  const promotion = await promotionRepo.findFirst({
    where: { id: +pid },
    include: { cafe: true },
  });
  if (!promotion) {
    res.status(404).end();
    return;
  }

  res.json({
    data: {
      ...promotion,
      media: await Promise.all(
        promotion.media.map(async (el) => ImageService.getImage(el))
      ),
      cafe: {
        ...promotion.cafe,
        avatar: await ImageService.getImage(cafe.avatar),
      },
    },
  });
});

router.put(
  "/:id/promotions/:pid",
  upload.array("files"),
  async (req, res, next) => {
    const { id, pid } = req.params;
    const files = req.files;
    const promotionData: Omit<
      Promotion,
      "id" | "createdAt" | "updatedAt" | "cafeId" | "media" | "dateStart"
    > & { dateStart?: Date } = req.body;

    const cafeRepo = prismaClient.cafe,
      promotionRepo = prismaClient.promotion;

    const cafe = await cafeRepo.findFirst({ where: { id: +id } });
    if (!cafe) {
      res.status(404).end();
      return;
    }

    const promotion = await promotionRepo.findFirst({
      where: { id: +pid },
    });
    if (!promotion) {
      res.status(404).end();
      return;
    }

    if (!Array.isArray(files)) {
      res.status(400).end();
      return;
    }

    const media = await Promise.all(
      files.map(
        async (el) => await ImageService.saveImage(el, +req["user"]["id"])
      )
    );

    const newPromotion = await promotionRepo.update({
      where: { id: promotion.id },
      data: {
        ...promotionData,
        media: media.map((el) => el.file_id),
        dateStart: new Date(promotionData.dateStart),
        dateEnd: new Date(promotionData.dateEnd),
      },
      include: { cafe: true },
    });

    newPromotion.cafe.avatar = await ImageService.getImage(
      newPromotion.cafe.avatar
    );
    newPromotion.media = await Promise.all(
      newPromotion.media.map(async (m) => await ImageService.getImage(m))
    );

    res.json({ data: { ...newPromotion } });
  }
);

router.delete("/:id/promotions/:pid", async (req, res, next) => {
  const { id, pid } = req.params;

  const cafeRepo = prismaClient.cafe,
    promotionRepo = prismaClient.promotion;

  const cafe = await cafeRepo.findFirst({ where: { id: +id } });
  if (!cafe) {
    res.status(404).end();
    return;
  }

  const promotion = await promotionRepo.findFirst({
    where: { id: +pid },
  });
  if (!promotion) {
    res.status(404).end();
    return;
  }

  await promotionRepo.delete({
    where: { id: promotion.id },
  });

  res.status(200).end();
});

export const promotionRouter = router;
