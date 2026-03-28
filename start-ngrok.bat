@echo off
echo 正在启动 ngrok HTTPS 隧道...
echo.
echo 请等待...
echo.
start /b ngrok http 3000 --log=stdout > ngrok.log 2>&1
timeout /t 5 /nobreak >nul

:wait_for_ngrok
timeout /t 2 /nobreak >nul
findstr "url" ngrok.log >nul
if errorlevel 1 goto wait_for_ngrok

echo.
echo ==========================================
echo  ngrok 已启动！
echo ==========================================
echo.
type ngrok.log | findstr "url"
echo.
echo 请用手机浏览器访问上面的 HTTPS 链接
echo.
echo 按任意键停止 ngrok...
pause >nul

taskkill /F /IM ngrok.exe 2>nul
del ngrok.log 2>nul
