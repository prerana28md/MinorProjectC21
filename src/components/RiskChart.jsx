import React from 'react';
import { Card, Alert } from 'react-bootstrap';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const RiskChart = ({ data, title = "Risk Analysis" }) => {
  // Check if data exists and has valid risk entries
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

  // Filter: Include ALL valid values (numbers and strings), exclude only null/undefined/empty/NaN
  const validRisks = Object.entries(data.risks).filter(([key, value]) => {
    // Exclude null and undefined
    if (value === null || value === undefined) return false;
    
    // For strings: include if non-empty and not "NaN"
    if (typeof value === 'string') {
      const trimmed = value.trim();
      return trimmed !== '' && trimmed !== 'NaN';
    }
    
    // For numbers: include ALL numbers (including 0 and small decimals)
    if (typeof value === 'number') {
      return !isNaN(value); // Only exclude actual NaN values
    }
    
    return false;
  });

  if (validRisks.length === 0) {
    return (
      <Card className="h-100">
        <Card.Body>
          <h6 className="card-title">{title}</h6>
          <p className="text-muted">No risk data available for this state</p>
        </Card.Body>
      </Card>
    );
  }

  // Convert risks to chart data format
  const riskData = validRisks.map(([type, level]) => ({
    label: type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    value: typeof level === 'number' ? level : 1, // Use 1 for string values like "Zone III"
    originalValue: level,
    color: getRiskColor(type)
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
          label: function(context) {
            const label = context.label || '';
            const originalValue = riskData[context.dataIndex].originalValue;
            // Show original value (including strings like "Zone III")
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
        
        {/* Health Alerts Section */}
        {data.health_alerts && 
         String(data.health_alerts).trim() !== '' && 
         String(data.health_alerts) !== 'NaN' && 
         String(data.health_alerts) !== 'nan' && (
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
         String(data.safety_suggestions) !== 'NaN' && 
         String(data.safety_suggestions) !== 'nan' && (
          <Alert variant="info" className="mt-2 mb-0">
            <Alert.Heading className="h6">
              <i className="fas fa-shield-alt me-2"></i>
              Safety Suggestions
            </Alert.Heading>
            <p className="mb-0 small">{data.safety_suggestions}</p>
          </Alert>
        )}

        {/* Additional Risk Information */}
        {((data.major_disaster_years && String(data.major_disaster_years) !== 'NaN') || 
          (data.hotspot_districts && String(data.hotspot_districts) !== 'NaN')) && (
          <div className="mt-3 p-2 bg-light rounded">
            {data.major_disaster_years && String(data.major_disaster_years) !== 'NaN' && (
              <div className="mb-2">
                <small className="text-muted">
                  <i className="fas fa-calendar-times me-1"></i>
                  <strong>Major Disaster Years:</strong> {data.major_disaster_years}
                </small>
              </div>
            )}
            {data.hotspot_districts && String(data.hotspot_districts) !== 'NaN' && (
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

// Enhanced color mapping with unique colors for each risk type
const getRiskColor = (riskType) => {
  const colorMap = {
    'flood_risk': '#17a2b8',        // Cyan
    'landslide_risk': '#6c757d',    // Gray
    'earthquake_zone': '#dc3545',   // Red
    'crime_rate': '#ffc107',        // Yellow
    'accident_rate': '#fd7e14',     // Orange
    'cyclone_risk': '#6f42c1',      // Purple
    'drought_risk': '#e83e8c',      // Pink
    'forest_fire_risk': '#ff6b6b',  // Light Red
    'sea_erosion_risk': '#20c997',  // Teal
  };
  
  return colorMap[riskType] || '#004AAD'; // Default blue
};

export default RiskChart;
