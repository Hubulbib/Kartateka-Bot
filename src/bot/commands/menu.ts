import { Bot, Keyboard } from "grammy";
import { AppContext } from "../../interfaces";

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

export const getMainMenu = (isAdmin: boolean) => {
  const keyboard = new Keyboard().text("ℹ️ О нас").row().text("🧑‍💻 Поддержка");

  if (isAdmin) {
    keyboard.row().text("👨‍💼 Админ-панель");
  }

  keyboard.resized();

  return keyboard;
};
