import React from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// Define standard modern colors for text/grids
const LIGHT_GRID = 'rgba(0, 0, 0, 0.08)';
const MODERN_TEXT_COLOR = '#2c3e50';
const MODERN_SECONDARY_TEXT = '#6c757d';

// NEW ATTRACTIVE COLOR PALETTE
const MODERN_COLORS = [
    '#00BFFF', // Sky Blue
    '#28A745', // Emerald Green
    '#FF7F50', // Vivid Orange (Coral)
    '#8A2BE2', // Medium Purple
    '#FFD700', // Gold
    '#FF1493', // Deep Pink
    '#00CED1', // Dark Turquoise/Teal
    '#FF6347', // Tomato/Coral
    '#4682B4', // Steel Blue
    '#CD5C5C', // Indian Red
];


const CategoryDonutChart = ({ data }) => {
  if (!data || !data.category_predictions) {
    return <p className="text-muted">No category data available</p>;
  }

  const categories = Object.keys(data.category_predictions);
  const ratings = categories.map(cat => data.category_predictions[cat].average_tourist_rating);
  
  // Sort by rating descending for better visualization
  const sortedData = categories
    .map((cat, idx) => ({ category: cat, rating: ratings[idx] }))
    .sort((a, b) => b.rating - a.rating);

  // Map colors to sorted data
  const backgroundColors = sortedData.map((item, index) => {
      // Use a slightly transparent version of the modern color
      return `${MODERN_COLORS[index % MODERN_COLORS.length]}dd`; // 'dd' for ~87% opacity
  });
  
  // Use the corresponding solid color for the border
  const borderColors = sortedData.map((item, index) => {
      return MODERN_COLORS[index % MODERN_COLORS.length];
  });

  const chartData = {
    labels: sortedData.map(item => item.category),
    datasets: [{
      label: 'Tourist Rating',
      data: sortedData.map(item => item.rating),
      backgroundColor: backgroundColors, // Using new color array
      borderColor: borderColors,       // Using new color array for borders
      borderWidth: 1.5,
      borderRadius: 6,
      borderSkipped: false,
      hoverBackgroundColor: borderColors.map(color => color + 'ff'), // Solid color on hover
    }]
  };

  const options = {
    indexAxis: 'y', // Horizontal bar chart
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false 
      },
      title: {
        display: true,
        text: 'Category-wise Tourist Ratings',
        font: {
          size: 16,
          weight: '700'
        },
        color: MODERN_TEXT_COLOR,
        padding: 15,
      },
      tooltip: {
        backgroundColor: 'rgba(44, 62, 80, 0.9)',
        padding: 12,
        titleColor: '#fff',
        bodyColor: '#ecf0f1',
        cornerRadius: 8,
        displayColors: true, // Display color square to match bar color
        bodyFont: {
            size: 13,
            weight: '500'
        },
        callbacks: {
          label: (context) => {
            const value = context.parsed.x.toFixed(2);
            return `Rating: ${value} / 5.0`;
          },
          title: (context) => {
              return context[0].label;
          }
        }
      }
    },
    scales: {
      x: {
        beginAtZero: false,
        min: 0,
        max: 5.0,
        position: 'top',
        ticks: {
          stepSize: 1.0,
          color: MODERN_SECONDARY_TEXT,
          font: {
              size: 12,
              weight: '600'
          },
          callback: function(value) {
            return value.toFixed(0);
          }
        },
        grid: {
          display: true,
          color: LIGHT_GRID,
          borderDash: [5, 5],
          drawBorder: false
        },
        title: {
            display: true,
            text: 'Tourist Rating (Score / 5.0)',
            color: '#7f8c8d',
            font: {
                size: 13,
                weight: '600'
            }
        }
      },
      y: {
        grid: {
          display: false
        },
        ticks: {
          color: MODERN_TEXT_COLOR,
          font: {
            size: 13,
            weight: '600'
          },
          padding: 10
        },
        barThickness: 18,
      }
    },
    animation: {
        duration: 800,
        easing: 'easeInOutQuart',
        delay: (context) => {
            let delay = 0;
            if (context.type === 'data' && context.mode === 'default') {
                delay = context.dataIndex * 100; 
            }
            return delay;
        },
    }
  };

  return (
    <div 
        className="shadow-sm rounded-lg"
        style={{ 
            height: '350px',
            position: 'relative', 
            padding: '10px'
        }}
    >
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default CategoryDonutChart;