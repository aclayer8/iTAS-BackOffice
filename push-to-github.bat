@echo off
set PATH=%PATH%;C:\Program Files\Git\bin;C:\Program Files\Git\cmd

cd /d "C:\Users\anurak\OneDrive - i-tas.co.th\Documents\Claude\Projects\iTAS - BackOffice System\iTAS-BackOffice"

echo [1/3] Staging changes...
git add .

echo [2/3] Committing...
git commit -m "fix: ts type error in api-helpers oldValues"

echo [3/3] Pushing...
git push origin main --force

echo.
echo Done! Cloudflare will rebuild automatically.
pause
