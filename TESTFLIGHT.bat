@echo off
setlocal
chcp 65001 >nul
title Истории MAX - отправка в TestFlight
cd /d "%~dp0"

echo.
echo ================================================
echo   ИСТОРИИ MAX - СБОРКА И ОТПРАВКА В TESTFLIGHT
echo ================================================
echo.

if not exist "package.json" (
  echo ОШИБКА: файл должен находиться в папке проекта рядом с package.json.
  goto :fail
)

where node >nul 2>nul
if errorlevel 1 (
  echo ОШИБКА: Node.js не установлен или не добавлен в PATH.
  echo Установите Node.js LTS: https://nodejs.org/
  goto :fail
)

where npm >nul 2>nul
if errorlevel 1 (
  echo ОШИБКА: npm не найден.
  goto :fail
)

if exist ".git" (
  echo [1/5] Получаю последнюю версию приложения из GitHub...
  git pull --ff-only
  if errorlevel 1 (
    echo.
    echo Не удалось обновить проект. Сборка остановлена, чтобы не отправить старую версию.
    goto :fail
  )
) else (
  echo [1/5] Папка без Git. Использую находящийся в ней код.
)

echo.
echo [2/5] Устанавливаю зависимости...
call npm install
if errorlevel 1 goto :fail

echo.
echo [3/5] Проверяю вход в Expo...
call npx eas-cli@latest whoami >nul 2>nul
if errorlevel 1 (
  echo Войдите в Expo. Пароль вводится только в этом окне.
  call npx eas-cli@latest login
  if errorlevel 1 goto :fail
)

echo.
echo [4/5] Создаю или подключаю проект Expo...
echo Если появится вопрос Create a project, нажмите Enter.
call npx eas-cli@latest init
if errorlevel 1 goto :fail

echo.
echo [5/5] Собираю iOS-приложение и отправляю в TestFlight...
echo Дальше отвечайте на вопросы Apple и вводите код 2FA только в этом окне.
call npx testflight
if errorlevel 1 goto :fail

echo.
echo ГОТОВО. После обработки Apple приложение появится в TestFlight.
echo Откройте TestFlight на iPhone и установите Истории MAX.
pause
exit /b 0

:fail
echo.
echo СБОРКА НЕ ЗАВЕРШЕНА. Сфотографируйте последние строки этого окна и пришлите мне.
pause
exit /b 1
