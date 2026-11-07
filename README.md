# ⚡ DoH-Switcher // CyberDNS 🕶️

<div align="center">

![Manifest V3](https://img.shields.io/badge/Manifest-V3-00f0ff?style=for-the-badge&logo=googlechrome&logoColor=black)
![License](https://img.shields.io/badge/License-MIT-fcee0a?style=for-the-badge&logoColor=black)
![Vanilla JS](https://img.shields.io/badge/Zero%20Dependencies-Vanilla%20JS-ff003c?style=for-the-badge&logo=javascript&logoColor=white)
![Style](https://img.shields.io/badge/Style-Cyberpunk%202077-fcee0a?style=for-the-badge)

<br/>

<img src="icons/icon.svg" width="110" height="110" alt="DoH Switcher Logo" />

<h3>Быстрое переключение DNS-over-HTTPS (DoH) в один клик для Google Chrome и Chromium-браузеров в эстетике Cyberpunk 2077</h3>

<p align="center">
  <a href="#-особенности">Особенности</a> •
  <a href="#-установка">Инструкция по установке</a> •
  <a href="#-встроенные-пресеты">Пресеты</a> •
  <a href="#-архитектура-и-api">Архитектура</a> •
  <a href="#-сборка-релиза">Сборка ZIP</a>
</p>

</div>

---

## 🎯 Зачем нужен DoH-Switcher?

При активной разработке, тестировании сетевых конфигураций, исследовании приватности или **обходе региональных блокировок для сервисов искусственного интеллекта (OpenAI, Claude, Perplexity)** регулярно требуется менять DoH-сервер.

Обычно для этого приходится проходить долгий путь в браузере:  
`chrome://settings/security` ➔ скролл вниз ➔ «Использовать безопасный DNS-сервер» ➔ «Свой» ➔ вставка URL вручную.

**DoH-Switcher** переносит всё управление прямо в панель расширений: переключайте DNS-серверы, проверяйте статус шифрования и добавляйте кастомные DoH-узлы **в один клик без перезапуска браузера**.

---

## 🚀 Ключевые возможности

- 🖲️ **Переключение в 1 клик**: Мгновенная активация выбранного DoH-сервера через нативное Privacy API Chromium.
- ⚡ **Cyberpunk 2077 HUD**: Неоновый интерфейс (Night City Dark, Cyber Yellow `#fcee0a`, Neon Cyan `#00f0ff`, Cyber Crimson `#ff003c`), анимированные индикаторы статуса, срезанные углы элементов и скайлайн-эффекты.
- 🧪 **Кастомные пресеты**: Добавляйте любые свои серверы (AdGuard Home, Pi-hole, персональные NextDNS, корпоративные шлюзы).
- 🛡️ **Валидатор безопасности**: Встроенная проверка протокола — блокирует добавление небезопасных URL (разрешены только `https://`).
- 🛑 **Killswitch и Quick Reset**: 
  - `AUTO DEFAULT` — мгновенный возврат к системному автоматическому DNS Chromium.
  - `KILLSWITCH` — полное выключение безопасного DNS.
- 🏷️ **Динамический бейдж на иконке**: Иконка расширения в реальном времени отображает текущий статус (`ON` / `AUTO` / `OFF`).
- 💾 **Энергонезависимая память**: Сохранение ваших пресетов и активных конфигураций в `chrome.storage.local`.
- 🪶 **100% Vanilla JS**: Никаких тяжелых фреймворков и библиотек. Расширение весит считанные килобайты и не расходует ресурсы системы.

---

## 📦 Установка расширения

Поскольку расширение предназначено для разработчиков и распространяется через GitHub без публикации в Chrome Web Store, выберите наиболее удобный способ установки:

### Способ 1: Установка готового архива из Releases (Рекомендуемый)

1. Перейдите в раздел **[Releases](https://github.com/linskay/DoH-Switcher/releases)** этого репозитория.
2. Скачайте архив `DoH-Switcher-v1.0.0.zip`.
3. Распакуйте архив в любую постоянную папку на компьютере (например, `C:\Tools\DoH-Switcher` или `~/tools/doh-switcher`).
4. Откройте Chrome или любой Chromium-браузер (Brave, Edge, Vivaldi, Opera) и перейдите по адресу:
   ```text
   chrome://extensions/
   ```
5. В правом верхнем углу включите тумблер **«Режим разработчика»** (*Developer mode*).
6. В левом верхнем углу нажмите кнопку **«Загрузить распакованное расширение»** (*Load unpacked*).
7. Выберите распакованную папку `DoH-Switcher`.
8. Готово! Закрепите иконку расширения на панели инструментов браузера для быстрого доступа.

---

### Способ 2: Установка из исходного кода через Git

```bash
# Клонируйте репозиторий
git clone https://github.com/linskay/DoH-Switcher.git
cd DoH-Switcher

# Откройте chrome://extensions/, включите Developer mode и нажмите "Load unpacked",
# указав путь к склонированной папке DoH-Switcher.
```

---

### 🛡️ Способ 3: Для корпоративных сред (Group Policy / Registry)

Если вы хотите развернуть расширение централизованно в Windows без необходимости вручную включать режим разработчика:

1. Откройте реестр Windows (`regedit`).
2. Перейдите в раздел:
   ```text
   HKEY_LOCAL_MACHINE\SOFTWARE\Policies\Google\Chrome\ExtensionInstallAllowlist
   ```
   *(Если раздела нет, создайте его)*
3. Добавьте строковый параметр со значением ID вашего загруженного расширения (отображается на странице `chrome://extensions`).

---

## 🌐 Встроенные популярные пресеты

Из коробки доступны надежные высокоскоростные мировые DoH-провайдеры:

| Провайдер | Назначение | DoH Template URL |
| :--- | :--- | :--- |
| **Cloudflare** | Ультрабыстрый, приватный | `https://chrome.cloudflare-dns.com/dns-query` |
| **Cloudflare Security** | Защита от вредоносного ПО | `https://security.cloudflare-dns.com/dns-query` |
| **Google Public DNS** | Глобальное покрытие Anycast | `https://dns.google/dns-query` |
| **AdGuard DNS** | Блокировка рекламы и трекеров | `https://dns.adguard-dns.com/dns-query` |
| **Quad9** | Блокировка фишинга и зловредов | `https://dns.quad9.net/dns-query` |
| **Mullvad DNS** | Строгая анонимность без логов | `https://dns.mullvad.net/dns-query` |
| **Control D** | Свободный DNS без ограничений | `https://freedns.controld.com/p0` |

---

## 🛠️ Архитектура и стек технологий

Проект разработан в строгом соответствии с требованиями **Google Chrome Manifest V3**:

```text
DoH-Switcher/
├── manifest.json       # Декларация расширения Manifest V3
├── background.js       # Service worker: мониторинг статуса и бейдж на иконке
├── popup.html          # Cyberpunk HUD разметка окна управления
├── popup.css           # Неоновая стилизация Cyberpunk 2077, анимации, скайлайны
├── popup.js            # Логика Chrome Privacy & Storage API
├── package.js          # Скрипт автоматической сборки ZIP-релиза для GitHub
├── build.ps1           # PowerShell-скрипт сборки архива
├── icons/              # Набор иконок (16, 32, 48, 128 px + SVG)
└── README.md           # Документация проекта
```

### Используемые Chrome API:
- `chrome.privacy.services.secureDnsMode`: переключение режимов (`"secure"`, `"automatic"`, `"off"`).
- `chrome.privacy.services.secureDnsTemplates`: установка кастомного HTTPS-шаблона DNS.
- `chrome.storage.local`: безопасное локальное сохранение пользовательских серверов.
- `chrome.action.setBadgeText`: отображение статуса DNS прямо в тулбаре браузера.

---

## 📦 Сборка релиза для GitHub

Для сборки свежего `.zip` архива перед публикацией нового релиза на GitHub выполните:

**С помощью Node.js:**
```bash
npm run package
# или: node package.js
```

**Либо через PowerShell (без Node):**
```powershell
.\build.ps1
```

Собранный архив появится в папке `dist/DoH-Switcher-v1.0.0.zip`, готовый к загрузке в **GitHub Releases**.

---

## 📄 Лицензия

Распространяется под свободной лицензией [MIT](LICENSE). Разработано для открытого сообщества.
