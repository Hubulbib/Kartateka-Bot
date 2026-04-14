import { parse } from "@telegram-apps/init-data-node";
import { NextFunction, Request, Response } from "express";
import { prismaClient } from "../db";

/**
 * Middleware аутентификации запросов из Telegram WebApp.
 *
 * Алгоритм:
 * 1) пропускает preflight-запросы OPTIONS;
 * 2) извлекает init-data из заголовка x-telegram-init-data;
 * 3) декодирует и валидирует данные пользователя Telegram;
 * 4) находит пользователя в БД или создает его при первом входе;
 * 5) сохраняет данные пользователя в req и передает управление дальше.
 *
 * @returns 401 при отсутствии или невалидности init-data.
 */
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
    // Telegram может передавать init-data в URL-encoded формате.
    const decodedInitData = decodeURIComponent(initData);
    const parsedData = parse(decodedInitData);

    if (!parsedData.user) {
      return res.status(401).end();
    }

    const userRepo = prismaClient.user;

    // Ленивое создание пользователя обеспечивает регистрацию "по факту первого запроса".
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
