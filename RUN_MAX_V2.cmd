@echo off
setlocal EnableExtensions
title MAX Stories V2
set "APP_DIR=%USERPROFILE%\MAX-iPhone-v2"
set "REPO_URL=https://github.com/volodevandrey/rork-ai----.git"

echo MAX Stories V2
echo.

where git >nul 2>nul
if errorlevel 1 goto no_git
where node >nul 2>nul
if errorlevel 1 goto no_node

if exist "%APP_DIR%\.git" goto update
if exist "%APP_DIR%" set "APP_DIR=%USERPROFILE%\MAX-iPhone-v2-%RANDOM%"
goto clone

:update
echo Updating project...
git -C "%APP_DIR%" pull --ff-only
if errorlevel 1 goto fail
goto run

:clone
echo Downloading project...
git clone --depth 1 "%REPO_URL%" "%APP_DIR%"
if errorlevel 1 goto fail

:run
echo Starting TestFlight build...
call "%APP_DIR%\TESTFLIGHT.bat"
exit /b %errorlevel%

:no_git
echo ERROR: Git is missing. Install it from https://git-scm.com/download/win
goto fail

:no_node
echo ERROR: Node.js is missing. Install it from https://nodejs.org/
goto fail

:fail
echo.
echo FAILED. Send a screenshot of this window.
pause
exit /b 1
