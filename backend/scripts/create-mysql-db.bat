@echo off
REM Creates the amaz database. Edit ROOT_PASSWORD below if needed.
set ROOT_PASSWORD=YOUR_MYSQL_ROOT_PASSWORD
set MYSQL="C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

%MYSQL% -u root -p%ROOT_PASSWORD% -e "CREATE DATABASE IF NOT EXISTS amaz CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; CREATE USER IF NOT EXISTS 'amaz'@'localhost' IDENTIFIED BY 'amaz123'; GRANT ALL PRIVILEGES ON amaz.* TO 'amaz'@'localhost'; FLUSH PRIVILEGES;"

if %ERRORLEVEL% NEQ 0 (
  echo Failed. Update ROOT_PASSWORD in this script to your MySQL root password.
  exit /b 1
)

echo Database amaz ready. User amaz / amaz123
echo Set backend\.env DATABASE_URL to:
echo mysql://amaz:amaz123@localhost:3306/amaz
