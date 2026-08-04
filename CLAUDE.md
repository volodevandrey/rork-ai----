# Инструкции для работы с проектом

- Интерфейс и ответы владельцу — на русском языке.
- Главная задача проекта — доступ к историям MAX на iPhone.
- Не заменять TCP/TLS на HTTP или WebSocket: `api.oneme.ru:443` использует собственный бинарный протокол.
- Не обещать работу в Expo Go: `react-native-tcp-socket` требует Development Build/TestFlight.
- Перед публикацией выполнять `npm run typecheck`, `npm run lint`, `npm run doctor` и iOS export/prebuild.
- Не возвращать старые экраны и зависимости приложения «РендерАИ».
- Bundle ID этого приложения: `com.volodevandrey.maxstories`.
- Expo/EAS project ID оставлен прежним, чтобы Rork продолжил синхронизацию репозитория.
- Старый App Store Connect ID удалён: новое приложение нельзя отправлять в запись «РендерАИ».

Закрытый протокол MAX может меняться. При ошибках сначала сверять opcodes и формат payload с актуальным Komet, затем обновлять `APP_VERSION`/`BUILD_NUMBER` в `services/max/MaxClient.ts`.
