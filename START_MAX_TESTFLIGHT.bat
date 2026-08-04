@echo off
setlocal EnableExtensions
title MAX Stories - Setup
set "APP_DIR=%USERPROFILE%\MAX-iPhone"
set "REPO_URL=https://github.com/volodevandrey/rork-ai----.git"

echo.
echo ================================================
echo   MAX STORIES - TESTFLIGHT SETUP
echo ================================================
echo.

where git >nul 2>nul
if errorlevel 1 goto no_git

where node >nul 2>nul
if errorlevel 1 goto no_node

if exist "%APP_DIR%\.git" goto update_repo
if exist "%APP_DIR%" set "APP_DIR=%USERPROFILE%\MAX-iPhone-%RANDOM%"
goto clone_repo

:update_repo
echo Updating %APP_DIR%...
git -C "%APP_DIR%" pull --ff-only
if errorlevel 1 goto fail
goto run_build

:clone_repo
echo Downloading the app to %APP_DIR%...
git clone --depth 1 "%REPO_URL%" "%APP_DIR%"
if errorlevel 1 goto fail

:run_build
if not exist "%APP_DIR%\TESTFLIGHT.bat" goto no_build_file
call "%APP_DIR%\TESTFLIGHT.bat"
exit /b %errorlevel%

:no_git
echo ERROR: Git is not installed or not available in PATH.
echo Install Git for Windows from https://git-scm.com/download/win
goto fail

:no_node
echo ERROR: Node.js is not installed or not available in PATH.
echo Install Node.js LTS from https://nodejs.org/
goto fail

:no_build_file
echo ERROR: TESTFLIGHT.bat was not found after downloading the project.
goto fail

:fail
echo.
echo SETUP FAILED. Send a screenshot of the last lines in this window.
pause
exit /b 1
