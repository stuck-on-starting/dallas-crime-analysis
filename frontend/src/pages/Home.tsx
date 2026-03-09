import { Link } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const menuItems = [
  {
    to: '/yearly',
    icon: '📊',
    title: 'Yearly Comparison',
    description: 'Compare crime statistics year by year',
  },
    {
    to: '/map',
    icon: '🗺️',
    title: 'Crime Map',
    description: 'Interactive map showing crime incidents and district boundaries',
  },
  {
    to: '/overview',
    icon: '📊',
    title: 'Overview Statistics',
    description: 'View various details about this dataset',
  },
  {
    to: '/records',
    icon: '📋',
    title: 'All Data Records',
    description: 'Browse paginated crime records with filtering and search',
  },  
];

export function Home() {
  return (
    <div className="flex flex-col gap-8">
      {/* Hero banner */}
      <header className="rounded-xl px-8 py-12 text-center text-white bg-gradient-to-br from-primary to-secondary">
        <h1 className="text-4xl font-bold mb-3">Prestonwood Improvement District</h1>
        <p className="text-lg opacity-90">Crime data analysis comparing Prestonwood PID incidents to incidents in neighboring area</p>
      </header>

      {/* Card grid */}
      <section>        
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
        <p>Data Source: <a href='https://www.dallasopendata.com/Public-Safety/Police-Incidents/qv6i-rri7/about_data'>Dallas Police Department</a></p>
      </footer>
    </div>
  );
}
