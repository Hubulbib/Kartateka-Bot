import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { type AdminAction, AppContext } from "../../../interfaces";
import { prismaClient } from "../../../db";
import { handleAddCafe } from "../../handlers/admin/admin-cafe";
import { getUserRole } from "../../bot";
import { adminKeyboard } from "../admin";
import { UserRole } from "@prisma/client";

export const setupCafeAdmin = (bot: Bot<AppContext>) => {
  // Главное меню управления кафе
  bot.hears("🏢 Кафе", async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }
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
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }
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
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }

    const cafeRepo = prismaClient.cafe;
    const cafes = await cafeRepo.findMany({
      include: { city: true, user: true },
      orderBy: { name: "asc" },
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
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }
    await ctx.answerCallbackQuery();

    const cityId = parseInt(ctx.match[1]);
    const cafeData = ctx.session.cafeData;

    if (cafeData) {
      const cafeRepo = prismaClient.cafe;
      const cityRepo = prismaClient.city;
      const city = await cityRepo.findFirst({ where: { id: cityId } });

      if (city) {
        const cafe = await cafeRepo.create({
          data: {
            name: cafeData.name,
            description: cafeData.description,
            address: cafeData.address,
            avatar: cafeData.avatar,
            user: { connect: { id: cafeData.ownerId } },
            city: { connect: { id: city.id } },
          },
        });

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
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }
    await ctx.answerCallbackQuery();

    const cafeId = parseInt(ctx.match[1]);
    const cafeRepo = prismaClient.cafe;
    const cafe = await cafeRepo.findFirst({
      where: { id: cafeId },
      include: { city: true, user: true },
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
            cafe.user ? `ID:${cafe.user.id} TG:${cafe.user.tgId}` : "Не указан"
          }\n\n` +
          `Выберите, что хотите изменить:`,
        { reply_markup: keyboard }
      );
    }
  });

  // Обработчик callbackQuery для редактирования кафе
  bot.callbackQuery(/^edit_cafe_(.+)_(\d+)$/, async (ctx) => {
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }
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
        const cityRepo = prismaClient.city;
        const cities = await cityRepo.findMany();
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
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }
    await ctx.answerCallbackQuery();

    const cafeId = parseInt(ctx.match[1]);
    const cityId = parseInt(ctx.match[2]);
    const cafeData = ctx.session.cafeData;

    if (cafeId && cityId) {
      const cafeRepo = prismaClient.cafe;
      const cityRepo = prismaClient.city;
      const cafe = await cafeRepo.findFirst({ where: { id: cafeId } });
      const city = await cityRepo.findFirst({ where: { id: cityId } });

      if (city) {
        await cafeRepo.update({
          where: { id: cafe.id },
          data: { city: { connect: { id: city.id } } },
        });

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
    const userRole = await getUserRole(ctx);
    if (userRole !== UserRole.ADMIN) {
      await ctx.reply("У вас нет доступа к админ-панели");
      return;
    }
    await ctx.answerCallbackQuery();
    const cafeId = Number(ctx.match[1]);

    const cafeRepo = prismaClient.cafe;
    await cafeRepo.delete({ where: { id: cafeId } });

    await ctx.editMessageText("✅ Кафе удалено");
  });

  // Назад
  bot.callbackQuery("admin_cafe_back", async (ctx) => {
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
