@echo off
echo Running API Route Tests...
cd %~dp0\..
call venv\Scripts\activate
python scripts\test_api_routes.py
echo Test completed.
pause 