import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  FolderOpen,
  FileText,
  Users,
  LogOut,
  Settings,
  Menu,
  X,
  BarChart3,
  CalendarDays,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import NotificationBell from '@/components/NotificationBell';
import GlobalSearch from '@/components/GlobalSearch';
import ThemeToggle from '../ThemeToggle';
import LanguageSwitcher from '../LanguageSwitcher';
import { useTranslation } from '@/hooks/useTranslation';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [dyslexicFont, setDyslexicFont] = useState(false);
  const { t } = useTranslation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const navigation = [
    { name: t('Tableau de bord', 'Dashboard'), href: '/dashboard', icon: LayoutDashboard },
    { name: t('Agenda', 'Agenda'), href: '/agenda', icon: CalendarDays },
    { name: t('Cours', 'Courses'), href: '/courses', icon: BookOpen },
    { name: t('Soumissions', 'Submissions'), href: '/submissions', icon: FileText },
    { name: t('Matieres', 'Subjects'), href: '/subjects', icon: FolderOpen },
    { name: t('Analytiques', 'Analytics'), href: '/analytics', icon: BarChart3 },
  ];

  if (profile?.role === 'professor' || profile?.role === 'admin') {
    navigation.push({ name: t('Etudiants', 'Students'), href: '/students', icon: Users });
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/40 relative overflow-hidden ${dyslexicFont ? 'font-[\"AtkinsonHyperlegible\",sans-serif] tracking-[0.01em]' : ''}`}>
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="bg-aurora h-full w-full opacity-70" />
        <div className="bg-dot-grid absolute inset-0 opacity-30" />
      </div>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-sidebar-background border-r border-sidebar-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-lg',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 px-6 border-b border-sidebar-border/80">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-sidebar-foreground">EduPlatform</span>
                <span className="text-xs text-muted-foreground">
                  {t('Etudiants & enseignants', 'Students & instructors')}
                </span>
              </div>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-4 px-4 py-6 overflow-y-auto">
            <p className="section-title px-2">{t('Navigation', 'Navigation')}</p>
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-accent/15 text-foreground border border-primary/30 shadow-glow'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground border border-transparent hover:border-border'
                  )}
                >
                  <span
                    className={cn(
                      'h-9 w-9 rounded-xl flex items-center justify-center transition-all',
                      isActive ? 'bg-primary/15 text-primary shadow-glow' : 'bg-secondary/60 text-muted-foreground'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                  </span>
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-sidebar-border/80 p-4 space-y-3">
            <Link
              to="/settings"
              className="flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary transition-colors"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{t('Parametres', 'Settings')}</span>
            </Link>
            <div className="flex items-center gap-3 px-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {profile?.full_name || t('Utilisateur', 'User')}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {profile?.role === 'student'
                    ? t('Etudiant', 'Student')
                    : profile?.role === 'professor'
                      ? t('Professeur', 'Professor')
                      : 'Admin'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/80 backdrop-blur-md px-4 lg:px-8 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-3 flex-1 max-w-3xl">
            <div className="hidden md:block flex-1">
              <GlobalSearch />
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm" className="rounded-full hidden sm:inline-flex">
                <Link to="/courses">{t('Cours', 'Courses')}</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full gradient-primary shadow-glow">
                <Link to="/submissions">{t('Soumissions', 'Submissions')}</Link>
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-full hidden sm:inline-flex" onClick={() => setFocusMode((p) => !p)}>
              {focusMode ? t('Quitter focus', 'Exit focus') : t('Mode focus', 'Focus mode')}
            </Button>
            <Button variant="outline" size="sm" className="rounded-full hidden sm:inline-flex" onClick={() => setDyslexicFont((p) => !p)}>
              {dyslexicFont ? t('Police normale', 'Standard font') : t('Police dyslexie', 'Dyslexia-friendly')}
            </Button>
            <LanguageSwitcher />
            <ThemeToggle />
            <NotificationBell />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {profile?.full_name ? getInitials(profile.full_name) : 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 ring-2 ring-card animate-pulse" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{profile?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Link to="/settings">
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  {t('Parametres', 'Settings')}
                </DropdownMenuItem>
              </Link>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                {t('Deconnexion', 'Sign out')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
