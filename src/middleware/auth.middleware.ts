import { parse } from "@telegram-apps/init-data-node";
import { NextFunction, Request, Response } from "express";
import { AppDataSource } from "../services/database";
import { User } from "../entities/user";

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const initData = req.headers["x-telegram-init-data"] as string;

  if (!initData) {
    return res.status(401);
  }

  try {
    // Декодируем URL-encoded строку перед парсингом
    const decodedInitData = decodeURIComponent(initData);
    const parsedData = parse(decodedInitData);

    if (!parsedData.user) {
      return res.status(401);
    }

    const userRepo = AppDataSource.getRepository(User);

    let user = await userRepo.findOne({
      where: { tgId: parsedData.user.id },
    });
    if (!user) {
      user = userRepo.create({
        tgId: parsedData.user.id,
        criteria: { aroma: 1.0, atmosphere: 1.3, speed: 1.5, taste: 1.7 },
      });
      await userRepo.save(user);
    }

    req["user"] = parsedData.user;
    next();
  } catch (err) {
    return res.status(401).json({ err });
  }
};
