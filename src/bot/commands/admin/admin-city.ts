import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { AppContext } from "../../../interfaces";
import { prismaClient } from "../../../db";
import { getUserRole } from "../../bot";
import { adminKeyboard } from "../admin";
import { UserRole } from "@prisma/client";

export const setupCityAdmin = (bot: Bot<AppContext>) => {
  bot.hears("🏙️ Город", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }
    const keyboard = new Keyboard()
      .text("➕ Добавить город")
      .row()
      .text("📝 Редактировать город")
      .row()
      .text("🔙 Назад")
      .resized();
    await ctx.reply("Управление городами:", { reply_markup: keyboard });
  });

  // Добавление города
  bot.hears("➕ Добавить город", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }

    ctx.session.adminAction = "add_city";
    await ctx.reply("Введите название нового города:");
  });

  // Просмотр и редактирование городов
  bot.hears("📝 Редактировать город", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }

    const cityRepo = prismaClient.city;
    const cities = await cityRepo.findMany({
      include: { cafe: true, user: true },
    });

    const message = "🏙 Список городов:\n\n";

    const backKeyboard = new Keyboard().text("🔙 Назад").resized();

    await ctx.reply(message, {
      reply_markup: backKeyboard,
    });

    await Promise.all(
      cities.map(async (city) => {
        const keyboard = new InlineKeyboard()
          .text("✏️ Редактировать", `edit_city_${city.id}`)
          .text("🗑 Удалить", `delete_city_${city.id}`);

        const message = `${city.name} (кафе: ${city.cafe.length}, пользователей: ${city.user.length})\n`;

        await ctx.reply(message, {
          reply_markup: keyboard,
        });
      })
    );
  });

  // Обработчик редактирования города
  bot.callbackQuery(/^edit_city_(\d+)$/, async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }
    await ctx.answerCallbackQuery();

    const cityId = parseInt(ctx.match[1]);
    const cityRepo = prismaClient.city;
    const city = await cityRepo.findFirst({ where: { id: cityId } });

    if (city) {
      ctx.session.adminAction = "edit_city";
      ctx.session.adminEditingCityId = cityId;

      await ctx.editMessageText(
        `Редактирование города "${city.name}"\nВведите новое название:`
      );
    }
  });

  // Обработчик удаления города
  bot.callbackQuery(/^delete_city_(\d+)$/, async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }
    await ctx.answerCallbackQuery();

    const cityId = parseInt(ctx.match[1]);
    const cityRepo = prismaClient.city;
    const city = await cityRepo.findFirst({
      where: { id: cityId },
      include: { cafe: true, user: true },
    });

    if (city) {
      if (city.cafe.length > 0 || city.user.length > 0) {
        await ctx.editMessageText(
          `❌ Невозможно удалить город "${city.name}"\n` +
            `Связанные данные:\n` +
            `- Кафе: ${city.cafe.length}\n` +
            `- Пользователи: ${city.user.length}`,
          {
            reply_markup: new InlineKeyboard().text("🔙 Назад", "admin_cities"),
          }
        );
        return;
      }

      await cityRepo.delete({ where: { id: cityId } });
      await ctx.reply(`✅ Город "${city.name}" успешно удален`);
    }
  });

  bot.callbackQuery("admin_city_back", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }
    await ctx.answerCallbackQuery();

    await ctx.reply("Выберите сущность для управления:", {
      reply_markup: adminKeyboard,
    });
  });
};
