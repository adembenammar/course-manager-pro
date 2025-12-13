import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Message, Profile } from '@/types/database';
import {
  Loader2,
  MessageSquare,
  Send,
  Bell,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const Messages = () => {
  const { profile } = useAuth();
  const { toast } = useToast();

  const [recipients, setRecipients] = useState<Profile[]>([]);
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loadingRecipients, setLoadingRecipients] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const selectedRecipient = useMemo(
    () => recipients.find((r) => r.id === selectedRecipientId) || null,
    [recipients, selectedRecipientId]
  );

  useEffect(() => {
    if (!profile) return;
    fetchRecipients();
    fetchUnreadCounts();
  }, [profile]);

  useEffect(() => {
    if (!profile || !selectedRecipientId) return;
    fetchMessages(selectedRecipientId);

    const channel = supabase
      .channel(`messages-${profile.id}-${selectedRecipientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${profile.id}`,
        },
        () => fetchMessages(selectedRecipientId)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, selectedRecipientId]);

  const fetchRecipients = async () => {
    if (!profile) return;

    setLoadingRecipients(true);
    let list: Profile[] = [];

    if (profile.role === 'professor' || profile.role === 'admin') {
      const { data } = await supabase
        .from('professor_students')
        .select('student:profiles(*)')
        .eq('professor_id', profile.id);

      list = (data || [])
        .map((row: any) => row.student as Profile)
        .filter(Boolean);
    } else {
      const { data: assignment } = await supabase
        .from('professor_students')
        .select('professor:profiles(*)')
        .eq('student_id', profile.id)
        .maybeSingle();

      if (assignment?.professor) {
        list = [assignment.professor as Profile];
      } else {
        list = [];
      }
    }

    setRecipients(list);
    setSelectedRecipientId((prev) => prev || list[0]?.id || null);
    setLoadingRecipients(false);
  };

  const fetchUnreadCounts = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('messages')
      .select('sender_id, recipient_id, read_at')
      .eq('recipient_id', profile.id)
      .is('read_at', null);

    if (error) {
      if (error.message?.includes('messages')) {
        toast({
          variant: 'destructive',
          title: 'Migration manquante',
          description: 'Appliquez la migration qui crée la table messages.',
        });
      }
      return;
    }

    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((row) => {
        counts[row.sender_id] = (counts[row.sender_id] || 0) + 1;
      });
      setUnreadCounts(counts);
    }
  };

  const fetchMessages = async (recipientId: string) => {
    if (!profile) return;
    setLoadingMessages(true);

    const { data, error } = await supabase
      .from('messages')
      .select('*, sender:profiles(*), recipient:profiles(*)')
      .or(
        `and(sender_id.eq.${profile.id},recipient_id.eq.${recipientId}),and(sender_id.eq.${recipientId},recipient_id.eq.${profile.id})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message.includes('messages')
          ? 'La table messages est absente. Appliquez la migration SQL avant d’utiliser la messagerie.'
          : error.message,
      });
      setLoadingMessages(false);
      return;
    }

    setMessages((data as Message[]) || []);
    setLoadingMessages(false);
    await markAsRead(recipientId);
    fetchUnreadCounts();
  };

  const markAsRead = async (fromId: string) => {
    if (!profile) return;

    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', profile.id)
      .eq('sender_id', fromId)
      .is('read_at', null);
  };

  const handleSend = async () => {
    if (!profile || !selectedRecipient || !messageText.trim()) return;

    setSending(true);
    const content = messageText.trim();

    const { error } = await supabase.from('messages').insert({
      sender_id: profile.id,
      recipient_id: selectedRecipient.id,
      content,
    });

    if (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: error.message });
      setSending(false);
      return;
    }

    await supabase.from('notifications').insert({
      user_id: selectedRecipient.id,
      title: 'Nouveau message',
      message: `${profile.full_name} : ${content.substring(0, 80)}`,
      type: 'message',
      data: { senderId: profile.id },
    });

    setMessageText('');
    setSending(false);
    fetchMessages(selectedRecipient.id);
  };

  const filteredRecipients = useMemo(() => {
    if (!searchTerm.trim()) return recipients;
    return recipients.filter((r) =>
      r.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [recipients, searchTerm]);

  const formatTime = (date: string) =>
    format(new Date(date), 'dd MMM · HH:mm', { locale: fr });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl gradient-primary flex items-center justify-center shadow-glow">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Messages</h1>
              <p className="text-muted-foreground">
                Échangez directement entre professeur et étudiant.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <Card className="border-0 shadow-lg h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Contacts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher un contact"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>

              {loadingRecipients ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredRecipients.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun contact disponible. Les échanges sont limités aux binômes professeur ⇄ étudiants assignés.
                </p>
              ) : (
                <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                  {filteredRecipients.map((recipient) => {
                    const isActive = recipient.id === selectedRecipientId;
                    return (
                      <button
                        key={recipient.id}
                        onClick={() => setSelectedRecipientId(recipient.id)}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-md'
                            : 'bg-muted/40 hover:bg-muted'
                        }`}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={recipient.avatar_url || undefined} />
                          <AvatarFallback className="bg-secondary text-secondary-foreground">
                            {recipient.full_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">{recipient.full_name}</p>
                          <p className={`text-xs truncate ${
                            isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          }`}>
                            {recipient.role === 'professor' ? 'Professeur' : 'Étudiant'}
                          </p>
                        </div>
                        {unreadCounts[recipient.id] && unreadCounts[recipient.id] > 0 && (
                          <Badge variant={isActive ? 'secondary' : 'default'}>
                            {unreadCounts[recipient.id]}
                          </Badge>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg h-full min-h-[520px] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">
                    {selectedRecipient ? selectedRecipient.full_name : 'Aucun contact sélectionné'}
                  </CardTitle>
                  {selectedRecipient && (
                    <p className="text-xs text-muted-foreground">
                      {selectedRecipient.role === 'professor' ? 'Professeur' : 'Étudiant'}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-4">
              <div className="flex-1 rounded-xl border border-border/60 bg-muted/20 p-4 overflow-y-auto space-y-3">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : !selectedRecipient ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Sélectionnez un contact pour commencer.
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    Pas encore de messages.
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === profile?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-2 shadow-sm ${
                            isMine
                              ? 'bg-primary text-primary-foreground rounded-br-sm'
                              : 'bg-card border border-border rounded-bl-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          <p className={`text-[11px] mt-1 ${isMine ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                            {formatTime(msg.created_at)} {isMine && msg.read_at ? '· Lu' : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="space-y-3">
                <Textarea
                  placeholder={selectedRecipient ? 'Écrivez votre message...' : 'Sélectionnez un contact'}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={!selectedRecipient || sending}
                  className="rounded-xl"
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    className="rounded-xl"
                    onClick={handleSend}
                    disabled={!selectedRecipient || !messageText.trim() || sending}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Messages;
