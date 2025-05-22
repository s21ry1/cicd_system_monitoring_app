@echo off
echo Starting System Monitor...

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Python is not installed or not in PATH. Please install Python 3.7 or higher.
    pause
    exit /b
)

REM Check if virtual environment exists, create if it doesn't
if not exist venv\ (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate

REM Install dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Run the application
echo Starting System Monitor application...
cd app
python app.py

REM Deactivate virtual environment on exit
call venv\Scripts\deactivate 