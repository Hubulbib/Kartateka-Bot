import { Bot, InputFile } from "grammy";

const imageCache = new Map<string, string>();

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);

export class ImageService {
  static getImage = async (fileId: string) => {
    // Проверка кэша
    if (!fileId) return;
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

  static saveImage = async (file: Express.Multer.File, tgId: number) => {
    const inputFile = new InputFile(file.buffer, file.originalname);

    const message = await bot.api.sendPhoto(tgId, inputFile, {
      caption: `🖼 Аватар от пользователя: ${tgId}`,
    });

    return message.photo[message.photo.length - 1];
  };
}
