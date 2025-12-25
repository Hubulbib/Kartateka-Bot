import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { AppContext } from "../../../interfaces";
import { prismaClient } from "../../../db";
import { adminKeyboard } from "../admin";
import { UserRole } from "@prisma/client";
import { getUserRole } from "../../bot";

export const setupReviewAdmin = (bot: Bot<AppContext>) => {
  bot.hears("📝 Отзыв", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) return;
    const keyboard = new Keyboard()
      .text("📝 Редактировать отзыв")
      .row()
      .text("🧑‍💻 Посмотреть отзывы на модерации")
      .row()
      .text("🔙 Назад")
      .resized();
    await ctx.reply("Управление отзывами:", { reply_markup: keyboard });
  });

  bot.hears("🧑‍💻 Посмотреть отзывы на модерации", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) return;
    const reviewRepo = prismaClient.review;
    const reviews = await reviewRepo.findMany({
      where: { status: "MODERATION" },
      orderBy: { createdAt: "desc" },
      include: { user: true, cafe: true },
    });

    const message = "🧑‍💻 Отзывы на модерации:\n\n";

    const backKeyboard = new Keyboard().text("🔙 Назад").resized();

    await ctx.reply(message, {
      reply_markup: backKeyboard,
    });

    if (reviews.length === 0) {
      await ctx.reply("Отзывов на модерации нет");
      return;
    }

    await Promise.all(
      reviews.map(async (review) => {
        const keyboard = new InlineKeyboard()
          .text("✅ Одобрить", `approve_review_${review.id}`)
          .text("❌ Отклонить", `reject_review_${review.id}`);

        const userInfo = review.user
          ? `Пользователь: ${review.user.tgId}`
          : "Анонимный пользователь";
        const cafeInfo = review.cafe
          ? `Кафе: ${review.cafe.name}`
          : "Кафе не указано";
        const message = `${cafeInfo}\n${userInfo}\nТекст: ${
          review.text
        }\nДата: ${review.createdAt.toLocaleDateString()}\n`;

        await ctx.reply(message, {
          reply_markup: keyboard,
        });
      })
    );
  });

  bot.callbackQuery(/^approve_review_(\d+)$/, async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) return;
    await ctx.answerCallbackQuery();

    const reviewId = parseInt(ctx.match[1]);
    const reviewRepo = prismaClient.review;

    const review = await reviewRepo.findFirst({ where: { id: reviewId } });
    if (!review) {
      await ctx.editMessageText(`❌ Ошибка: отзыв не найден`, {
        reply_markup: new InlineKeyboard().text(
          "🔙 Назад",
          "admin_review_back"
        ),
      });
      return;
    }

    await reviewRepo.update({
      where: { id: reviewId },
      data: { status: "APPROVED" },
    });
    await ctx.reply(`✅ Отзыв "${reviewId}" одобрен`);
  });

  bot.callbackQuery(/^reject_review_(\d+)$/, async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) return;
    await ctx.answerCallbackQuery();

    const reviewId = parseInt(ctx.match[1]);
    const reviewRepo = prismaClient.review;

    const review = await reviewRepo.findFirst({ where: { id: reviewId } });
    if (!review) {
      await ctx.editMessageText(`❌ Ошибка: отзыв не найден`, {
        reply_markup: new InlineKeyboard().text(
          "🔙 Назад",
          "admin_review_back"
        ),
      });
      return;
    }

    await reviewRepo.update({
      where: { id: reviewId },
      data: { status: "REJECTED" },
    });
    await ctx.reply(`✅ Отзыв "${review.id}" отклонен`);
  });

  bot.callbackQuery("admin_review_back", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) return;
    await ctx.answerCallbackQuery();

    await ctx.reply("Выберите сущность для управления:", {
      reply_markup: adminKeyboard,
    });
  });
};
