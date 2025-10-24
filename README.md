# Global Tourism Trend & Risk Analyzer (India-Focused)

A comprehensive React frontend for analyzing tourism trends, risks, and getting personalized destination recommendations across India.

## 🚀 Features

### 📊 **Analysis Dashboard**
- **Tourism Trends**: Interactive line charts showing year-wise tourism data
- **Risk Analysis**: Pie charts displaying disaster/safety breakdown
- **Weather Integration**: Real-time weather forecasts for destinations
- **Key Insights**: Best travel months, safety indices, growth trends

### ⚖️ **Comparison Tools**
- **State Comparison**: Side-by-side analysis of Indian states
- **City Comparison**: Detailed city-level comparisons
- **Visual Charts**: Bar charts for easy comparison visualization

### 🎯 **Smart Recommendations**
- **Interest-Based**: Personalized recommendations based on user preferences
- **Multi-Criteria**: Hill Station, Beach, Adventure, Heritage, Spiritual, etc.
- **Weather-Aware**: Recommendations considering weather conditions

### 🔐 **User Authentication**
- **Registration**: User signup with interest preferences
- **Login/Logout**: Secure authentication system
- **Profile Management**: Update interests and preferences

## 🛠️ Technology Stack

- **Frontend**: React 18, React Router DOM
- **Styling**: Bootstrap 5, Custom CSS
- **Charts**: Chart.js, React-ChartJS-2
- **HTTP Client**: Axios
- **Icons**: Font Awesome (via CDN)

## 📦 Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Flask backend running on `http://127.0.0.1:5000`

### Quick Start

1. **Clone and Install Dependencies**
   ```bash
   npx create-react-app tourism-dashboard
   cd tourism-dashboard
   npm install axios react-bootstrap bootstrap react-router-dom chart.js react-chartjs-2
   ```

2. **Replace Files**
   - Copy all the provided files to your React project
   - Replace the existing files with the new ones

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Access the Application**
   - Open [http://localhost:3000](http://localhost:3000)
   - Ensure your Flask backend is running on port 5000

## 🎨 Design & Styling

### Color Theme
- **Primary**: Royal Blue (#004AAD)
- **Secondary**: Light Sky Blue (#E8F0FE)
- **Font**: Poppins (Google Fonts)

### Responsive Design
- Mobile-first approach using Bootstrap 5
- Responsive grid system
- Touch-friendly interface

## 📱 Pages & Features

### 🏠 **Home Page**
- Hero section with call-to-action
- Feature highlights (3 main cards)
- Modern gradient backgrounds
- Responsive navigation

### 📊 **Analysis Page**
- State/City selection dropdowns
- Tourism trend line charts
- Risk analysis pie charts
- Weather forecast cards
- Key insights display

### ⚖️ **Compare Page**
- Tabbed interface (States vs Cities)
- Side-by-side comparison cards
- Visual comparison charts
- Detailed metrics display

### 🎯 **Recommendation Page**
- Multi-select interest checkboxes
- Month preference selection
- Results table with ratings
- Weather integration buttons

### 🔐 **Authentication Pages**
- **Login**: Username/password form
- **Register**: Full registration with interests
- **Interests**: Update user preferences

## 🔌 API Integration

### Backend Endpoints Used
```
Authentication:
- POST /register
- POST /login
- GET /user/<username>/interests
- POST /user/<username>/interests

Data APIs:
- GET /states
- GET /states/<state_name>
- GET /states/<state_name>/cities
- GET /states/<state_name>/risk
- GET /states/<state_name>/tourism_trends
- GET /states/<state_name>/cities/<city_name>

AI & Comparison:
- GET /recommend
- POST /recommend
- GET /compare/states
- GET /compare/cities

Weather:
- GET /weather/city/<city_name>
- GET /weather/state/<state_name>
```

## 📊 Chart Components

### TrendChart
- Line charts for tourism trends
- Interactive tooltips
- Responsive design
- Custom styling

### RiskChart
- Pie charts for risk analysis
- Color-coded risk types
- Legend and labels
- Hover effects

### WeatherCard
- Real-time weather data
- 3-day forecast
- Temperature, humidity, wind
- Weather icons

## 🔒 Authentication Flow

1. **Registration**: Users sign up with interests
2. **Login**: JWT token stored in localStorage
3. **Protected Routes**: Interests page requires authentication
4. **Logout**: Clear localStorage and redirect

## 🎯 Key Features

### Responsive Design
- Mobile-first Bootstrap 5
- Touch-friendly interface
- Adaptive layouts

### Interactive Charts
- Chart.js integration
- Hover effects and tooltips
- Custom color schemes
- Responsive sizing

### Error Handling
- API error messages
- Loading states
- Empty state handling
- User feedback

### Performance
- Lazy loading
- Optimized images
- Efficient state management
- Minimal re-renders

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Environment Variables
Create `.env` file:
```
REACT_APP_API_URL=http://127.0.0.1:5000
```

## 📱 Mobile Support

- Responsive design for all screen sizes
- Touch-friendly buttons and forms
- Optimized navigation
- Mobile-specific layouts

## 🎨 Customization

### Colors
Update CSS variables in `src/index.css`:
```css
:root {
  --primary-color: #004AAD;
  --secondary-color: #E8F0FE;
}
```

### Fonts
Change font family in `public/index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=YourFont:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

## 🔧 Development

### Project Structure
```
src/
├── components/          # Reusable components
│   ├── Navbar.jsx
│   ├── Footer.jsx
│   ├── WeatherCard.jsx
│   ├── TrendChart.jsx
│   ├── RiskChart.jsx
│   └── CompareCard.jsx
├── pages/              # Page components
│   ├── Home.jsx
│   ├── Analysis.jsx
│   ├── Compare.jsx
│   ├── Recommendation.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   └── Interests.jsx
├── services/           # API services
│   └── api.js
├── App.jsx             # Main app component
├── main.jsx           # Entry point
└── index.css          # Global styles
```

## 📈 Performance Tips

1. **Code Splitting**: Implement React.lazy() for route-based splitting
2. **Memoization**: Use React.memo() for expensive components
3. **Bundle Analysis**: Run `npm run build` and analyze bundle size
4. **Image Optimization**: Use WebP format for images

## 🐛 Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure Flask backend has CORS enabled
2. **API Connection**: Verify backend is running on port 5000
3. **Chart Not Rendering**: Check Chart.js imports
4. **Styling Issues**: Ensure Bootstrap CSS is imported

### Debug Mode
Enable React Developer Tools for debugging:
```bash
npm install --save-dev @types/react
```

## 📄 License

This project is part of the Global Tourism Trend & Risk Analyzer system.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

For support and questions:
- Email: support@tourismanalyzer.com
- Phone: +91 9876543210

---

**Built with ❤️ for smart tourism decisions**