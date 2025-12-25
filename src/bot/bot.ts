import { Bot, InlineKeyboard } from "grammy";
import { AppContext } from "../interfaces";
import { getMainMenu } from "./commands/menu";
import { prismaClient } from "../db";
import { CONSTANTS } from "../const";
import { setupAdminCommands } from "./commands/admin";
import { adminEventsInit } from "./events/admin";
import { UserRole } from "@prisma/client";

export const getUserRole = async (ctx: AppContext) => {
  const userRepo = prismaClient.user;
  const user = await userRepo.findUnique({ where: { tgId: ctx.from.id } });
  return user?.role || UserRole.BASIC;
};

export const setupBot = async (bot: Bot<AppContext>) => {
  // Инициализация сервисов

  // Настройка меню
  // await setupMenu(bot);

  // Приветственное сообщение
  bot.command("start", async (ctx) => {
    const userRepo = prismaClient.user;

    let user = await userRepo.findUnique({ where: { tgId: ctx.from.id } });
    if (!user) {
      user = await userRepo.create({
        data: {
          tgId: ctx.from.id,
        },
      });
    }

    await ctx.reply(CONSTANTS.HELLO_TEXT, {
      parse_mode: "HTML",
      reply_markup: getMainMenu(await getUserRole(ctx)),
    });

    await ctx.reply("Выберите действие: ", {
      reply_markup: getMainMenu(await getUserRole(ctx)),
    });
  });

  bot.hears("ℹ️ О нас", async (ctx) => {
    await ctx.reply(CONSTANTS.ABOUT_TEXT, { parse_mode: "HTML" });
  });

  bot.hears("🧑‍💻 Поддержка", async (ctx) => {
    await ctx.reply(CONSTANTS.SUPPORT_TEXT, { parse_mode: "HTML" });
  });

  bot.hears("🏢 Мои кафе", async (ctx) => {
    const keyboard = new InlineKeyboard().webApp(
      "🏢 Бизнес-панель",
      process.env.BUSINESS_WEB_APP_URL!
    );
    await ctx.reply("Нажмите ниже, чтобы перейти в бизнес-панель", {
      reply_markup: keyboard,
    });
  });

  bot.hears("◀️ Назад", async (ctx) => {
    await ctx.reply("Главное меню:", {
      reply_markup: getMainMenu(await getUserRole(ctx)),
    });
  });

  // Добавляем обработчик для кнопки "Назад в меню"
  bot.callbackQuery("back_to_menu", async (ctx) => {
    await ctx.answerCallbackQuery();

    await ctx.editMessageText("Главное меню:");

    await ctx.reply("Выберите действие: ", {
      reply_markup: getMainMenu(await getUserRole(ctx)),
    });
  });

  // Настройка команд
  await setupAdminCommands(bot);

  bot.on("message", async (ctx, next) => {
    const userRole = await getUserRole(ctx);
    if (userRole === UserRole.ADMIN && ctx.session.adminAction) {
      await adminEventsInit(ctx, true);
      return next();
    } else {
      await ctx.reply("Выберите действие:", {
        reply_markup: getMainMenu(userRole),
      });
      return next();
    }
  });

  // Обработка ошибок
  bot.catch((err) => {
    console.error("Ошибка бота:", err);
  });
};
