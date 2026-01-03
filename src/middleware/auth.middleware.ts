import { parse } from "@telegram-apps/init-data-node";
import { NextFunction, Request, Response } from "express";
import { prismaClient } from "../db";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  const initData = req.headers["x-telegram-init-data"] as string;

  if (!initData) {
    return res.status(401).end();
  }

  try {
    // Декодируем URL-encoded строку перед парсингом
    const decodedInitData = decodeURIComponent(initData);
    const parsedData = parse(decodedInitData);

    if (!parsedData.user) {
      return res.status(401).end();
    }

    const userRepo = prismaClient.user;

    let user = await userRepo.findUnique({
      where: { tgId: parsedData.user.id },
    });
    if (!user) {
      user = await userRepo.create({
        data: {
          tgId: parsedData.user.id,
        },
      });
    }

    req["user"] = parsedData.user;
    next();
  } catch (err) {
    return res.status(401).json({ err });
  }
};
