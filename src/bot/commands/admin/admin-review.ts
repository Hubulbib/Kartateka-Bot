import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { AppContext } from "../../../interfaces";
import { AppDataSource } from "../../../services/database";
import { Review } from "../../../entities/review";
import { isAdmin } from "../../bot";

export const setupReviewAdmin = (bot: Bot<AppContext>) => {
  bot.hears("📝 Отзыв", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const keyboard = new Keyboard()
      .text("📝 Редактировать отзыв")
      .row()
      .text("🔙 Назад")
      .resized();
    await ctx.reply("Управление отзывами:", { reply_markup: keyboard });
  });

  bot.callbackQuery("admin_review_back", async (ctx) => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCallbackQuery();
    const keyboard = new Keyboard()
      .text("🏢 Кафе")
      .row()
      .text("🏙️ Город")
      .row()
      .text("📝 Отзыв")
      .row()
      .text("👤 Пользователь")
      .row()
      .text("◀️ Назад")
      .resized();
    await ctx.reply("Выберите сущность для управления:", {
      reply_markup: keyboard,
    });
  });
};
