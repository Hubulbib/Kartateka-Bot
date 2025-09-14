import "dotenv/config";
import "reflect-metadata";
import { Bot, session, webhookCallback } from "grammy";
import { DatabaseService } from "./services/database";
import { setupBot } from "./bot/bot";
import { AppContext, SessionData } from "./interfaces";
import express from "express";
import cors from "cors";
import { authMiddleware } from "./middleware/auth.middleware";
import { asyncHandler } from "./utils/asyncHandler";
import { cafeRouter } from "./routers/cafe.router";
import { userRouter } from "./routers/user.router";
import { cityRouter } from "./routers/city,router";

async function bootstrap() {
  const app = express();
  const PORT = +process.env.PORT;

  // Создание экземпляра бота
  const bot = new Bot<AppContext>(process.env.TELEGRAM_BOT_TOKEN!);

  // Инициализация базы данных
  const databaseService = new DatabaseService();
  await databaseService.initialize();

  // Настройка сессии
  bot.use(
    session({
      initial: (): SessionData => ({
        cafeData: undefined,
        cityData: undefined,
        reviewData: undefined,
        userData: undefined,
      }),
    })
  );

  // Настройка бота
  await setupBot(bot);

  app.use(express.json());
  app.use("/api/bot", webhookCallback(bot, "express"));
  app.use(cors({ origin: process.env.WEB_APP_URL || "*" }));
  app.use(asyncHandler(authMiddleware));
  app.use("/api/cafe", cafeRouter);
  app.use("/api/users", userRouter);
  app.use("/api/cities", cityRouter);

  // Запуск бота
  //bot.start();
  //console.log("Bot is running...");

  // Глобальный обработчик ошибок (после всех роутов!)
  app.use((err, req, res, next) => {
    console.error("Глобальная ошибка:", err);

    if (res.headersSent) {
      return next(err);
    }

    res.status(500).json({
      error: "Внутренняя ошибка сервера",
      details: process.env.NODE_ENV === "development" ? err : undefined,
    });
  });

  app.listen(PORT, () => console.log(`Server has been started on ${PORT}`));

  // Обработка завершения работы
  process.once("SIGINT", () => bot.stop());
  process.once("SIGTERM", () => bot.stop());
}

bootstrap().catch(console.error);
