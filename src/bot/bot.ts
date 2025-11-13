import { Bot } from "grammy";
import { AppContext } from "../interfaces";
import { getMainMenu, setupMenu } from "./commands/menu";
import { prismaClient } from "../db";
import { CONSTANTS } from "../const";
import { setupAdminCommands } from "./commands/admin";
import { adminEventsInit } from "./events/admin";

const ADMIN_IDS = process.env.ADMIN_IDS?.split(",").map(Number) || [];

export const isAdmin = (ctx: AppContext) => {
  return ctx.from && ADMIN_IDS.includes(ctx.from.id);
};

export const setupBot = async (bot: Bot<AppContext>) => {
  // Инициализация сервисов

  // Настройка меню
  // await setupMenu(bot);

  // Приветственное сообщение
  bot.command("start", async (ctx) => {
    const isAdmin = ctx.from && ADMIN_IDS.includes(ctx.from.id);

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
      reply_markup: getMainMenu(isAdmin),
    });
  });

  bot.hears("ℹ️ О нас", async (ctx) => {
    await ctx.reply(CONSTANTS.ABOUT_TEXT, { parse_mode: "HTML" });
  });

  bot.hears("🧑‍💻 Поддержка", async (ctx) => {
    await ctx.reply(CONSTANTS.SUPPORT_TEXT, { parse_mode: "HTML" });
  });

  bot.hears("◀️ Назад", async (ctx) => {
    const isAdmin = ctx.from && ADMIN_IDS.includes(ctx.from.id);

    await ctx.reply("Главное меню:", {
      reply_markup: getMainMenu(isAdmin),
    });
  });

  // Добавляем обработчик для кнопки "Назад в меню"
  bot.callbackQuery("back_to_menu", async (ctx) => {
    await ctx.answerCallbackQuery();

    const isAdmin = ctx.from && ADMIN_IDS.includes(ctx.from.id);

    await ctx.editMessageText("Главное меню:");

    await ctx.reply("Выберите действие: ", {
      reply_markup: getMainMenu(isAdmin),
    });
  });

  // Настройка команд
  await setupAdminCommands(bot);

  bot.on("message", async (ctx, next) => {
    if (isAdmin(ctx) && ctx.session.adminAction) {
      await adminEventsInit(ctx, isAdmin);
      return next();
    } else {
      await ctx.reply("Выберите действие:", {
        reply_markup: getMainMenu(isAdmin(ctx)),
      });
      return next();
    }
  });

  // Обработка ошибок
  bot.catch((err) => {
    console.error("Ошибка бота:", err);
  });
};
