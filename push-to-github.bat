@echo off
echo ========================================
echo  iTAS BackOffice - Push to GitHub
echo ========================================

:: Add git to PATH
set PATH=%PATH%;C:\Program Files\Git\bin;C:\Program Files\Git\cmd

cd /d "C:\Users\anurak\OneDrive - i-tas.co.th\Documents\Claude\Projects\iTAS - BackOffice System\iTAS-BackOffice"

echo Current directory:
cd

echo.
echo [0/5] Removing old .git folder...
rmdir /s /q ".git" 2>nul
echo Done.

echo [1/5] Init fresh repo...
git init
git branch -M main

echo [2/5] Setting remote...
git remote add origin https://github.com/aclayer8/iTAS-BackOffice.git

echo [3/5] Staging files...
git add .
git status

echo [4/5] Committing...
git commit -m "feat: iTAS BackOffice - Next.js + Prisma + Neon"

echo [5/5] Pushing...
git push -u origin main

echo.
echo ========================================
echo  Done!
echo ========================================
pause
