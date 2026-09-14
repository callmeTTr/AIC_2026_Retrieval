@echo off
setlocal

cd /d "%~dp0"

if not exist ".venv\Scripts\python.exe" (
    echo [ERROR] Bridge virtual environment was not found.
    echo.
    echo Create it first with:
    echo   python -m venv .venv
    echo   .venv\Scripts\python.exe -m pip install -r requirements.txt
    echo.
    exit /b 1
)

echo Starting AIC DRES Bridge...
echo Host: 127.0.0.1
echo Port: 8765
echo Workers: 1
echo.

".venv\Scripts\python.exe" -m uvicorn bridge:app ^
    --host 127.0.0.1 ^
    --port 8765 ^
    --workers 1

endlocal