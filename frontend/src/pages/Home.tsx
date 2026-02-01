import { Link } from 'react-router-dom';
import '../styles/Home.css';

export function Home() {
  return (
    <div className="home">
      <header className="home-header">
        <h1>Dallas Crime Data Analysis</h1>
        <p>Prestonwood District Crime Analysis System</p>
      </header>

      <section className="visualization-menu">
        <h2>Select a Visualization</h2>

        <div className="menu-grid">
          <Link to="/overview" className="menu-card">
            <div className="menu-icon">📊</div>
            <h3>Overview Statistics</h3>
            <p>View total records, category distribution, and date ranges</p>
          </Link>

          <Link to="/map" className="menu-card">
            <div className="menu-icon">🗺️</div>
            <h3>Crime Map</h3>
            <p>Interactive map showing crime incidents and district boundaries</p>
          </Link>

          <Link to="/boundaries" className="menu-card">
            <div className="menu-icon">🌍</div>
            <h3>Boundaries Map</h3>
            <p>View district boundaries with street, satellite, and terrain layers</p>
          </Link>

          <Link to="/records" className="menu-card">
            <div className="menu-icon">📋</div>
            <h3>Data Records</h3>
            <p>Browse paginated crime records with filtering and search</p>
          </Link>

          <Link to="/time-series" className="menu-card">
            <div className="menu-icon">📈</div>
            <h3>Time Series</h3>
            <p>View crime trends over time with monthly/yearly grouping</p>
          </Link>

          <Link to="/yearly" className="menu-card">
            <div className="menu-icon">📊</div>
            <h3>Yearly Comparison</h3>
            <p>Compare crime statistics year by year</p>
          </Link>
        </div>
      </section>

      <footer className="home-footer">
        <p>Data Source: Dallas Police Department</p>
      </footer>
    </div>
  );
}
