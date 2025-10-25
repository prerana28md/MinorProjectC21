import React, { useEffect, useState, useCallback } from 'react';
import { Card, Spinner, Alert } from 'react-bootstrap';
import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000';

const WeatherCard = ({ cityName, stateName, title = "Weather Forecast" }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchWeather = useCallback(async () => {
    if (!cityName && !stateName) return;

    setLoading(true);
    setError(null);

    try {
      let response;
      if (cityName) {
        response = await axios.get(`${API_BASE_URL}/weather/city/${cityName}`);
      } else if (stateName) {
        response = await axios.get(`${API_BASE_URL}/weather/state/${stateName}`);
      }

      console.log('Weather data:', response.data);
      setWeather(response.data);
    } catch (err) {
      console.error('Error fetching weather:', err);
      setError('Unable to fetch weather data');
    } finally {
      setLoading(false);
    }
  }, [cityName, stateName]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  const getWeatherIcon = (condition) => {
    const cond = condition?.toLowerCase() || '';
    if (cond.includes('rain')) return '🌧️';
    if (cond.includes('cloud')) return '☁️';
    if (cond.includes('clear') || cond.includes('sun')) return '☀️';
    if (cond.includes('storm') || cond.includes('thunder')) return '⛈️';
    if (cond.includes('snow')) return '❄️';
    if (cond.includes('mist') || cond.includes('fog')) return '🌫️';
    return '🌤️';
  };

  const getBackgroundGradient = (condition) => {
    const cond = condition?.toLowerCase() || '';
    if (cond.includes('rain')) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    if (cond.includes('cloud')) return 'linear-gradient(135deg, #b7c3d7 0%, #8e9eab 100%)';
    if (cond.includes('clear') || cond.includes('sun')) return 'linear-gradient(135deg, #FFD89B 0%, #19547B 100%)';
    if (cond.includes('storm')) return 'linear-gradient(135deg, #434343 0%, #000000 100%)';
    if (cond.includes('mist') || cond.includes('fog')) return 'linear-gradient(135deg, #d3d3d3 0%, #a9a9a9 100%)';
    return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  };

  if (loading) {
    return (
      <Card className="h-100 shadow-lg">
        <Card.Body className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" />
            <p className="text-muted mt-3">Loading weather data...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-100 shadow-lg">
        <Card.Body>
          <Alert variant="warning" className="mb-0">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!weather) {
    return (
      <Card className="h-100 shadow-lg">
        <Card.Body className="text-center">
          <i className="fas fa-cloud-sun fa-3x text-muted mb-3"></i>
          <p className="text-muted mb-0">No weather data available</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="h-100 shadow-lg border-0 overflow-hidden">
      {/* Header with gradient */}
      <div 
        style={{ 
          background: getBackgroundGradient(weather.condition),
          padding: '20px',
          color: 'white'
        }}
      >
        <h6 className="mb-0">
          <i className="fas fa-map-marker-alt me-2"></i>
          {cityName || stateName || 'Weather'}
        </h6>
        {weather.representative_city && (
          <small style={{ opacity: 0.9 }}>
            Data from {weather.representative_city}
          </small>
        )}
      </div>

      <Card.Body>
        {/* Main weather display */}
        <div className="text-center mb-4">
          <div style={{ fontSize: '5rem', lineHeight: 1 }}>
            {getWeatherIcon(weather.condition)}
          </div>
          <h2 className="display-4 fw-bold mb-2" style={{ color: '#2c3e50' }}>
            {weather.temperature}°C
          </h2>
          <p className="text-uppercase fw-semibold mb-1" style={{ color: '#7f8c8d', letterSpacing: '1px' }}>
            {weather.condition}
          </p>
          <small className="text-muted">
            <i className="fas fa-temperature-high me-1"></i>
            Feels like {weather.feels_like}°C
          </small>
        </div>

        <hr className="my-3" style={{ opacity: 0.2 }} />

        {/* Weather details grid */}
        <div className="row g-3">
          <div className="col-6">
            <div className="d-flex align-items-center p-2 rounded" style={{ backgroundColor: '#e3f2fd' }}>
              <div className="me-3" style={{ fontSize: '1.5rem' }}>
                <i className="fas fa-tint text-info"></i>
              </div>
              <div>
                <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Humidity</small>
                <strong style={{ fontSize: '1.1rem' }}>{weather.humidity}%</strong>
              </div>
            </div>
          </div>

          <div className="col-6">
            <div className="d-flex align-items-center p-2 rounded" style={{ backgroundColor: '#f3e5f5' }}>
              <div className="me-3" style={{ fontSize: '1.5rem' }}>
                <i className="fas fa-compress-arrows-alt text-secondary"></i>
              </div>
              <div>
                <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Pressure</small>
                <strong style={{ fontSize: '1.1rem' }}>{weather.pressure} hPa</strong>
              </div>
            </div>
          </div>

          <div className="col-6">
            <div className="d-flex align-items-center p-2 rounded" style={{ backgroundColor: '#e8f5e9' }}>
              <div className="me-3" style={{ fontSize: '1.5rem' }}>
                <i className="fas fa-wind text-success"></i>
              </div>
              <div>
                <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Wind Speed</small>
                <strong style={{ fontSize: '1.1rem' }}>{weather.wind_speed} m/s</strong>
              </div>
            </div>
          </div>

          {weather.visibility !== undefined && weather.visibility > 0 && (
            <div className="col-6">
              <div className="d-flex align-items-center p-2 rounded" style={{ backgroundColor: '#fff3e0' }}>
                <div className="me-3" style={{ fontSize: '1.5rem' }}>
                  <i className="fas fa-eye text-warning"></i>
                </div>
                <div>
                  <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Visibility</small>
                  <strong style={{ fontSize: '1.1rem' }}>{weather.visibility.toFixed(1)} km</strong>
                </div>
              </div>
            </div>
          )}

          {weather.clouds !== undefined && (
            <div className="col-12">
              <div className="d-flex align-items-center p-2 rounded" style={{ backgroundColor: '#fce4ec' }}>
                <div className="me-3" style={{ fontSize: '1.5rem' }}>
                  <i className="fas fa-cloud text-danger"></i>
                </div>
                <div className="flex-grow-1">
                  <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>Cloud Cover</small>
                  <div className="progress mt-1" style={{ height: '8px' }}>
                    <div 
                      className="progress-bar bg-danger" 
                      role="progressbar" 
                      style={{ width: `${weather.clouds}%` }}
                      aria-valuenow={weather.clouds} 
                      aria-valuemin="0" 
                      aria-valuemax="100"
                    ></div>
                  </div>
                  <strong style={{ fontSize: '1.1rem' }}>{weather.clouds}%</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default WeatherCard;
