@echo off
echo KaAi - Build EXE
echo ===============
echo.

echo 1) Bagimliliklar yukleniyor...
call npm install
if %errorlevel% neq 0 (
  echo npm install basarisiz! Node.js yuklu mu?
  pause
  exit /b 1
)

echo.
echo 2) EXE olusturuluyor...
call npm run build:win
if %errorlevel% neq 0 (
  echo Build hatasi!
  pause
  exit /b 1
)

echo.
echo Basarili! dist/ klasorune bakin.
echo Kurulum dosyasi: KaAi-Setup-*.exe
pause
