import { InlineKeyboard } from "grammy";
import { AppContext } from "../../../interfaces";
import { AppDataSource } from "../../../services/database";
import { City } from "../../../entities/city";
import { User } from "../../../entities/user";
import { Cafe } from "../../../entities/cafe";

export async function handleAddCafe(ctx: AppContext) {
  const cityRepo = AppDataSource.getRepository(City);
  const userRepo = AppDataSource.getRepository(User);
  const cafeRepo = AppDataSource.getRepository(Cafe);

  if (!ctx.session.cafeData) {
    ctx.session.cafeData = {};
  }
  const cafeData = ctx.session.cafeData;

  // Шаг 1: Название
  if (!cafeData.name) {
    if (!ctx.message.text) {
      await ctx.reply("Пожалуйста, введите название кафе:");
      return;
    }
    cafeData.name = ctx.message.text;
    await ctx.reply("Введите описание кафе:");
    return;
  }

  // Шаг 2: Описание
  if (!cafeData.description) {
    if (!ctx.message.text) {
      await ctx.reply("Пожалуйста, введите описание кафе:");
      return;
    }
    cafeData.description = ctx.message.text;
    await ctx.reply("Пожалуйста, отправьте фото для аватара кафе:");
    return;
  }

  // Шаг 3: Фото (аватар)
  if (!cafeData.avatar) {
    if (!ctx.message.photo) {
      await ctx.reply("Пожалуйста, отправьте фото для аватара кафе:");
      return;
    }
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    cafeData.avatar = photo.file_id;
    await ctx.reply(
      "Введите адрес кафе (можно несколько через точку с запятой и в формате - ул. Дахадаева, 100А):"
    );
    return;
  }

  // Шаг 4: Адрес
  if (!cafeData.address) {
    if (!ctx.message.text) {
      await ctx.reply(
        "Пожалуйста, введите адрес кафе (можно несколько через ;):"
      );
      return;
    }
    cafeData.address = ctx.message.text.split(";").map((s) => s.trim());

    await ctx.reply(
      "Введите Telegram ID владельца кафе (число или 0 для пропуска)"
    );
  }

  if (!cafeData?.owner?.tgId) {
    if (!ctx.message.text) {
      await ctx.reply("Введите Telegram ID владельца кафе (число):");
      return;
    }

    const tgId = parseInt(ctx.message.text);
    if (isNaN(tgId) || typeof tgId !== "number") {
      await ctx.reply("Пожалуйста, введите корректный Telegram ID (число):");
      return;
    }

    // Шаг 5: Владелец (опционально)
    if (tgId !== 0) {
      // Проверяем существование пользователя
      const owner = await userRepo.findOneBy({ tgId });
      if (!owner) {
        await ctx.reply(
          "Пользователь с таким Telegram ID не найден. Введите другой ID:"
        );
        return;
      }
      cafeData.owner = owner; // Сохраняем ссылку на владельца
    } else {
      cafeData.owner = null;
    }

    // Выбор города
    const cities = await cityRepo.find();
    if (cities.length === 0) {
      await ctx.reply("Нет городов в базе. Сначала добавьте город.");
      ctx.session.cafeData = undefined;
      return;
    }
    const keyboard = new InlineKeyboard();
    cities.forEach((city) => {
      keyboard.text(city.name, `add_cafe_city_${city.id}`).row();
    });
    await ctx.reply("Выберите город для кафе:", { reply_markup: keyboard });
    return;
  }

  // Шаг 6: Город (выбор через callbackQuery)
  if (!cafeData.city) {
    await ctx.reply(
      "Пожалуйста, выберите город для кафе с помощью кнопок выше."
    );
    return;
  }

  // Все данные собраны — сохраняем кафе
  const cafe = cafeRepo.create({
    name: cafeData.name,
    description: cafeData.description,
    avatar: cafeData.avatar,
    address: cafeData.address,
    city: await cityRepo.findOneBy({ id: cafeData.city.id }),
    owner: await userRepo.findOneBy({ tgId: cafeData.owner.tgId }), // Находим владельца по tgId
  });
  await cafeRepo.save(cafe);
  ctx.session.cafeData = undefined;
  await ctx.reply(`✅ Кафе "${cafe.name}" успешно добавлено!`);
}

// Функция обработки редактирования кафе
export async function handleEditCafe(ctx: AppContext) {
  if (!ctx.session.adminEditingCafeId) return;

  const cafeRepo = AppDataSource.getRepository(Cafe);
  const userRepo = AppDataSource.getRepository(User);
  const cafe = await cafeRepo.findOne({
    where: { id: ctx.session.adminEditingCafeId },
    relations: ["city", "owner"],
  });

  if (!cafe) return;

  const action = ctx.session.adminAction;

  if (action === "edit_cafe_name" && ctx.message.text) {
    cafe.name = ctx.message.text;
  } else if (action === "edit_cafe_description" && ctx.message.text) {
    cafe.description = ctx.message.text;
  } else if (action === "edit_cafe_avatar" && ctx.message.photo) {
    const photo = ctx.message.photo[ctx.message.photo.length - 1];
    cafe.avatar = photo.file_id;
  } else if (action === "edit_cafe_address" && ctx.message.text) {
    cafe.address = ctx.message.text.split(",").map((s) => s.trim());
  } else if (action === "edit_cafe_owner" && ctx.message.text) {
    const tgId = parseInt(ctx.message.text);
    if (isNaN(tgId)) {
      await ctx.reply("Пожалуйста, введите корректный Telegram ID (число):");
      return;
    }

    const owner = await userRepo.findOneBy({ tgId });
    if (!owner) {
      await ctx.reply(
        "Пользователь с таким Telegram ID не найден. Введите другой ID:"
      );
      return;
    }
    cafe.owner = owner;
  } else {
    await ctx.reply("Пожалуйста, отправьте корректные данные:");
    return;
  }

  await cafeRepo.save(cafe);
  ctx.session.adminAction = undefined;
  ctx.session.adminEditingCafeId = undefined;

  const keyboard = new InlineKeyboard()
    .text("✏️ Продолжить редактирование", `edit_cafe_${cafe.id}`)
    .row()
    .text("🔙 Назад к списку", "admin_cafes_back");

  await ctx.reply(`✅ Кафе "${cafe.name}" успешно обновлено`, {
    reply_markup: keyboard,
  });
}
