import { Keyboard } from "grammy";
import { prismaClient } from "../../../db";
import { AppContext } from "../../../interfaces";

// Функция обработки добавления города
export async function handleAddCity(ctx: AppContext) {
  const cityRepo = prismaClient.city;

  const city = await cityRepo.create({
    data: { name: ctx.message.text },
  });

  ctx.session.adminAction = undefined;

  const keyboard = new Keyboard().text("🔙 Назад").resized();

  await ctx.reply(`✅ Город "${city.name}" создан`, {
    reply_markup: keyboard,
  });
}

// Функция обработки редактирования города
export async function handleEditCity(ctx: AppContext) {
  if (!ctx.session.adminEditingCityId) return;

  const cityRepo = prismaClient.city;
  const city = await cityRepo.findFirst({
    where: {
      id: ctx.session.adminEditingCityId,
    },
  });

  if (city) {
    const oldName = city.name;
    city.name = ctx.message.text;
    await cityRepo.create({ data: { ...city } });

    ctx.session.adminAction = undefined;
    ctx.session.adminEditingCityId = undefined;

    const keyboard = new Keyboard().text("🔙 Назад").resized();

    await ctx.reply(`✅ Город переименован:\n"${oldName}" → "${city.name}"`, {
      reply_markup: keyboard,
    });
  }
}
