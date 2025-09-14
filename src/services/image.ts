import { Bot } from "grammy";

const imageCache = new Map<string, string>();

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

export class ImageService {
  static getImage = async (fileId: string) => {
    // Проверка кэша
    if (imageCache.has(fileId)) {
      return imageCache.get(fileId);
    }

    // Получаем информацию о файле
    const file = await bot.api.getFile(fileId);

    // Формируем URL для скачивания файла
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

    imageCache.set(fileId, fileUrl);
    setTimeout(() => imageCache.delete(fileId), 60 * 60 * 1000);

    return fileUrl;
  };
}
