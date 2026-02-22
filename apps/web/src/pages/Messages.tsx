import { useState, useEffect } from 'react';
import { getConversations, getConversation, sendMessage, type Conversation, type Message } from '../api/messages';
import { useAuth } from '../context/AuthContext';

export default function Messages() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConversations().then((res) => {
      if (res.success && res.data) setConversations(res.data);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    getConversation(selected).then((res) => {
      if (res.success && res.data) setMessages(res.data);
    });
  }, [selected]);

  const currentConversation = conversations.find((c) => c.conversationId === selected);
  const otherUser = (() => {
    if (!currentConversation?.messages?.length || !user) return null;
    const last = currentConversation.messages[0];
    const senderId = typeof last.sender === 'object' && last.sender !== null ? (last.sender as { _id?: string })._id : null;
    const isMeSender = senderId === user.id;
    return isMeSender ? last.receiver : last.sender;
  })();
  const otherUserId = typeof otherUser === 'object' && otherUser !== null ? (otherUser as { _id?: string })._id : null;
  const gigId = currentConversation?.messages?.[0] && typeof (currentConversation.messages[0].gig) === 'object'
    ? (currentConversation.messages[0].gig as { _id?: string })._id
    : undefined;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !selected || !otherUserId || !gigId) return;
    setSending(true);
    const res = await sendMessage({
      gigId,
      receiverId: otherUserId,
      body: body.trim(),
      conversationId: selected,
    });
    setSending(false);
    if (res.success && res.data) {
      setMessages((prev) => [...prev, res.data as Message]);
      setBody('');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
        <p className="mt-4 text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Messages</h1>
      <p className="mt-1 text-sm text-slate-600">Chat with gig posters and applicants.</p>
      <div className="mt-6 flex flex-col gap-4 sm:flex-row">
        <div className="card w-full overflow-hidden sm:w-80">
          {conversations.length === 0 ? (
            <p className="p-5 text-sm text-slate-500">No conversations yet.</p>
          ) : (
            <ul>
              {conversations.map((c) => (
                <li key={c.conversationId}>
                  <button
                    type="button"
                    onClick={() => setSelected(c.conversationId)}
                    className={`w-full text-left border-b border-slate-100 p-4 transition-colors hover:bg-slate-50 ${selected === c.conversationId ? 'bg-primary-50' : ''}`}
                  >
                    <p className="font-medium text-slate-900 truncate">
                      {c.gig && typeof c.gig === 'object' ? (c.gig as { title?: string }).title : 'Gig'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {c.messages?.length ?? 0} message(s)
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card flex min-h-[400px] flex-1 flex-col overflow-hidden">
          {!selected ? (
            <div className="flex flex-1 items-center justify-center p-6">
              <p className="text-slate-500">Select a conversation.</p>
            </div>
          ) : (
            <>
              <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                <p className="font-medium text-slate-900">
                  {otherUser && typeof otherUser === 'object' ? (otherUser as { name?: string }).name : 'User'}
                </p>
                {currentConversation?.gig && typeof currentConversation.gig === 'object' && (
                  <p className="text-sm text-slate-500">
                    Re: {(currentConversation.gig as { title?: string }).title}
                  </p>
                )}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m) => {
                  const senderId = typeof m.sender === 'object' && m.sender !== null ? (m.sender as { _id?: string })._id : null;
                  const isMe = senderId === user?.id;
                  return (
                    <div
                      key={m._id}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-xl px-4 py-2.5 text-sm ${
                          isMe ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-900'
                        }`}
                      >
                        <p>{m.body}</p>
                        <p className={`mt-1 text-xs ${isMe ? 'text-primary-100' : 'text-slate-500'}`}>
                          {new Date(m.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <form onSubmit={handleSend} className="flex gap-2 border-t border-slate-100 p-3">
                <input
                  type="text"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type a message..."
                  className="input-field flex-1"
                />
                <button
                  type="submit"
                  disabled={sending || !body.trim()}
                  className="btn-primary"
                >
                  Send
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
