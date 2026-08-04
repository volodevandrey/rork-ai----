@echo off
setlocal EnableExtensions
title MAX Stories - iOS Build
cd /d "%~dp0"

echo.
echo ================================================
echo   MAX STORIES - BUILD AND SEND TO TESTFLIGHT
echo ================================================
echo.

if not exist "package.json" goto no_project
where node >nul 2>nul
if errorlevel 1 goto no_node
where npm >nul 2>nul
if errorlevel 1 goto no_npm

if exist ".git" goto update_repo
goto install_deps

:update_repo
echo [1/5] Updating the app from GitHub...
git pull --ff-only
if errorlevel 1 goto update_failed

:install_deps
echo.
echo [2/5] Installing dependencies...
call npm install
if errorlevel 1 goto fail

echo.
echo [3/5] Checking Expo login...
call npx --yes eas-cli@latest whoami >nul 2>nul
if not errorlevel 1 goto init_project
echo Sign in to Expo in this window.
call npx --yes eas-cli@latest login
if errorlevel 1 goto fail

:init_project
echo.
echo [4/5] Checking the Expo project link...
call npx --yes eas-cli@latest init
if errorlevel 1 goto fail

echo.
echo [5/5] Building the iOS app and sending it to TestFlight...
echo Enter Apple login and 2FA only in this window.
call npx --yes testflight
if errorlevel 1 goto fail

echo.
echo DONE. Wait for Apple processing, then open TestFlight on the iPhone.
pause
exit /b 0

:no_project
echo ERROR: Run this file from the project folder next to package.json.
goto fail

:no_node
echo ERROR: Node.js is not installed or not available in PATH.
goto fail

:no_npm
echo ERROR: npm is not available in PATH.
goto fail

:update_failed
echo ERROR: GitHub update failed. The build was stopped to avoid using old code.
goto fail

:fail
echo.
echo BUILD FAILED. Send a screenshot of the last lines in this window.
pause
exit /b 1
