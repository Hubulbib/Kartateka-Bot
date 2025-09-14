import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { AdminAction, AppContext } from "../../../interfaces";
import { AppDataSource } from "../../../services/database";
import { City } from "../../../entities/city";
import { isAdmin } from "../../bot";

export const setupCityAdmin = (bot: Bot<AppContext>) => {
  bot.hears("🏙️ Город", async (ctx) => {
    if (!isAdmin(ctx)) return;
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
    if (!isAdmin(ctx)) return;

    ctx.session.adminAction = "add_city";
    await ctx.reply("Введите название нового города:");
  });

  // Просмотр и редактирование городов
  bot.hears("📝 Редактировать город", async (ctx) => {
    if (!isAdmin(ctx)) return;

    const cityRepo = AppDataSource.getRepository(City);
    const cities = await cityRepo.find({
      relations: { cafe: true, users: true },
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

        const message = `${city.name} (кафе: ${city.cafe.length}, пользователей: ${city.users.length})\n`;

        await ctx.reply(message, {
          reply_markup: keyboard,
        });
      })
    );
  });

  // Обработчик редактирования города
  bot.callbackQuery(/^edit_city_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCallbackQuery();

    const cityId = parseInt(ctx.match[1]);
    const cityRepo = AppDataSource.getRepository(City);
    const city = await cityRepo.findOneBy({ id: cityId });

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
    if (!isAdmin(ctx)) return;
    await ctx.answerCallbackQuery();

    const cityId = parseInt(ctx.match[1]);
    const cityRepo = AppDataSource.getRepository(City);
    const city = await cityRepo.findOne({
      where: { id: cityId },
      relations: { cafe: true, users: true },
    });

    if (city) {
      if (city.cafe.length > 0 || city.users.length > 0) {
        await ctx.editMessageText(
          `❌ Невозможно удалить город "${city.name}"\n` +
            `Связанные данные:\n` +
            `- Кафе: ${city.cafe.length}\n` +
            `- Пользователи: ${city.users.length}`,
          {
            reply_markup: new InlineKeyboard().text("🔙 Назад", "admin_cities"),
          }
        );
        return;
      }

      await cityRepo.delete(cityId);
      await ctx.reply(`✅ Город "${city.name}" успешно удален`);
    }
  });

  bot.callbackQuery("admin_city_back", async (ctx) => {
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
