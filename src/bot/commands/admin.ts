import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { AdminAction, AppContext } from "../../interfaces.js";
import { isAdmin } from "../bot.js";
import { setupCafeAdmin } from "./admin/admin-cafe.js";
import { setupCityAdmin } from "./admin/admin-city.js";
import { setupReviewAdmin } from "./admin/admin-review.js";
import { setupUserAdmin } from "./admin/admin-user.js";
import { Cafe } from "../../entities/cafe.js";
import { City } from "../../entities/city.js";
import { AppDataSource } from "../../services/database.js";
import { handleAddCafe } from "../handlers/admin/admin-cafe.js";

export const setupAdminCommands = async (bot: Bot<AppContext>) => {
  // Команда для входа в админ-панель
  bot.command("admin", async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }

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

  bot.hears("👨‍💼 Админ-панель", async (ctx) => {
    if (!isAdmin(ctx)) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }

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

  setupCafeAdmin(bot);
  setupCityAdmin(bot);
  setupReviewAdmin(bot);
  setupUserAdmin(bot);
};
