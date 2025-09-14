import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { type AdminAction, AppContext } from "../../../interfaces";
import { AppDataSource } from "../../../services/database";
import { Cafe } from "../../../entities/cafe";
import { isAdmin } from "../../bot";
import { City } from "../../../entities/city";
import { handleAddCafe } from "../../handlers/admin/admin-cafe";

export const setupCafeAdmin = (bot: Bot<AppContext>) => {
  // Главное меню управления кафе
  bot.hears("🏢 Кафе", async (ctx) => {
    if (!isAdmin(ctx)) return;
    const keyboard = new Keyboard()
      .text("➕ Добавить кафе")
      .row()
      .text("📝 Редактировать кафе")
      .row()
      .text("🔙 Назад")
      .resized();
    await ctx.reply("Управление кафе:", { reply_markup: keyboard });
  });

  // Пошаговое добавление кафе
  bot.hears("➕ Добавить кафе", async (ctx) => {
    if (!isAdmin(ctx)) return;
    ctx.session.adminAction = "add_cafe";
    ctx.session.cafeData = {};
    await ctx.reply("Введите название кафе:");
  });

  bot.callbackQuery("add_cafe_skip_owner", async (ctx) => {
    ctx.session.cafeData.skipOwner = true;
    await handleAddCafe(ctx);
    await ctx.answerCallbackQuery();
  });

  // Просмотр и редактирование кафе
  bot.hears("📝 Редактировать кафе", async (ctx) => {
    if (!isAdmin(ctx)) return;

    const cafeRepo = AppDataSource.getRepository(Cafe);
    const cafes = await cafeRepo.find({
      relations: ["city", "owner"],
      order: { name: "ASC" },
    });

    if (cafes.length === 0) {
      await ctx.reply("Кафе пока нет");
      return;
    }

    const message = "Выберите кафе для редактирования:\n\n";
    const keyboard = new InlineKeyboard();

    cafes.forEach((cafe) => {
      keyboard
        .text(
          `${cafe.name} (${cafe.city?.name || "Без города"})`,
          `edit_cafe_${cafe.id}`
        )
        .row();
    });

    keyboard.text("🔙 Назад", "admin_cafes_back");

    await ctx.reply(message, {
      reply_markup: keyboard,
    });
  });

  // Добавляем обработчик выбора категории
  bot.callbackQuery(/^add_cafe_city_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCallbackQuery();

    const cityId = parseInt(ctx.match[1]);
    const cafeData = ctx.session.cafeData;

    if (cafeData) {
      const cafeRepo = AppDataSource.getRepository(Cafe);
      const cityRepo = AppDataSource.getRepository(City);
      const city = await cityRepo.findOneBy({ id: cityId });

      if (city) {
        const cafe = cafeRepo.create({
          name: cafeData.name,
          description: cafeData.description,
          address: cafeData.address,
          avatar: cafeData.avatar,
          owner: cafeData.owner,
          city: city,
        });

        await cafeRepo.save(cafe);

        // Очищаем данные сессии
        ctx.session.adminAction = undefined;
        ctx.session.cafeData = undefined;

        const keyboard = new Keyboard().text("🔙 Назад").resized();

        await ctx.reply(
          `✅ Кафе "${cafe.name}" успешно добавлено в город "${city.name}"`,
          { reply_markup: keyboard }
        );
      }
    }
  });

  // Обработчик выбора кафе для редактирования
  bot.callbackQuery(/^edit_cafe_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCallbackQuery();

    const cafeId = parseInt(ctx.match[1]);
    const cafeRepo = AppDataSource.getRepository(Cafe);
    const cafe = await cafeRepo.findOne({
      where: { id: cafeId },
      relations: ["city", "owner"],
    });

    if (cafe) {
      const keyboard = new InlineKeyboard()
        .text("✏️ Название", `edit_cafe_name_${cafe.id}`)
        .text("📝 Описание", `edit_cafe_description_${cafe.id}`)
        .row()
        .text("🖼 Аватар", `edit_cafe_avatar_${cafe.id}`)
        .text("📍 Адрес", `edit_cafe_address_${cafe.id}`)
        .row()
        .text("🏙️ Город", `edit_cafe_city_${cafe.id}`)
        .text("👤 Владелец", `edit_cafe_owner_${cafe.id}`)
        .row()
        .text("❌ Удалить кафе", `delete_cafe_${cafe.id}`)
        .text("🔙 Назад", "admin_cafes_back");

      await ctx.editMessageText(
        `Редактирование кафе:\n\n` +
          `Название: ${cafe.name}\n` +
          `Описание: ${cafe.description}\n` +
          `Адрес: ${cafe.address?.join(", ") || "Не указан"}\n` +
          `Город: ${cafe.city?.name || "Не выбран"}\n` +
          `Владелец: ${
            cafe.owner
              ? `ID:${cafe.owner.id} TG:${cafe.owner.tgId}`
              : "Не указан"
          }\n\n` +
          `Выберите, что хотите изменить:`,
        { reply_markup: keyboard }
      );
    }
  });

  // Обработчик callbackQuery для редактирования кафе
  bot.callbackQuery(/^edit_cafe_(.+)_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCallbackQuery();

    const field = ctx.match[1];
    const cafeId = parseInt(ctx.match[2]);

    ctx.session.adminAction = `edit_cafe_${field}` as AdminAction;
    ctx.session.adminEditingCafeId = cafeId;

    switch (field) {
      case "name":
        await ctx.editMessageText("Введите новое название кафе:");
        break;
      case "description":
        await ctx.editMessageText("Введите новое описание кафе:");
        break;
      case "avatar":
        await ctx.editMessageText("Отправьте новое фото для аватара кафе:");
        break;
      case "address":
        await ctx.editMessageText(
          "Введите новый адрес кафе (можно несколько через запятую):"
        );
        break;
      case "city":
        const cityRepo = AppDataSource.getRepository(City);
        const cities = await cityRepo.find();
        const keyboard = new InlineKeyboard();

        cities.forEach((city) => {
          keyboard.text(city.name, `set_cafe_city_${cafeId}_${city.id}`).row();
        });

        await ctx.editMessageText("Выберите новый город:", {
          reply_markup: keyboard,
        });
        break;
      case "owner":
        await ctx.editMessageText("Введите новый Telegram ID владельца:");
        break;
    }
  });

  // Добавляем обработчик выбора категории
  bot.callbackQuery(/^set_cafe_city_(\d+)_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCallbackQuery();

    const cafeId = parseInt(ctx.match[1]);
    const cityId = parseInt(ctx.match[2]);
    const cafeData = ctx.session.cafeData;

    if (cafeId && cityId) {
      const cafeRepo = AppDataSource.getRepository(Cafe);
      const cityRepo = AppDataSource.getRepository(City);
      const cafe = await cafeRepo.findOneBy({ id: cafeId });
      const city = await cityRepo.findOneBy({ id: cityId });

      if (city) {
        cafe.city = city;
        await cafeRepo.save(cafe);

        // Очищаем данные сессии
        ctx.session.adminAction = undefined;

        const keyboard = new Keyboard().text("🔙 Назад").resized();

        await ctx.reply(
          `✅ Кафе "${cafe.name}" успешно обновлен город "${city.name}"`,
          { reply_markup: keyboard }
        );
      }
    }
  });

  // Удаление кафе
  bot.callbackQuery(/^delete_cafe_(\d+)$/, async (ctx) => {
    if (!isAdmin(ctx)) return;
    await ctx.answerCallbackQuery();
    const cafeId = Number(ctx.match[1]);

    const cafeRepo = AppDataSource.getRepository(Cafe);
    await cafeRepo.delete({ id: cafeId });

    await ctx.editMessageText("✅ Кафе удалено");
  });

  // Назад
  bot.callbackQuery("admin_cafe_back", async (ctx) => {
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
