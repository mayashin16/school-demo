# 🎓 Школа: Путь к мечте (демо)

Демо-версия геймифицированного школьного приложения.
Работает полностью в браузере: данные сохраняются в `localStorage`, задания читаются из CSV.

## 🚀 Быстрый старт через Docker

```bash
git clone <repo-url> school-demo
cd school-demo
docker build -t yourusername/school-demo:latest .
docker run -d -p 8080:80 --name school-demo yourusername/school-demo:latest
```

Открыть: **http://localhost:8080**

## 📦 Публикация на Docker Hub

```bash
docker login
docker build -t yourusername/school-demo:latest .
docker push yourusername/school-demo:latest
```

## 🌐 Деплой на сервере (из Hub)

```bash
docker pull yourusername/school-demo:latest
docker run -d -p 80:80 --restart unless-stopped --name school-demo yourusername/school-demo:latest
```

Открыть: **http://ваш-сервер/**

## 🧪 Что внутри

| Компонент | Назначение |
|-----------|------------|
| `index.html` | Плейсхолдер + приложение ученика |
| `style.css` | Стили MAX UI |
| `api.js` | Локальный API (localStorage + CSV) |
| `app.js` | Логика приложения |
| `data/tasks.csv` | Задания |
| `data/subjects.json` | Справочник предметов |
| `assets/*` | Картинки |

## 🗑️ Сброс демо

На стартовом экране есть кнопка «Сбросить демо» — очищает `localStorage` и перезагружает страницу.

## 🔗 Полная версия

Доступна в MAX: **https://max.ru/se14496122_bot**
