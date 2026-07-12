@echo off
echo Starting backend server in a new window...
start cmd /k "cd /d \"%~dp0backend\" && npm run dev"

echo Starting frontend server in a new window...
start cmd /k "cd /d \"%~dp0frontend\" && npm run dev"

echo Both servers are starting up!
pause
