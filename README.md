## 🔗 Полная версия

Доступна в MAX: **https://max.ru/se14496122_bot**

# 🎓 Школа: Путь к мечте (демо)

Демо-версия геймифицированного школьного приложения.
Работает полностью в браузере: данные сохраняются в `localStorage`, задания читаются из CSV.

## 🚀 Быстрый старт через Docker

```bash
git clone https://github.com/mayashin16/school-demo.git school-demo
cd school-demo
docker build -t mayashin/school-demo:latest .
docker run -d -p 8080:80 --name school-demo mayashin/school-demo:latest
```

Открыть: **http://localhost:8080**


## 🌐 Деплой на сервере (из Hub)

```bash
docker pull mayashin/school-demo:latest
docker run -d -p 80:80 --restart unless-stopped --name school-demo mayashin/school-demo:latest
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
