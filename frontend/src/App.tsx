import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { OverviewPage } from './pages/OverviewPage';
import { MapPage } from './pages/MapPage';
import { BoundariesPage } from './pages/BoundariesPage';
import { RecordsPage } from './pages/RecordsPage';
import { TimeSeriesPage } from './pages/TimeSeriesPage';
import { YearlyPage } from './pages/YearlyPage';
import './App.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/boundaries" element={<BoundariesPage />} />
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/time-series" element={<TimeSeriesPage />} />
          <Route path="/yearly" element={<YearlyPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
