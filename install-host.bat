@echo off
setlocal EnableDelayedExpansion

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ELEVATING] Requesting Administrator privileges to unlock HKLM policy...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process cmd.exe -ArgumentList '/k \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

echo ========================================================
echo  DoH-Switcher // Installing Native Policy Engine (Admin)
echo ========================================================

cd /d "%~dp0"
set "HOST_DIR=%~dp0"
set "HOST_DIR=%HOST_DIR:~0,-1%"
set "JSON_PATH=%HOST_DIR%\com.doh.switcher.json"
set "EXE_PATH=%HOST_DIR%\doh-host.exe"

:: 1. Write clean json manifest with absolute path to doh-host.exe
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

:: 2. Register Native Messaging Host in both HKCU and HKLM
REG ADD "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.doh.switcher" /ve /t REG_SZ /d "%JSON_PATH%" /f >nul
REG ADD "HKLM\Software\Google\Chrome\NativeMessagingHosts\com.doh.switcher" /ve /t REG_SZ /d "%JSON_PATH%" /f >nul
REG ADD "HKCU\Software\Microsoft\Edge\NativeMessagingHosts\com.doh.switcher" /ve /t REG_SZ /d "%JSON_PATH%" /f >nul
REG ADD "HKLM\Software\Microsoft\Edge\NativeMessagingHosts\com.doh.switcher" /ve /t REG_SZ /d "%JSON_PATH%" /f >nul

:: 3. Create Policy keys in HKLM and grant write control to Users (S-1-5-32-545)
REG ADD "HKLM\Software\Policies\Google\Chrome" /f >nul
REG ADD "HKLM\Software\Policies\Microsoft\Edge" /f >nul
REG DELETE "HKLM\Software\Policies\Google\Chrome" /ve /f >nul 2>&1
REG DELETE "HKLM\Software\Policies\Microsoft\Edge" /ve /f >nul 2>&1

powershell -NoProfile -Command "$acl = Get-Acl 'HKLM:\Software\Policies\Google\Chrome'; $rule = New-Object System.Security.AccessControl.RegistryAccessRule([System.Security.Principal.SecurityIdentifier]'S-1-5-32-545','FullControl','ContainerInherit,ObjectInherit','None','Allow'); $acl.SetAccessRule($rule); Set-Acl 'HKLM:\Software\Policies\Google\Chrome' $acl"
powershell -NoProfile -Command "$acl = Get-Acl 'HKLM:\Software\Policies\Microsoft\Edge'; $rule = New-Object System.Security.AccessControl.RegistryAccessRule([System.Security.Principal.SecurityIdentifier]'S-1-5-32-545','FullControl','ContainerInherit,ObjectInherit','None','Allow'); $acl.SetAccessRule($rule); Set-Acl 'HKLM:\Software\Policies\Microsoft\Edge' $acl"

echo.
echo [SUCCESS] Native Policy Engine installed and unlocked!
echo Chrome will now apply DNS-over-HTTPS in 1-click without any admin prompts.
echo.
pause
