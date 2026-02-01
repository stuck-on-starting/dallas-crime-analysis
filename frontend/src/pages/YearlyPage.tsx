import { Link } from 'react-router-dom';
import { YearlyBarChart } from '../components/YearlyBarChart';
import '../styles/Pages.css';

export function YearlyPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>Yearly Comparison</h1>
        <p>Compare crime statistics year by year</p>
      </div>

      <section className="visualization-section">
        <YearlyBarChart />
      </section>
    </div>
  );
}
