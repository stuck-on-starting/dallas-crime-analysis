import { Link } from 'react-router-dom';
import { TimeSeriesChart } from '../components/TimeSeriesChart';
import '../styles/Pages.css';

export function TimeSeriesPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>Time Series Analysis</h1>
        <p>View crime trends over time</p>
      </div>

      <section className="visualization-section">
        <TimeSeriesChart groupBy="month" />
      </section>
    </div>
  );
}
