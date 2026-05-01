import React from 'react';
import { Card, Alert} from 'react-bootstrap';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const RiskChart = ({ data, title = "Risk Analysis" }) => {
  if (!data || !data.risks || typeof data.risks !== 'object') {
    return (
      <Card className="h-100">
        <Card.Body>
          <h6 className="card-title">{title}</h6>
          <p className="text-muted">No risk data available for this state</p>
        </Card.Body>
      </Card>
    );
  }

  // Extract earthquake_zone separately (string like "Zone III")
  const { earthquake_zone, ...otherRisksRaw } = data.risks;

  // Normalize earthquake zone string, e.g. "Zone III" -> "III"
  const normalizedEqZone = normalizeEarthquakeZone(earthquake_zone);

  // Filter other risks for pie chart (exclude null/undefined/empty/NaN)
  const validRisks = Object.entries(otherRisksRaw).filter(([key, value]) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed !== '' && trimmed.toLowerCase() !== 'nan';
    }
    if (typeof value === 'number') {
      return !isNaN(value);
    }
    return false;
  });

  if (validRisks.length === 0 && !normalizedEqZone) {
    return (
      <Card className="h-100">
        <Card.Body>
          <h6 className="card-title">{title}</h6>
          <p className="text-muted">No risk data available for this state</p>
        </Card.Body>
      </Card>
    );
  }

  const riskData = validRisks.map(([type, level]) => ({
    label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: typeof level === 'number' ? level : 1,
    originalValue: level,
    color: getRiskColor(type),
  }));

  const chartData = {
    labels: riskData.map(item => item.label),
    datasets: [
      {
        data: riskData.map(item => item.value),
        backgroundColor: riskData.map(item => item.color),
        borderColor: '#fff',
        borderWidth: 2,
        hoverBorderWidth: 3,
        hoverBorderColor: '#004AAD',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11,
            weight: '500',
          },
        },
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 16,
          weight: '600',
        },
        color: '#333',
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#004AAD',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function (context) {
            const label = context.label || '';
            const originalValue = riskData[context.dataIndex].originalValue;
            return `${label}: ${originalValue}`;
          },
        },
      },
    },
  };

  return (
    <Card className="h-100">
      <Card.Body>
        <div className="chart-container" style={{ height: '300px' }}>
          <Pie data={chartData} options={options} />
        </div>

        {/* Earthquake Zone Legend (all zones + highlight for this place) */}
        <EarthquakeZoneLegend currentZone={normalizedEqZone} rawValue={earthquake_zone} />

        {/* Health Alerts Section */}
        {data.health_alerts &&
          String(data.health_alerts).trim() !== '' &&
          String(data.health_alerts).toLowerCase() !== 'nan' && (
            <Alert variant="warning" className="mt-3 mb-2">
              <Alert.Heading className="h6">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Health Alerts
              </Alert.Heading>
              <p className="mb-0 small">{data.health_alerts}</p>
            </Alert>
          )}

        {/* Safety Suggestions Section */}
        {data.safety_suggestions &&
          String(data.safety_suggestions).trim() !== '' &&
          String(data.safety_suggestions).toLowerCase() !== 'nan' && (
            <Alert variant="info" className="mt-2 mb-0">
              <Alert.Heading className="h6">
                <i className="fas fa-shield-alt me-2"></i>
                Safety Suggestions
              </Alert.Heading>
              <p className="mb-0 small">{data.safety_suggestions}</p>
            </Alert>
          )}

        {/* Additional Risk Information */}
        {((data.major_disaster_years &&
          String(data.major_disaster_years).toLowerCase() !== 'nan') ||
          (data.hotspot_districts &&
            String(data.hotspot_districts).toLowerCase() !== 'nan')) && (
          <div className="mt-3 p-2 bg-light rounded">
            {data.major_disaster_years &&
              String(data.major_disaster_years).toLowerCase() !== 'nan' && (
                <div className="mb-2">
                  <small className="text-muted">
                    <i className="fas fa-calendar-times me-1"></i>
                    <strong>Major Disaster Years:</strong> {data.major_disaster_years}
                  </small>
                </div>
              )}
            {data.hotspot_districts &&
              String(data.hotspot_districts).toLowerCase() !== 'nan' && (
                <div>
                  <small className="text-muted">
                    <i className="fas fa-map-pin me-1"></i>
                    <strong>Hotspot Districts:</strong> {data.hotspot_districts}
                  </small>
                </div>
              )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

/**
 * Show all possible seismic zones (II, III, IV, V)
 * and highlight which one this place belongs to.
 */
const EarthquakeZoneLegend = ({ currentZone, rawValue }) => {
  const zones = [
    { id: 'II', label: 'Zone II (Low)', color: '#20c997' },
    { id: 'III', label: 'Zone III (Moderate)', color: '#ffc107' },
    { id: 'IV', label: 'Zone IV (High)', color: '#fd7e14' },
    { id: 'V', label: 'Zone V (Very High)', color: '#dc3545' },
  ];

  if (!currentZone) return null;

  return (
    <div
      className="mt-2 p-2 rounded"
      style={{ backgroundColor: '#f8f9fa', border: '1px solid #e0e0e0' }}
    >
      <div className="d-flex align-items-center mb-1">
        <i className="fas fa-bolt text-danger me-2" style={{ fontSize: '0.9rem' }}></i>
        <span className="fw-semibold" style={{ fontSize: '0.85rem' }}>
          Earthquake Seismic Zone
        </span>
      </div>

      <div className="mb-1 small text-muted" style={{ fontSize: '0.78rem' }}>
        This place lies in <strong>{rawValue || `Zone ${currentZone}`}</strong>.
      </div>

      <div className="d-flex flex-row align-items-center mt-1 flex-wrap">
        {zones.map(z => {
          const isActive = z.id === currentZone;
          return (
            <span
              key={z.id}
              className={`badge rounded-pill ${isActive ? '' : 'border border-secondary'}`}
              style={{
                backgroundColor: isActive ? z.color : '#fff',
                color: isActive ? '#fff' : '#495057',
                borderColor: isActive ? z.color : '#adb5bd',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.7rem',
                padding: '0.15rem 0.4rem',
                marginRight: '4px',
              }}
            >
              {z.label} {isActive}
            </span>
          );
        })}
      </div>
    </div>
  );
};



// Try to convert strings like "Zone III", "III", "3" to "II"/"III"/"IV"/"V"
const normalizeEarthquakeZone = (value) => {
  if (!value) return null;
  const str = String(value).trim().toUpperCase();

  if (str.includes('II') && !str.includes('III')) return 'II';
  if (str.includes('III') && !str.includes('IV')) return 'III';
  if (str.includes('IV') && !str.includes('V')) return 'IV';
  if (str.includes('V')) return 'V';

  if (str === '2' || str === 'ZONE 2') return 'II';
  if (str === '3' || str === 'ZONE 3') return 'III';
  if (str === '4' || str === 'ZONE 4') return 'IV';
  if (str === '5' || str === 'ZONE 5') return 'V';

  return null;
};

// Colors for pie chart risks (excluding earthquake_zone)
const getRiskColor = (riskType) => {
  const colorMap = {
    flood_risk: '#17a2b8',
    landslide_risk: '#6c757d',
    crime_rate: '#ffc107',
    accident_rate: '#fd7e14',
    cyclone_risk: '#6f42c1',
    drought_risk: '#e83e8c',
    forest_fire_risk: '#ff6b6b',
    sea_erosion_risk: '#20c997',
  };
  return colorMap[riskType] || '#004AAD';
};

export default RiskChart;
