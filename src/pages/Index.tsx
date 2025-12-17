import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  GraduationCap,
  BookOpen,
  Users,
  FileText,
  ArrowRight,
  Loader2,
  CheckCircle,
  Sparkles,
  Zap,
  Shield,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { useLanguage } from '@/contexts/LanguageContext';
import { landingCopy } from '@/locales/landing';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const copy = landingCopy[language] || landingCopy.en;

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,hsl(214_100%_60%_/_0.12),transparent_35%),radial-gradient(circle_at_80%_0%,hsl(28_93%_58%_/_0.14),transparent_30%),radial-gradient(circle_at_50%_60%,hsl(221_83%_53%_/_0.08),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0)_40%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0))]" />
      </div>

      {/* Navbar */}
      <nav className="relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="glass-strong rounded-2xl px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                <GraduationCap className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight">{copy.brand}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <LanguageSwitcher />
              <ThemeToggle />
              <Link to="/auth">
                <Button variant="outline" className="rounded-full px-4 sm:px-6 border-primary/30 hover:border-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                  {copy.navLogin}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero */}
        <section className="pt-14 sm:pt-16 pb-20 sm:pb-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              <div className="lg:col-span-7 space-y-8">
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                    <Sparkles className="w-4 h-4" />
                    {copy.badge}
                  </div>
                  <div className="h-px w-16 bg-gradient-to-r from-primary/60 to-accent/60" />
                  <span className="text-xs sm:text-sm text-muted-foreground uppercase tracking-[0.18em]">
                    2025
                  </span>
                </div>
                <h1 className="text-4xl sm:text-6xl xl:text-7xl font-black leading-[1.04] tracking-tight">
                  <span className="text-foreground">{copy.heroTitle1}</span>{' '}
                  <span className="text-gradient">{copy.heroTitle2}</span>
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                  {copy.heroSubtitle}
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link to="/auth">
                    <Button size="lg" className="gradient-primary shadow-glow text-base sm:text-lg px-7 sm:py-6 py-5 rounded-2xl btn-shine group">
                      {copy.cta}
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                  <a href="#features">
                    <Button variant="secondary" size="lg" className="rounded-2xl px-6 sm:px-7 py-5 border border-border/70 hover:border-primary/60 hover:text-primary transition-all">
                      {copy.secondaryCta}
                    </Button>
                  </a>
                </div>
                <div className="flex flex-wrap gap-2">
                  {copy.ribbons.map((item) => (
                    <span key={item} className="pill bg-secondary/70 text-secondary-foreground border border-border/60">
                      <CheckCircle className="w-3.5 h-3.5 text-primary" />
                      {item}
                    </span>
                  ))}
                </div>
                <div className="grid sm:grid-cols-3 gap-4 pt-2">
                  {copy.stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="relative overflow-hidden rounded-2xl border border-border/50 bg-card/80 backdrop-blur shadow-lg p-4"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
                      <div className="relative flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">{stat.label}</p>
                          <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <stat.icon className="w-5 h-5 text-primary" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {copy.steps.map((step, index) => (
                    <div key={step.title} className="rounded-2xl border border-border/60 bg-card/80 p-4 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{step.title}</p>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-5 relative">
                <div className="absolute -top-10 -left-6 w-40 h-40 bg-primary/15 rounded-full blur-3xl" />
                <div className="absolute -bottom-14 -right-6 w-48 h-48 bg-accent/25 rounded-full blur-3xl" />
                <div className="absolute inset-0 rounded-[30px] bg-[radial-gradient(circle_at_20%_20%,hsl(214_100%_70%_/_0.22),transparent_50%)]" />
                <div className="relative glass-strong rounded-[28px] p-6 sm:p-7 shadow-2xl border border-border/40">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
                        <GraduationCap className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{copy.board.className}</p>
                        <p className="text-xl font-semibold">{copy.board.title}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="rounded-full px-3">
                      {copy.board.badge}
                    </Badge>
                  </div>

                  <div className="space-y-3 mb-5">
                    {copy.board.items.map((item, index) => (
                      <div
                        key={item.title}
                        className="relative rounded-2xl border border-border/60 bg-gradient-to-r from-card/80 via-card/60 to-primary/5 p-4 overflow-hidden"
                        style={{ animationDelay: `${index * 80}ms` }}
                      >
                        <div className="absolute inset-y-0 left-0 w-1 rounded-full bg-primary/60" />
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-foreground">{item.title}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${item.color}`}>{item.status}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl bg-gradient-to-r from-primary/12 via-card/80 to-accent/12 border border-border/60 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">{copy.board.progressLabel}</p>
                      <span className="text-sm font-semibold text-foreground">68%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: '68%' }} />
                    </div>
                    <p className="text-xs text-muted-foreground">{copy.board.progressFootnote}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {copy.board.micro.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-border/60 bg-card/70 p-3 flex flex-col gap-1">
                        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{item.label}</span>
                        <span className="text-lg font-semibold text-foreground">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="relative py-20 sm:py-24">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/30 to-transparent" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
            <div className="grid lg:grid-cols-12 gap-10 lg:gap-14 items-start mb-12">
              <div className="lg:col-span-4 space-y-4">
                <p className="section-title">{copy.featureSectionTitle}</p>
                <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
                  {copy.featureSectionSubtitle}
                </h2>
                <p className="text-muted-foreground">
                  {language === 'en'
                    ? 'Designed to feel like a creative studio: soft glass panels, vivid gradients, and data you can actually act on.'
                    : 'Pensé comme un studio créatif : panneaux verre dépoli, gradients vibrants et données directement actionnables.'}
                </p>
                <div className="flex items-center gap-3 pt-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {language === 'en'
                      ? 'Fresh interface with motion cues, perfect on desktop and mobile.'
                      : 'Interface fraîche, animée et parfaitement fluide sur desktop comme mobile.'}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 grid md:grid-cols-2 gap-6">
                {copy.features.map((feature, index) => (
                  <div
                    key={feature.title}
                    className="group relative p-7 rounded-3xl border border-border/60 bg-card/90 backdrop-blur hover:-translate-y-1.5 transition-all duration-500 shadow-lg overflow-hidden"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div
                      className="absolute inset-0 opacity-60"
                      style={{ background: `radial-gradient(circle at 20% 20%, ${feature.color}22, transparent 55%)` }}
                    />
                    <div
                      className="relative w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${feature.color}20` }}
                    >
                      <feature.icon className="w-7 h-7" style={{ color: feature.color }} />
                    </div>
                    <h3 className="relative text-xl font-semibold mb-2">{feature.title}</h3>
                    <p className="relative text-muted-foreground leading-relaxed">{feature.description}</p>
                    <div className="relative mt-4 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                    <div className="relative mt-4 text-sm text-primary font-semibold inline-flex items-center gap-2">
                      {language === 'en' ? 'See it in action' : 'Voir en action'}
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="pb-16 sm:pb-20">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-r from-primary/90 via-primary to-accent/90 shadow-glow text-primary-foreground">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.28),transparent_40%)]" />
              <div className="relative px-8 sm:px-14 py-14 text-center space-y-4">
                <Badge variant="secondary" className="rounded-full bg-white/15 text-primary-foreground border-white/30">
                  {language === 'en' ? 'Cohort-ready in minutes' : 'Cohorte prête en quelques minutes'}
                </Badge>
                <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
                  {copy.ctaTitle}
                </h2>
                <p className="text-base sm:text-lg text-primary-foreground/80 max-w-2xl mx-auto">
                  {copy.ctaSubtitle}
                </p>
                <Link to="/auth">
                  <Button size="lg" variant="secondary" className="rounded-2xl px-8 py-5 text-lg font-semibold shadow-xl hover:scale-105 transition-transform bg-white text-primary">
                    {copy.ctaButton}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-border/70 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">{copy.brand}</span>
          </div>
          <p className="text-muted-foreground text-sm text-center sm:text-right">
            {copy.footerText}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

