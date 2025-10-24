import React, { useState, useEffect, useCallback } from 'react';
import { Card, Spinner, Alert } from 'react-bootstrap';
import { weatherAPI } from '../services/api';

const WeatherCard = ({ cityName, stateName, title = "Weather Forecast" }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (cityName) {
        response = await weatherAPI.getCityWeather(cityName);
      } else if (stateName) {
        response = await weatherAPI.getStateWeather(stateName);
      }
      setWeather(response.data);
    } catch (err) {
      setError('Failed to fetch weather data');
      console.error('Weather fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [cityName, stateName]);

  useEffect(() => {
    if (cityName || stateName) {
      fetchWeather();
    }
  }, [cityName, stateName, fetchWeather]);

  const getWeatherIcon = (condition) => {
    const conditionLower = condition?.toLowerCase() || '';
    if (conditionLower.includes('sunny') || conditionLower.includes('clear')) {
      return '☀️';
    } else if (conditionLower.includes('cloud')) {
      return '☁️';
    } else if (conditionLower.includes('rain')) {
      return '🌧️';
    } else if (conditionLower.includes('storm')) {
      return '⛈️';
    } else if (conditionLower.includes('snow')) {
      return '❄️';
    } else {
      return '🌤️';
    }
  };

  if (loading) {
    return (
      <Card className="h-100">
        <Card.Body className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2">Loading weather data...</p>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-100">
        <Card.Body>
          <Alert variant="warning" className="mb-0">
            {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card className="h-100">
        <Card.Body>
          <h6 className="card-title">{title}</h6>
          <p className="text-muted">No weather data available</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-3">
          <h6 className="card-title mb-0">{title}</h6>
          <span className="fs-1">{getWeatherIcon(weather.condition)}</span>
        </div>
        
        <div className="row g-3">
          <div className="col-6">
            <div className="text-center">
              <div className="fs-4 fw-bold text-primary">{weather.temperature}°C</div>
              <small className="text-muted">Temperature</small>
            </div>
          </div>
          <div className="col-6">
            <div className="text-center">
              <div className="fs-4 fw-bold text-info">{weather.humidity}%</div>
              <small className="text-muted">Humidity</small>
            </div>
          </div>
          <div className="col-6">
            <div className="text-center">
              <div className="fs-5 fw-bold text-success">{weather.wind_speed} km/h</div>
              <small className="text-muted">Wind Speed</small>
            </div>
          </div>
          <div className="col-6">
            <div className="text-center">
              <div className="fs-5 fw-bold text-warning">{weather.pressure} hPa</div>
              <small className="text-muted">Pressure</small>
            </div>
          </div>
        </div>
        
        {weather.condition && (
          <div className="mt-3 text-center">
            <small className="text-muted">{weather.condition}</small>
          </div>
        )}
        
        {weather.forecast && weather.forecast.length > 0 && (
          <div className="mt-3">
            <small className="text-muted d-block mb-2">3-Day Forecast:</small>
            <div className="d-flex justify-content-between">
              {weather.forecast.slice(0, 3).map((day, index) => (
                <div key={index} className="text-center">
                  <div className="small">{day.day}</div>
                  <div className="small">{day.temp}°C</div>
                  <div className="small">{getWeatherIcon(day.condition)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default WeatherCard;
