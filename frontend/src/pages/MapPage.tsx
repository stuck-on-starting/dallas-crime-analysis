import { Link } from 'react-router-dom';
import { CrimeMap } from '../components/CrimeMap';
import '../styles/Pages.css';

export function MapPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>Crime Incident Map</h1>
        <p>Interactive map showing crime locations and district boundaries</p>
      </div>

      <section className="visualization-section">
        <CrimeMap />
      </section>
    </div>
  );
}
