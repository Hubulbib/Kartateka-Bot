import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { AppContext } from "../../../interfaces";
import { prismaClient } from "../../../db";
import { isAdmin } from "../../bot";

export const setupUserAdmin = (bot: Bot<AppContext>) => {
  bot.hears("👤 Пользователь", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const keyboard = new Keyboard()
      .text("📃 Просмотр пользователя")
      .text("🔙 Назад")
      .resized();
    await ctx.reply("Управление пользователями:", { reply_markup: keyboard });
  });

  bot.hears("📃 Просмотр пользователя", async (ctx) => {
    if (!isAdmin(ctx)) return;
    await sendUserList(ctx, 0);
  });

  bot.callbackQuery(/^admin_user_list_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCallbackQuery();
    const skip = Number(ctx.match[1]);
    await sendUserList(ctx, skip);
  });

  async function sendUserList(ctx: AppContext, skip: number) {
    const userRepo = prismaClient.user;
    const users = await userRepo.findMany({
      orderBy: { id: "asc" },
      take: 10,
      skip,
    });
    const total = await userRepo.count();
    if (users.length === 0) {
      await ctx.reply("Пользователей пока нет");
      return;
    }
    let message = `Пользователи ${skip + 1}-${skip + users.length} из ${total}:
\n`;
    for (const user of users) {
      message += `ID: ${user.id} | TG: ${user.tgId}\n`;
    }
    const keyboard = new InlineKeyboard();
    if (skip + 10 < total) {
      keyboard.text("Следующие 10", `admin_user_list_${skip + 10}`);
    }
    if (skip > 0) {
      keyboard.text(
        "Предыдущие 10",
        `admin_user_list_${Math.max(0, skip - 10)}`
      );
    }
    keyboard.row().text("🔙 Назад", "admin_user_back");
    if (ctx.callbackQuery) {
      await ctx.editMessageText(message, { reply_markup: keyboard });
    } else {
      await ctx.reply(message, { reply_markup: keyboard });
    }
  }

  bot.callbackQuery("admin_user_back", async (ctx) => {
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
