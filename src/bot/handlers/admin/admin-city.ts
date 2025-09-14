import { Keyboard } from "grammy";
import { City } from "../../../entities/city";
import { AppContext } from "../../../interfaces";
import { AppDataSource } from "../../../services/database";

// Функция обработки добавления города
export async function handleAddCity(ctx: AppContext) {
  const cityRepo = AppDataSource.getRepository(City);

  const city = cityRepo.create({
    name: ctx.message.text,
  });

  await cityRepo.save(city);
  ctx.session.adminAction = undefined;

  const keyboard = new Keyboard().text("🔙 Назад").resized();

  await ctx.reply(`✅ Город "${city.name}" создан`, {
    reply_markup: keyboard,
  });
}

// Функция обработки редактирования города
export async function handleEditCity(ctx: AppContext) {
  if (!ctx.session.adminEditingCityId) return;

  const cityRepo = AppDataSource.getRepository(City);
  const city = await cityRepo.findOneBy({
    id: ctx.session.adminEditingCityId,
  });

  if (city) {
    const oldName = city.name;
    city.name = ctx.message.text;
    await cityRepo.save(city);

    ctx.session.adminAction = undefined;
    ctx.session.adminEditingCityId = undefined;

    const keyboard = new Keyboard().text("🔙 Назад").resized();

    await ctx.reply(`✅ Город переименован:\n"${oldName}" → "${city.name}"`, {
      reply_markup: keyboard,
    });
  }
}
