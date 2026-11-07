# DoH-Switcher // CyberDNS

Легковесное расширение (Manifest V3) для браузеров Google Chrome и Chromium для быстрого управления и переключения между DNS-over-HTTPS (DoH) серверами в один клик.

Интерфейс выполнен в темной стилистике с настраиваемыми пресетами и прямым управлением системными параметрами безопасности Chromium.

---

## Возможности

- **Переключение в 1 клик**: Мгновенная смена активного DoH-сервера без перезапуска браузера.
- **Интерактивный HUD**: Отображение текущего состояния (Secure / Auto / Disabled) и активного шаблона DNS.
- **Динамический бейдж**: Статус работы (ON / AUTO / OFF) на иконке расширения в панели инструментов.
- **Кастомные серверы**: Добавление собственных DoH-серверов по URL (`https://.../dns-query`) с валидацией протокола.
- **Быстрый сброс**:
  - `AUTO DEFAULT` — возврат к системному автоматическому режиму DNS.
  - `KILLSWITCH` — полное отключение безопасного DNS.
- **Автономность**: Написано на чистом Vanilla JS, не требует сторонних библиотек и служб в ОС.
- **Энергонезависимость**: Сохранение пользовательских пресетов в `chrome.storage.local`.

---

## Установка

Расширение устанавливается напрямую в режиме разработчика Chromium.

1. Скачайте исходный код или архив релиза.
2. В Chrome откройте страницу `chrome://extensions/`.
3. В правом верхнем углу включите тумблер **«Режим разработчика»** (*Developer mode*).
4. Нажмите кнопку **«Загрузить распакованное расширение»** (*Load unpacked*).
5. Выберите папку `DoH-Switcher` (папку, содержащую файл `manifest.json`).

---

## Предустановленные серверы

| Провайдер | Назначение | Шаблон DoH |
| :--- | :--- | :--- |
| **Cloudflare** | Высокая скорость и приватность | `https://chrome.cloudflare-dns.com/dns-query` |
| **Cloudflare Security** | Фильтрация вредоносного ПО | `https://security.cloudflare-dns.com/dns-query` |
| **Google Public DNS** | Глобальная сеть Anycast | `https://dns.google/dns-query` |
| **AdGuard DNS** | Блокировка рекламы и трекеров | `https://dns.adguard-dns.com/dns-query` |
| **Quad9** | Блокировка угроз и фишинга | `https://dns.quad9.net/dns-query` |
| **Mullvad DNS** | Политика отсутствия логов | `https://dns.mullvad.net/dns-query` |
| **Control D** | Открытый резолвер | `https://freedns.controld.com/p0` |

---

## Архитектура проекта

```text
DoH-Switcher/
├── manifest.json       # Манифест расширения Manifest V3
├── background.js       # Фоновый service worker (обновление бейджа)
├── popup.html          # Интерфейс всплывающего окна
├── popup.css           # Стили интерфейса
├── popup.js            # Логика работы с Chrome Privacy и Storage API
├── icons/              # Иконки (16, 32, 48, 96, 128 px, svg)
└── package.js          # Скрипт сборки release-архива
```

Используемые Chrome API:
- `chrome.privacy.services.secureDnsMode`
- `chrome.privacy.services.secureDnsTemplates`
- `chrome.storage.local`
- `chrome.action.setBadgeText`

---

## Сборка релиза

Для упаковки расширения в ZIP-архив:

```bash
npm run package
# или: node package.js
```

Собранный архив сохраняется в директорию `dist/DoH-Switcher-v1.0.0.zip`.

---

## Лицензия

MIT License.
