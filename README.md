# KARTATEKA Backend — Deployment Guide

## 1. Общая информация

Backend сервиса **KARTATEKA** разворачивается с помощью **Docker Compose** и состоит из следующих контейнеров:

* **PostgreSQL 15** — основная база данных
* **Node.js приложение** — Telegram-бот + HTTP API
* **Nginx** — reverse proxy + SSL
* **pgAdmin** (опционально) — управление БД

---

## 2. Требования к серверу

На сервере должны быть установлены:

* Docker **>= 24**
* Docker Compose **v2**
* Git
* Доступ к Docker Hub
* Открытые порты:

  * `80`, `443` — HTTP/HTTPS
  * `5432` — PostgreSQL (опционально, можно закрыть)
  * `5050` — pgAdmin

---

## 3. Структура проекта

```text
.
├── docker-compose.yml
├── nginx/
│   └── nginx.conf
└── tgbot/
    ├── .github/
    │   └── workflows/
    │       └── github-actions.yml
    ├── README.md
    ├── Dockerfile
    ├── package.json
    ├── package-lock.json
    ├── src/
    └── ...

```

## 4. Переменные окружения

Все переменные передаются **через docker-compose.yml**.

### Основные:

| Переменная             | Описание                          |
| --------------------   | --------------------------------- |
| `DATABASE_URL`         | Строка подключения к PostgreSQL   |
| `TELEGRAM_BOT_TOKEN`   | Токен Telegram-бота               |
| `PORT`                 | Внутренний порт приложения (5000) |
| `NODE_ENV`             | production                        |
| `WEB_APP_URL`          | URL Веб-приложения                |
| `BUSINESS_WEB_APP_URL` | URL Бизнес-панели                 |
| `TOXIC_API_KEY`        | API-ключ от TOXIC API             |

⚠️ **Важно:**
В реальном деплое значения **должны быть вынесены в `.env`** или в secrets (это зона ответственности DevOps).

---

## 5. SSL-сертификаты

Nginx использует **Let's Encrypt** сертификаты.

Ожидаемая структура на сервере:

```text
/etc/letsencrypt/live/insan-rostov.ru/
├── fullchain.pem
└── privkey.pem
```

Получение и обновление сертификатов (certbot и т.д.) — **ответственность DevOps**.

---

## 6. Проверка работы

* API доступно по адресу:

  ```
  https://insan-rostov.ru/api/
  ```

* PostgreSQL:

  ```
  localhost:5432
  ```

* pgAdmin (если нужен):

  ```
  http://<server-ip>:5050
  ```

---

## 7. CI/CD (GitHub Actions)

### Триггер

Pipeline запускается при пуше в ветку `master`.

### Этапы:

1. Checkout репозитория
2. Сборка Docker-образа
3. Публикация в Docker Hub
4. SSH-деплой на сервер
5. Перезапуск контейнеров через `docker compose`

### Используемые secrets GitHub:

| Secret                | Назначение       |
| --------------------- | ---------------- |
| `DOCKER_HUB_USERNAME` | Логин Docker Hub |
| `DOCKER_HUB_TOKEN`    | Токен Docker Hub |
| `SSH_HOST`            | IP/домен сервера |
| `SSH_USERNAME`        | SSH пользователь |
| `SSH_PRIVATE_KEY`     | SSH ключ         |
| `SSH_PASSPHRASE`      | Passphrase ключа |

---

## 8. Логика деплоя на сервере

Во время деплоя:

1. Останавливается контейнер `kartateka_bot`
2. Удаляется старый Docker-образ
3. Выполняется:

   ```bash
   docker compose up -d
   ```

PostgreSQL и volumes **не удаляются**.

---

## 9. Хранение данных

* Данные PostgreSQL сохраняются в volume:

  ```text
  postgres_data
  ```

* При перезапуске контейнеров данные **не теряются**.

---

## 10. Важно знать

* Приложение **слушает порт 5000 внутри Docker-сети**
* Внешний доступ осуществляется **только через Nginx**
* Прямой доступ к контейнеру `app` снаружи не предполагается

---

## 11. Ответственность

В рамках этого README:

* ❌ Не описывается внутренняя логика приложения
* ❌ Не описывается настройка SSL, firewall, backup
* ❌ Не описывается мониторинг

**Только запуск и деплой сервиса.**

---
* адаптировать под **Kubernetes**
* переписать в стиле **корпоративной DevOps-документации**
