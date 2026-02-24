import { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { MenuIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/overview', label: 'Overview' },
  { to: '/map', label: 'Crime Map' },
  { to: '/boundaries', label: 'Boundaries' },
  { to: '/records', label: 'Records' },
  { to: '/yearly', label: 'Yearly' },
  { to: '/nibrs', label: 'NIBRS Filter' },
];

export function Layout() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--background)' }}>
      {/* Sticky top nav */}
      <header className="sticky top-0 z-40 shadow-md" style={{ backgroundColor: 'var(--primary)' }}>
        <div className="max-w-screen-xl mx-auto px-4 flex items-center justify-between h-14">
          {/* Brand */}
          <Link
            to="/"
            className="text-white font-semibold text-lg tracking-tight hover:opacity-80 transition-opacity"
          >
            Dallas Crime Analysis
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={[
                  'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                  pathname === item.to
                    ? 'bg-white/20 text-white'
                    : 'text-white/80 hover:text-white hover:bg-white/10',
                ].join(' ')}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-white hover:bg-white/10"
            onClick={() => setOpen(true)}
            aria-label="Open navigation menu"
          >
            <MenuIcon className="size-5" />
          </Button>
        </div>
      </header>

      {/* Mobile drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-64">
          <SheetHeader>
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 mt-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={[
                  'px-3 py-2 rounded text-sm font-medium transition-colors',
                  pathname === item.to
                    ? 'text-white'
                    : 'text-foreground hover:bg-muted',
                ].join(' ')}
                style={pathname === item.to ? { backgroundColor: 'var(--primary)' } : undefined}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {/* Page content */}
      <main className="max-w-screen-xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
