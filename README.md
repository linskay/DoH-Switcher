# DoH-Switcher // CyberDNS v2.0

Легковесное расширение (Manifest V3) для браузеров Google Chrome и Chromium для управления и переключения между DNS-over-HTTPS (DoH) серверами в один клик с встроенной диагностикой и терминалом событий.

---

## ⚡ Новые возможности v2.0

- **Многоэтапный цикл подключения**:
  - `CONNECTING` — применение политик через Native Host и сброс активных сокетов.
  - `VERIFYING` — отправка тестового зонда RFC 8484 DNS query к эндпоинту.
  - `CONNECTED` — подтверждённое рабочее состояние (зелёный индикатор `#00FFA3`).
  - `ERROR` — безопасный откат при сбое применения настроек.
- **Реальная диагностика DNS (`TEST DNS`)**:
  - Измерение фактического времени ответа (RTT в миллисекундах) через стандарт RFC 8484 `application/dns-message`.
  - Проверка статуса доступности (`ONLINE` / `OFFLINE` / `TIMEOUT`).
- **Категории и избранное**:
  - Закрепление любимых серверов вверху списка (кнопка `★`).
  - Фильтры по категориям: `ALL`, `★ FAVS`, `PRIVACY`, `SECURITY`, `AD BLOCK`, `CUSTOM`.
- **Информативные карточки серверов**:
  - Имя провайдера, DoH URL, теги безопасности (Malware Block, AdBlock, Privacy, Fast).
  - Реальный пинг и статус доступности.
  - Кнопка пинга `⚡`, подключения и удаления `[✕]` на каждой карточке.
- **Cyber Terminal & Event Log**:
  - Журнал системных событий в реальном времени (`SWITCH`, `NATIVE_HOST`, `DIAGNOSTICS`, `PROBE`).
  - Экспорт и импорт пользовательских серверов в формате JSON.
- **Обновлённый Native Host**:
  - Автоматическая нормализация DoH URL (добавление `{?dns}` для исключения ошибок 415/POST).
  - Сброс кэша DNS через системный вызов `DnsFlushResolverCache`.
  - Корректная атомарная запись в `HKLM`, `HKCU` и `Local State`.

---

## Цветовая палитра интерфейса

| Элемент | Цвет | Код |
| :--- | :--- | :--- |
| **Основной фон** | Deep Obsidian | `#090B12` |
| **Панели и карточки** | Night City Slate | `#101521` (hover `#141e2b`) |
| **Основной неон** | Cyber Cyan | `#00F0FF` |
| **Акцент и действия** | Cyber Yellow | `#FCEE0A` |
| **Успешное подключение** | Neon Green | `#00FFA3` |
| **Ошибка и Killswitch** | Crimson Red | `#FF3158` |
| **Вторичный текст** | Tech Steel | `#65758B` |
| **Основной текст** | Ice White | `#DCE7F5` |

---

## Установка

1. Скачайте исходный код или распакуйте архив релиза.
2. В Chrome откройте `chrome://extensions/`.
3. В правом верхнем углу включите **«Режим разработчика»** (*Developer mode*).
4. Нажмите **«Загрузить распакованное расширение»** (*Load unpacked*).
5. Выберите папку `DoH-Switcher`.
6. Запустите файл `install-host.bat` для регистрации нативного модуля управления политиками.

---

## Управление системными политиками

### Активация 1-клик переключения: `install-host.bat`
Скрипт регистрирует локальный нативный обработчик, позволяющий расширению мгновенно обновлять параметры `DnsOverHttpsMode` и `DnsOverHttpsTemplates` в реестре Windows и файле `Local State` браузера.

### Как убрать плашку «Браузером управляет ваша организация»: `clear-policy.bat`
В Chromium любое применение политик через реестр Windows сопровождается системной плашкой *«Браузером управляет ваша организация»*. 
Если вам потребуется полностью очистить системные политики и вернуть Chrome в исходное состояние:
1. Запустите файл **`clear-policy.bat`** двойным кликом.
2. Перезапустите Chrome. Плашка управления исчезнет.

---

## Предустановленные серверы

| Провайдер | Категория | Теги | Шаблон DoH |
| :--- | :--- | :--- | :--- |
| **Cloudflare** | Privacy | Fast / No-Logs | `https://chrome.cloudflare-dns.com/dns-query` |
| **Cloudflare Security** | Security | Malware Block | `https://security.cloudflare-dns.com/dns-query` |
| **Google Public DNS** | Default | Global Anycast | `https://dns.google/dns-query{?dns}` |
| **AdGuard DNS** | AdBlock | AdBlocker / Trackers | `https://dns.adguard-dns.com/dns-query{?dns}` |
| **Quad9** | Security | Threat Intel | `https://dns.quad9.net/dns-query{?dns}` |
| **Mullvad DNS** | Privacy | Strict No-Logs | `https://dns.mullvad.net/dns-query{?dns}` |
| **Control D** | Privacy | Uncensored / Free | `https://freedns.controld.com/p0{?dns}` |

---

## Сборка релиза

```bash
npm run package
# или: node package.js
```

Собранный архив сохраняется в директорию `dist/DoH-Switcher-v2.0.0.zip`.

---

## Лицензия

MIT License.
