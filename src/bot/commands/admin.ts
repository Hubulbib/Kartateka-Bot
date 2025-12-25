import { Bot, Keyboard } from "grammy";
import { AppContext } from "../../interfaces.js";
import { setupCafeAdmin } from "./admin/admin-cafe.js";
import { setupCityAdmin } from "./admin/admin-city.js";
import { setupReviewAdmin } from "./admin/admin-review.js";
import { setupUserAdmin } from "./admin/admin-user.js";
import { getUserRole } from "../bot.js";
import { UserRole } from "@prisma/client";

export const adminKeyboard = new Keyboard()
  .text("🏢 Кафе")
  .row()
  .text("🏙️ Город")
  .row()
  .text("📝 Отзыв")
  .row()
  .text("👤 Пользователь")
  .row()
  .text("🤬 Жалобы")
  .row()
  .text("⭐ Бизнес-заявки")
  .row()
  .text("◀️ Назад")
  .resized();

export const setupAdminCommands = async (bot: Bot<AppContext>) => {
  // Команда для входа в админ-панель
  bot.command("admin", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }

    await ctx.reply("Выберите сущность для управления:", {
      reply_markup: adminKeyboard,
    });
  });

  bot.hears("👨‍💼 Админ-панель", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }

    await ctx.reply("Выберите сущность для управления:", {
      reply_markup: adminKeyboard,
    });
  });

  setupCafeAdmin(bot);
  setupCityAdmin(bot);
  setupReviewAdmin(bot);
  setupUserAdmin(bot);
};
