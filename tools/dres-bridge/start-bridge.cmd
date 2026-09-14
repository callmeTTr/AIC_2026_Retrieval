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

if exist ".env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
        if not "%%A"=="" set "%%A=%%B"
    )
)

if not defined BRIDGE_HOST set "BRIDGE_HOST=127.0.0.1"
if not defined BRIDGE_PORT set "BRIDGE_PORT=8765"

echo Starting AIC DRES Bridge...
echo Host: %BRIDGE_HOST%
echo Port: %BRIDGE_PORT%
echo Workers: 1
echo.

".venv\Scripts\python.exe" -m uvicorn bridge:app ^
    --host %BRIDGE_HOST% ^
    --port %BRIDGE_PORT% ^
    --workers 1

endlocal