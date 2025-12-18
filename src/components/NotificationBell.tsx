import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, BookOpen, Check, FileCheck, ListTodo, MessageSquare, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useTranslation } from '@/hooks/useTranslation';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  data: Record<string, unknown> | null;
  created_at: string;
}

const NotificationBell = () => {
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [doNotDisturb, setDoNotDisturb] = useState(false);
  const doNotDisturbRef = useRef(false);

  useEffect(() => {
    const storedDnd = localStorage.getItem('notifications-dnd');
    if (storedDnd === 'true') {
      setDoNotDisturb(true);
      doNotDisturbRef.current = true;
    }
  }, []);

  useEffect(() => {
    doNotDisturbRef.current = doNotDisturb;
    localStorage.setItem('notifications-dnd', doNotDisturb ? 'true' : 'false');
  }, [doNotDisturb]);

  useEffect(() => {
    if (!profile?.id) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        setNotifications(data as Notification[]);
        setUnreadCount(data.filter((n) => !n.read).length);
      }
    };

    fetchNotifications();

    // Subscribe to realtime notifications
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
          setUnreadCount((prev) => (doNotDisturbRef.current ? prev : prev + 1));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!profile?.id) return;

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', profile.id)
      .eq('read', false);

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'course':
        return <BookOpen className="w-4 h-4 text-primary" />;
      case 'grade':
        return <FileCheck className="w-4 h-4 text-success" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-accent" />;
      default:
        return <Bell className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const categorize = (notification: Notification) => {
    if (['course', 'task', 'submission'].includes(notification.type)) return 'todo';
    if (['reminder', 'grade', 'comment'].includes(notification.type)) return 'reminders';
    return 'system';
  };

  const sections = [
    { key: 'todo', title: t('A faire', 'To do'), description: t('Actions a traiter', 'Actionable items'), icon: <ListTodo className="h-4 w-4 text-primary" /> },
    { key: 'reminders', title: t('Rappels', 'Reminders'), description: t('Feedback, notes et commentaires', 'Feedback, grades and comments'), icon: <Bell className="h-4 w-4 text-accent" /> },
    { key: 'system', title: t('Systemes', 'System'), description: t('Mises a jour generales', 'General updates'), icon: <AlertTriangle className="h-4 w-4 text-warning" /> },
  ];

  const effectiveUnread = doNotDisturb ? 0 : unreadCount;

  return (
    <Sheet open={panelOpen} onOpenChange={setPanelOpen}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="relative focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary"
            aria-label={t('Ouvrir les notifications', 'Open notifications')}
            aria-haspopup="true"
            aria-expanded={open}
          >
            <Bell className="w-5 h-5" />
            {effectiveUnread > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground text-xs font-bold flex items-center justify-center animate-pulse-soft">
                {effectiveUnread > 9 ? '9+' : effectiveUnread}
              </span>
            )}
            {doNotDisturb && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-muted text-muted-foreground text-[10px] font-semibold flex items-center justify-center border border-border">
                <BellOff className="w-3 h-3" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <div className="flex items-center justify-between p-4 border-b gap-2">
            <div>
              <h4 className="font-semibold text-foreground">{t('Notifications', 'Notifications')}</h4>
              <p className="text-xs text-muted-foreground">{t('Vue rapide', 'Quick preview')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="notifications-dnd"
                checked={doNotDisturb}
                onCheckedChange={setDoNotDisturb}
                aria-label={t('Activer le mode ne pas deranger', 'Enable do not disturb')}
              />
              <Button variant="outline" size="sm" className="rounded-full" onClick={() => setPanelOpen(true)}>
                {t('Centre', 'Center')}
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[300px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Bell className="w-10 h-10 mb-2 opacity-50" />
                <p className="text-sm">{t('Aucune notification', 'No notifications')}</p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.slice(0, 6).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer ${!notification.read ? 'bg-primary/5' : ''}`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        {getIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm text-foreground truncate">
                            {notification.title}
                          </p>
                          {!notification.read && (
                            <Badge variant="default" className="shrink-0 text-[10px] px-1.5 py-0">
                              {t('Nouveau', 'New')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {format(new Date(notification.created_at), 'dd MMM HH:mm', {
                            locale: fr,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <SheetContent side="right" className="w-[420px] sm:max-w-xl" aria-label={t('Centre de notifications', 'Notification center')}>
        <SheetHeader className="items-start">
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            {t('Centre de notifications', 'Notification center')}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Switch
              id="notifications-dnd-panel"
              checked={doNotDisturb}
              onCheckedChange={setDoNotDisturb}
              aria-label={t('Ne pas deranger', 'Do not disturb')}
            />
            <div className="flex flex-col">
              <span className="text-sm text-foreground">{t('Ne pas deranger', 'Do not disturb')}</span>
              <span className="text-xs text-muted-foreground">
                {doNotDisturb
                  ? t('Les alertes visuelles sont coupees', 'Visual alerts are muted')
                  : t('Recevez les nouveaux rappels', 'Receive new reminders')}
              </span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="gap-1">
            <Check className="w-3 h-3" />
            {t('Tout marquer lu', 'Mark all read')}
          </Button>
        </div>

        <ScrollArea className="mt-6 h-[70vh] pr-3">
          <div className="space-y-5">
            {sections.map((section) => {
              const items = notifications.filter((n) => categorize(n) === section.key);
              return (
                <div key={section.key} className="rounded-xl border border-border/70 bg-card/80 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {section.icon}
                        <h4 className="font-semibold text-foreground">{section.title}</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">{section.description}</p>
                    </div>
                    <Badge variant="secondary">{items.length}</Badge>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t('Rien a afficher', 'Nothing to show')}</p>
                  ) : (
                    <div className="space-y-3">
                      {items.map((notification) => (
                        <div
                          key={notification.id}
                          className={`rounded-lg border p-3 transition-colors hover:border-primary/50 cursor-pointer ${notification.read ? 'bg-card' : 'bg-primary/5 border-primary/30'}`}
                          onClick={() => !notification.read && markAsRead(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              {getIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-sm text-foreground line-clamp-1">{notification.title}</p>
                                {!notification.read && (
                                  <Badge variant="default" className="shrink-0 text-[10px] px-1.5 py-0">
                                    {t('Non lu', 'Unread')}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                              <p className="text-[11px] text-muted-foreground mt-1">
                                {format(new Date(notification.created_at), 'dd MMM HH:mm', { locale: fr })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default NotificationBell;
