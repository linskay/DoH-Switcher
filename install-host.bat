@echo off
setlocal
echo ====================================================
echo  DoH-Switcher // Installing Native Policy Engine
echo ====================================================

set "HOST_DIR=%~dp0"
set "HOST_DIR=%HOST_DIR:~0,-1%"
set "JSON_PATH=%HOST_DIR%\com.doh.switcher.json"
set "EXE_PATH=%HOST_DIR%\doh-host.exe"

:: Replace relative path with absolute path in json if needed
(
  echo {
  echo   "name": "com.doh.switcher",
  echo   "description": "DoH Switcher Native Policy Host",
  echo   "path": "%EXE_PATH:\=\\%",
  echo   "type": "stdio",
  echo   "allowed_origins": [
  echo     "chrome-extension://pbjakpldedlnafhfamcldkgghgejdakd/"
  echo   ]
  echo }
) > "%JSON_PATH%"

:: Register Native Messaging Host for Google Chrome
REG ADD "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.doh.switcher" /ve /t REG_SZ /d "%JSON_PATH%" /f >nul

:: Register for Microsoft Edge
REG ADD "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.doh.switcher" /ve /t REG_SZ /d "%JSON_PATH%" /f >nul

:: Register for Chromium
REG ADD "HKCU\Software\Chromium\NativeMessagingHosts\com.doh.switcher" /ve /t REG_SZ /d "%JSON_PATH%" /f >nul

echo.
echo [SUCCESS] Native Policy Host registered successfully!
echo Extension will now automatically change DNS in 1 click.
echo.
pause
