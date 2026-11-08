@echo off
setlocal
echo ====================================================
echo  DoH-Switcher // Resetting Chrome Policies
echo ====================================================

:: Remove Chrome and Edge DoH policies
REG DELETE "HKCU\Software\Policies\Google\Chrome" /v DnsOverHttpsMode /f >nul 2>&1
REG DELETE "HKCU\Software\Policies\Google\Chrome" /v DnsOverHttpsTemplates /f >nul 2>&1
REG DELETE "HKCU\Software\Policies\Google\Chrome" /ve /f >nul 2>&1
REG DELETE "HKLM\Software\Policies\Google\Chrome" /v DnsOverHttpsMode /f >nul 2>&1
REG DELETE "HKLM\Software\Policies\Google\Chrome" /v DnsOverHttpsTemplates /f >nul 2>&1
REG DELETE "HKLM\Software\Policies\Google\Chrome" /ve /f >nul 2>&1

REG DELETE "HKCU\Software\Policies\Microsoft\Edge" /v DnsOverHttpsMode /f >nul 2>&1
REG DELETE "HKCU\Software\Policies\Microsoft\Edge" /v DnsOverHttpsTemplates /f >nul 2>&1
REG DELETE "HKCU\Software\Policies\Microsoft\Edge" /ve /f >nul 2>&1
REG DELETE "HKLM\Software\Policies\Microsoft\Edge" /v DnsOverHttpsMode /f >nul 2>&1
REG DELETE "HKLM\Software\Policies\Microsoft\Edge" /v DnsOverHttpsTemplates /f >nul 2>&1
REG DELETE "HKLM\Software\Policies\Microsoft\Edge" /ve /f >nul 2>&1

echo.
echo [SUCCESS] Chrome policies removed!
echo Notice "Managed by your organization" will disappear after Chrome restart.
echo.
pause
