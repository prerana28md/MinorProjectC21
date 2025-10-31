import React from 'react';
import { Card } from 'react-bootstrap';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Define a modern color palette
const MODERN_BLUE_LIGHT = '#88d4e1'; // Light blue for gradient start
const MODERN_BLUE_DARK = '#007bff';  // Primary blue for gradient end & line base
const MODERN_TEXT_COLOR = '#495057'; // Darker gray for general text
const MODERN_SECONDARY_TEXT = '#6c757d'; // Lighter gray for secondary text
const MODERN_GRID_COLOR = 'rgba(220, 220, 220, 0.4)'; // Light, transparent grid

const TrendChart = ({ data, title = "Tourism Trends" }) => {
  if (!data || !data.trends) {
    return (
      <Card className="h-100 shadow-lg border-0 rounded-3"> {/* Enhanced shadow and rounded corners */}
        <Card.Body>
          <h6 className="card-title text-muted">{title}</h6>
          <p className="text-muted">No trend data available</p>
        </Card.Body>
      </Card>
    );
  }

  // Function to create a linear gradient for the chart fill
  const createFillGradient = (ctx, chartArea) => {
    if (!chartArea) return null;
    const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    gradient.addColorStop(0, 'rgba(0, 123, 255, 0.05)'); // Very light blue
    gradient.addColorStop(1, 'rgba(136, 212, 225, 0.3)');  // Light blue for a soft glow
    return gradient;
  };

  // Function to create a linear gradient for the line itself
  const createLineGradient = (ctx, chartArea) => {
    if (!chartArea) return null;
    const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0);
    gradient.addColorStop(0, MODERN_BLUE_LIGHT);
    gradient.addColorStop(1, MODERN_BLUE_DARK);
    return gradient;
  };

  const chartData = {
    labels: data.trends.map(trend => trend.year || trend.month || trend.period),
    datasets: [
      {
        label: 'Tourist Arrivals',
        data: data.trends.map(trend => trend.arrivals || trend.count || trend.value),
        borderColor: (context) => createLineGradient(context.chart.ctx, context.chart.chartArea), // Gradient line color
        backgroundColor: (context) => createFillGradient(context.chart.ctx, context.chart.chartArea), // Gradient fill
        borderWidth: 3,
        fill: true,
        tension: 0.4, // Smooth curves
        pointBackgroundColor: MODERN_BLUE_DARK, // Consistent point color
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4, // Smaller, subtle points
        pointHoverRadius: 6, // Slightly larger on hover
        pointHitRadius: 10, // Easier to select points
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        align: 'end', // Align legend to the right
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 13,
            weight: '500', // Slightly lighter font weight
          },
          color: MODERN_SECONDARY_TEXT,
        },
      },
      title: {
        display: true,
        text: title,
        font: {
          size: 18,
          weight: '700',
        },
        color: MODERN_TEXT_COLOR,
        padding: 15,
      },
      tooltip: {
        backgroundColor: 'rgba(33, 37, 41, 0.85)', // Slightly more transparent
        titleColor: '#fff',
        bodyColor: '#e9ecef', // Lighter body text color
        borderColor: MODERN_BLUE_DARK,
        borderWidth: 1,
        cornerRadius: 8, // More rounded corners
        displayColors: true,
        bodyFont: {
          size: 14,
          weight: '500',
        },
        titleFont: {
          size: 15,
          weight: '600',
        },
        padding: 12,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toLocaleString()}`;
          },
          title: function(context) {
            return `Period: ${context[0].label}`;
          }
        },
      },
    },
    scales: {
      x: {
        grid: {
          display: false, // No vertical grid lines
        },
        ticks: {
          font: {
            size: 12,
            weight: '500',
          },
          color: MODERN_SECONDARY_TEXT,
        },
        // Optional: Add X-axis title if relevant
        // title: {
        //   display: true,
        //   text: 'Time Period',
        //   color: MODERN_TEXT_COLOR,
        //   font: { size: 13, weight: '600' }
        // }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: MODERN_GRID_COLOR, // Lighter, subtle grid color
          drawBorder: false,
          borderDash: [5, 5], // Dashed grid lines
        },
        title: {
          display: true,
          text: 'Tourist Arrivals',
          color: MODERN_TEXT_COLOR,
          font: {
            size: 14,
            weight: '600',
          },
          padding: { top: 10, bottom: 10 } // Padding for y-axis title
        },
        ticks: {
          font: {
            size: 12,
            weight: '500',
          },
          color: MODERN_SECONDARY_TEXT,
          callback: function(value) {
            if (value >= 1000000) {
                return (value / 1000000).toFixed(1) + 'M';
            } else if (value >= 1000) {
                return (value / 1000).toFixed(0) + 'K';
            }
            return value.toLocaleString();
          },
        },
      },
    },
    elements: {
      point: {
        hoverBackgroundColor: MODERN_BLUE_DARK,
        hoverBorderColor: MODERN_BLUE_LIGHT,
      },
      line: {
        tension: 0.4, // Keep smooth curves
        capBezierPoints: true, // Smoother ends for curves
      }
    },
    animation: {
        duration: 1000, // Smooth animation on load
        easing: 'easeInOutQuad',
    }
  };

  return (
    <Card className="h-100 shadow-lg border-0 rounded-3" style={{ transition: 'box-shadow 0.3s ease-in-out' }}>
      <Card.Body>
        <div className="chart-container" style={{ height: '100%', maxHeight: '400px' }}>
          <Line data={chartData} options={options} />
        </div>
      </Card.Body>
    </Card>
  );
};

export default TrendChart;