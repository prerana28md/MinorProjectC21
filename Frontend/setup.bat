@echo off
echo 🚀 Setting up Tourism Dashboard React App...

echo 📦 Creating React app...
npx create-react-app tourism-dashboard --yes

echo 📥 Installing dependencies...
cd tourism-dashboard
npm install axios react-bootstrap bootstrap react-router-dom chart.js react-chartjs-2

echo 📁 Creating directory structure...
mkdir src\components
mkdir src\pages
mkdir src\services

echo ✅ Setup complete!
echo.
echo 📋 Next steps:
echo 1. Copy all the provided files to your project
echo 2. Replace existing files with the new ones
echo 3. Run: npm start
echo 4. Open: http://localhost:3000
echo.
echo 🔧 Make sure your Flask backend is running on http://127.0.0.1:5000

pause

