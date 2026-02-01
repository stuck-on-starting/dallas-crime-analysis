import { Link } from 'react-router-dom';
import { BoundariesMap } from '../components/BoundariesMap';
import '../styles/Pages.css';

export function BoundariesPage() {
  return (
    <div className="page-container">
      <div className="page-header">
        <Link to="/" className="back-link">← Back to Home</Link>
        <h1>District Boundaries</h1>
        <p>View the Prestonwood district boundary (red) and buffer zone (blue) without crime incident overlays.</p>
      </div>

      <section className="visualization-section">
        <BoundariesMap />
      </section>
    </div>
  );
}
