Setting the OpenWeatherMap API key for the Tourism Risk Dashboard (Windows PowerShell)

This project reads the OpenWeatherMap API key from the environment variable `WEATHER_API_KEY` (or fallback `OPENWEATHER_API_KEY`).

1) Obtain an API key
   - Sign up at https://openweathermap.org/ and get an API key (APPID).

2) Set the environment variable in PowerShell for the current session

   # Replace <your_key> with the key you received
   $env:WEATHER_API_KEY = "<your_key>"

3) Persist the variable for all future PowerShell sessions (user-level)

   [Environment]::SetEnvironmentVariable("WEATHER_API_KEY", "<your_key>", "User")

4) Restart your terminal or IDE after persisting the environment variable so the process can pick it up.

Notes:
- The app will return a helpful 500 response if the key is not configured and a 401 if the key is invalid.
- You can also set the variable name `OPENWEATHER_API_KEY` if you prefer that naming.
