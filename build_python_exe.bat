@echo off
echo KaAi - Python EXE Build
echo =======================
echo.

echo 1) Python bagimliliklari yukleniyor...
pip install -r requirements.txt
if %errorlevel% neq 0 pause && exit /b 1

echo.
echo 2) EXE olusturuluyor (PyInstaller)...
pyinstaller --name KaAi --windowed --icon=assets/icon.ico --add-data "src;src" --add-data "assets;assets" app.py

echo.
echo Basarili! dist/KaAi/ klasorune bakin.
echo KaAi.exe buradadir.
pause
