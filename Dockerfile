# Используем официальный образ Node.js в качестве базового
FROM node:20-alpine

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /usr/src/app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код приложения
COPY . .

# Собираем TypeScript в JavaScript
RUN npm run build

# Открываем порт (если нужно, например, 3000)
EXPOSE 5000

# Указываем команду для запуска приложения
CMD ["node", "dist/app.js"]