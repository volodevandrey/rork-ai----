@echo off
setlocal
chcp 65001 >nul
title Истории MAX - запуск установки
set "APP_DIR=%USERPROFILE%\MAX-iPhone"
set "REPO_URL=https://github.com/volodevandrey/rork-ai----.git"

echo.
echo ================================================
echo   ИСТОРИИ MAX - ПОДГОТОВКА К TESTFLIGHT
echo ================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo ОШИБКА: Git не найден.
  echo Установите Git for Windows: https://git-scm.com/download/win
  goto :fail
)

where node >nul 2>nul
if errorlevel 1 (
  echo ОШИБКА: Node.js не найден.
  echo Установите Node.js LTS: https://nodejs.org/
  goto :fail
)

if exist "%APP_DIR%\.git" (
  echo Обновляю существующую папку %APP_DIR%...
  git -C "%APP_DIR%" pull --ff-only
  if errorlevel 1 goto :fail
) else (
  if exist "%APP_DIR%" (
    set "APP_DIR=%USERPROFILE%\MAX-iPhone-%RANDOM%"
  )
  echo Скачиваю приложение в %APP_DIR%...
  git clone --depth 1 "%REPO_URL%" "%APP_DIR%"
  if errorlevel 1 goto :fail
)

if not exist "%APP_DIR%\TESTFLIGHT.bat" (
  echo ОШИБКА: TESTFLIGHT.bat не найден после загрузки проекта.
  goto :fail
)

call "%APP_DIR%\TESTFLIGHT.bat"
exit /b %errorlevel%

:fail
echo.
echo ЗАПУСК НЕ ЗАВЕРШЕН. Сфотографируйте последние строки этого окна и пришлите мне.
pause
exit /b 1
