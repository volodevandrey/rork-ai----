# Истории MAX для iPhone

Неофициальный React Native/Expo-клиент, который подключается напрямую к серверам MAX и даёт доступ к историям из Android-версии.

## Что работает

- вход по номеру телефона и одноразовому коду;
- пароль двухэтапной защиты;
- сохранение сессии в iOS Keychain через `expo-secure-store`;
- лента историй, фото и видео;
- отметка просмотра и реакции;
- публикация фото в историю;
- обновление ленты при возврате в приложение.

Код, пароль и токен не отправляются на сторонний сервер. Соединение идёт напрямую к `api.oneme.ru:443` по TCP/TLS.

## Важно

Это не APK-эмулятор и не конвертер APK в IPA. APK содержит Android-код, который iOS не запускает. Здесь реализован отдельный iOS-интерфейс к протоколу MAX — это практичный вариант для нужной функции.

Приложение **не работает в Expo Go и обычном предпросмотре Rork**, потому что использует нативный модуль `react-native-tcp-socket`. Для проверки нужен Development Build или TestFlight.

MAX может изменить закрытый протокол, после чего клиент потребуется обновить. Проект не связан с разработчиками MAX.

## Проверка проекта

```bash
npm install
npm run typecheck
npm run lint
npm run doctor
```

## Установка на iPhone через Rork / EAS

Репозиторий привязан к существующему проекту Rork через `slug` и `extra.eas.projectId` в `app.json`.

1. Дождаться синхронизации ветки `main` в Rork.
2. Для первой проверки выбрать iOS Development Build. Expo Go использовать нельзя.
3. Для TestFlight собрать профиль `production` и отправить его в App Store Connect.
4. При первом запуске EAS создаст или попросит выбрать новую запись приложения для bundle ID `com.volodevandrey.maxstories`.

Эквивалентные команды без интерфейса Rork:

```bash
npx eas-cli build --profile development --platform ios
npx eas-cli build --profile production --platform ios --auto-submit
```

В `eas.json` намеренно нет старого `ascAppId`: прежняя запись App Store относилась к приложению «РендерАИ» и не должна быть перезаписана.

## Структура

- `services/max/` — TCP/TLS, пакеты MessagePack/LZ4, авторизация и истории;
- `providers/MaxProvider.tsx` — состояние сессии и действий;
- `components/max/` — вход, лента и просмотрщик;
- `app/` — минимальная навигация Expo Router.

Реализация протокола основана на исследовании открытого проекта [Komet](https://github.com/komet-dev/komet). Условия и атрибуция приведены в `LICENSE` и `NOTICE.md`.
