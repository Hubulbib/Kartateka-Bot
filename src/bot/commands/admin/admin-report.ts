import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { AppContext } from "../../../interfaces";
import { prismaClient } from "../../../db";
import { adminKeyboard } from "../admin";
import { UserRole } from "@prisma/client";
import { getUserRole } from "../../bot";

export const setupReportAdmin = (bot: Bot<AppContext>) => {
  bot.hears("🤬 Жалобы", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) return;
    const keyboard = new Keyboard()
      .text("📝 Просмотр активных жалоб")
      .row()
      .text("🔙 Назад")
      .resized();
    await ctx.reply("Управление жалобами:", { reply_markup: keyboard });
  });

  bot.hears("📝 Просмотр активных жалоб", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) return;
    const reportRepo = prismaClient.report;
    const reports = await reportRepo.findMany({
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    const message = "🤬 Активные жалобы:\n\n";

    const backKeyboard = new Keyboard().text("🔙 Назад").resized();

    await ctx.reply(message, {
      reply_markup: backKeyboard,
    });

    if (reports.length === 0) {
      await ctx.reply("Активных жалоб нет");
      return;
    }

    await Promise.all(
      reports.map(async (report) => {
        const keyboard = new InlineKeyboard().text(
          "✅ Обработать",
          `process_report_${report.id}`
        );

        const userInfo = report.user
          ? `Пользователь: ${report.user.tgId}`
          : "Анонимный пользователь";
        const message = `Тип: ${report.type}\n${userInfo}\nТекст: ${
          report.text || "Нет текста"
        }\nДата: ${report.createdAt.toLocaleDateString()}\n`;

        await ctx.reply(message, {
          reply_markup: keyboard,
        });
      })
    );
  });

  bot.callbackQuery(/^process_report_(\d+)$/, async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) return;
    await ctx.answerCallbackQuery();

    const reportId = parseInt(ctx.match[1]);
    const reportRepo = prismaClient.report;

    const report = await reportRepo.findFirst({ where: { id: reportId } });
    if (!report) {
      await ctx.editMessageText(`❌ Ошибка: жалоба не найдена`, {
        reply_markup: new InlineKeyboard().text(
          "🔙 Назад",
          "admin_report_back"
        ),
      });
      return;
    }

    await reportRepo.delete({ where: { id: reportId } });
    await ctx.reply(`✅ Жалоба "${report.id}" успешно обработана`);
  });

  bot.callbackQuery("admin_report_back", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) return;
    await ctx.answerCallbackQuery();

    await ctx.reply("Выберите сущность для управления:", {
      reply_markup: adminKeyboard,
    });
  });
};
