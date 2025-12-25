import { Router } from "express";
import { prismaClient } from "../db";
import { Post } from "@prisma/client";
import { ImageService } from "../services/image";
import multer from "multer";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/:id/posts", upload.array("files"), async (req, res, next) => {
  const { id } = req.params;
  const files = req.files;
  const postData: Omit<
    Post,
    "id" | "createdAt" | "updatedAt" | "cafeId" | "media"
  > = req.body;

  const cafeRepo = prismaClient.cafe,
    postRepo = prismaClient.post;

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

  const post = await postRepo.create({
    data: {
      ...postData,
      media: media.map((el) => el.file_id),
      cafe: { connect: { id: cafe.id } },
    },
  });

  res.json({
    data: {
      post,
      media: await Promise.all(
        post.media.map(async (el) => ImageService.getImage(el))
      ),
    },
  });
});

router.get("/:id/posts", async (req, res, next) => {
  const { id } = req.params;

  const cafeRepo = prismaClient.cafe,
    postRepo = prismaClient.post;

  const cafe = await cafeRepo.findFirst({ where: { id: +id } });
  if (!cafe) {
    res.status(404).end();
    return;
  }

  const posts = await postRepo.findMany({
    where: { cafeId: cafe.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({
    data: await Promise.all(
      posts.map(async (el) => ({
        ...el,
        media: await Promise.all(
          el.media.map(async (elMedia) => ImageService.getImage(elMedia))
        ),
      }))
    ),
  });
});

router.get("/:id/posts/:pid", async (req, res, next) => {
  const { id, pid } = req.params;

  const cafeRepo = prismaClient.cafe,
    postRepo = prismaClient.post;

  const cafe = await cafeRepo.findFirst({ where: { id: +id } });
  if (!cafe) {
    res.status(404).end();
    return;
  }

  const post = await postRepo.findFirst({
    where: { id: +pid },
    include: { cafe: true },
  });
  if (!post) {
    res.status(404).end();
    return;
  }

  res.json({
    data: {
      ...post,
      media: await Promise.all(
        post.media.map(async (el) => await ImageService.getImage(el))
      ),
      cafe: {
        ...post.cafe,
        avatar: await ImageService.getImage(post.cafe.avatar),
      },
    },
  });
});

router.put("/:id/posts/:pid", upload.array("files"), async (req, res, next) => {
  const { id, pid } = req.params;
  const files = req.files;
  const postData: Omit<
    Post,
    "id" | "createdAt" | "updatedAt" | "cafeId" | "media"
  > = req.body;

  const cafeRepo = prismaClient.cafe,
    postRepo = prismaClient.post;

  const cafe = await cafeRepo.findFirst({ where: { id: +id } });
  if (!cafe) {
    res.status(404).end();
    return;
  }

  const post = await postRepo.findFirst({
    where: { id: +pid },
    include: { cafe: true },
  });
  if (!post) {
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

  const newPost = await postRepo.update({
    where: { id: post.id },
    data: { ...postData, media: media.map((el) => el.file_id) },
    include: { cafe: true },
  });

  newPost.cafe.avatar = await ImageService.getImage(newPost.cafe.avatar);
  newPost.media = await Promise.all(
    newPost.media.map(async (m) => await ImageService.getImage(m))
  );

  res.json({
    data: newPost,
  });
});

router.delete("/:id/posts/:pid", async (req, res, next) => {
  const { id, pid } = req.params;

  const cafeRepo = prismaClient.cafe,
    postRepo = prismaClient.post;

  const cafe = await cafeRepo.findFirst({ where: { id: +id } });
  if (!cafe) {
    res.status(404).end();
    return;
  }

  const post = await postRepo.findFirst({
    where: { id: +pid },
    include: { cafe: true },
  });
  if (!post) {
    res.status(404).end();
    return;
  }

  await postRepo.delete({
    where: { id: post.id },
  });

  res.status(200).end();
});

export const postRouter = router;
