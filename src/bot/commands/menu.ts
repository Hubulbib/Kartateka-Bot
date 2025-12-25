import { Bot, Keyboard } from "grammy";
import { AppContext } from "../../interfaces";
import { UserRole } from "@prisma/client";

export const setupMenu = async (bot: Bot<AppContext>) => {
  // Устанавливаем команды меню
  await bot.api.setMyCommands([
    { command: "start", description: "📱 Главное меню" },
    { command: "admin", description: "👨‍💼 Админ-панель" },
  ]);

  // Устанавливаем тип меню как команды
  await bot.api.setChatMenuButton({
    menu_button: { type: "commands" },
  });
};

export const getMainMenu = (userRole: UserRole) => {
  const keyboard = new Keyboard().text("ℹ️ О нас").row().text("🧑‍💻 Поддержка");

  if (userRole === UserRole.ADMIN) {
    keyboard.row().text("👨‍💼 Админ-панель");
  }

  if (userRole === UserRole.BUSINESS) {
    keyboard.row().text("🏢 Мои кафе");
  }

  keyboard.resized();

  return keyboard;
};
