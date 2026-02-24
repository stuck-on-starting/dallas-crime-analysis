import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const menuItems = [
  {
    to: '/overview',
    icon: '📊',
    title: 'Overview Statistics',
    description: 'View total records, category distribution, and date ranges',
  },
  {
    to: '/map',
    icon: '🗺️',
    title: 'Crime Map',
    description: 'Interactive map showing crime incidents and district boundaries',
  },
  {
    to: '/boundaries',
    icon: '🌍',
    title: 'Boundaries Map',
    description: 'View district boundaries with street, satellite, and terrain layers',
  },
  {
    to: '/records',
    icon: '📋',
    title: 'Data Records',
    description: 'Browse paginated crime records with filtering and search',
  },
  {
    to: '/yearly',
    icon: '📊',
    title: 'Yearly Comparison',
    description: 'Compare crime statistics year by year',
  },
  {
    to: '/nibrs',
    icon: '🔍',
    title: 'NIBRS Filter',
    description: 'Filter and analyze by specific NIBRS crime categories',
  },
];

export function Home() {
  return (
    <div className="flex flex-col gap-8">
      {/* Hero banner */}
      <header className="rounded-xl px-8 py-12 text-center text-white bg-gradient-to-br from-primary to-secondary">
        <h1 className="text-4xl font-bold mb-3">Dallas Crime Data Analysis</h1>
        <p className="text-lg opacity-90">Prestonwood District Crime Analysis System</p>
      </header>

      {/* Card grid */}
      <section>
        <h2 className="text-2xl font-semibold text-center mb-6" style={{ color: 'var(--foreground)' }}>
          Select a Visualization
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Link key={item.to} to={item.to} className="group no-underline">
              <Card className="h-full text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg group-hover:border-accent cursor-pointer">
                <CardHeader className="gap-3">
                  <div className="text-5xl">{item.icon}</div>
                  <CardTitle className="text-xl" style={{ color: 'var(--primary)' }}>
                    {item.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {item.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <footer className="text-center py-4 text-sm border-t" style={{ color: 'var(--muted-foreground)', borderColor: 'var(--border)' }}>
        <p>Data Source: Dallas Police Department</p>
      </footer>
    </div>
  );
}
