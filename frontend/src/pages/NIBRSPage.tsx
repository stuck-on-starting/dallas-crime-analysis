import { Link } from 'react-router-dom';
import { NIBRSFilterChart } from '../components/NIBRSFilterChart';
import '../styles/Pages.css';

export function NIBRSPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>Crime Type Filter</h1>
        <p>Filter and analyze by specific NIBRS crime categories</p>
      </div>

      <section className="visualization-section">
        <NIBRSFilterChart groupBy="month" />
      </section>
    </div>
  );
}
