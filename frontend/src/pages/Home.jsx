import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import Sidebar from '../components/Sidebar';

function Home() {
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  // Fetch user and create first chat if none
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/login');
      return;
    }
    api.get('/auth/me')
      .then(res => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('access_token');
        navigate('/login');
      });
  }, [navigate]);

  // Load conversations list
  const fetchConversations = async () => {
    const res = await api.get('/conversations');
    setConversations(res.data);
    if (res.data.length > 0 && !activeConversationId) {
      setActiveConversationId(res.data[0].id);
    } else if (res.data.length === 0) {
      // auto create a new conversation
      const newConv = await api.post('/conversations', { title: 'New Chat' });
      setConversations([newConv.data]);
      setActiveConversationId(newConv.data.id);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      api.get(`/conversations/${activeConversationId}/messages`)
        .then(res => setMessages(res.data))
        .catch(console.error);
    }
  }, [activeConversationId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = async (newId) => {
    setActiveConversationId(newId);
    setMessages([]);
    await fetchConversations(); // refresh list
  };

  const handleSelectConversation = (convId) => {
    setActiveConversationId(convId);
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !activeConversationId) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/chat/send', {
        message: input,
        conversation_id: activeConversationId
      });
      const botMsg = { role: 'assistant', content: res.data.reply };
      setMessages(prev => [...prev, botMsg]);
      await fetchConversations();
    } catch (err) {
      console.error(err);
      const errorMsg = { role: 'assistant', content: 'Sorry, something went wrong.' };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  if (!user) return <div className="glass-card" style={{ textAlign: 'center' }}>Loading...</div>;

  return (
    <div style={{ display: 'flex' }}>
      <Sidebar
        onSelectConversation={handleSelectConversation}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
      />
      <div style={{ marginLeft: '280px', flex: 1, padding: '1rem', minHeight: '100vh' }}>
        <div className="chat-container" style={{ height: 'calc(100vh - 2rem)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.5rem', borderBottom: '2px solid #e5e7eb' }}>
            <div>
              <span className="logo" style={{ fontSize: '1.5rem' }}>BuddyAI</span>
              <p style={{ fontSize: '0.8rem', color: '#6b7280' }}>Welcome, {user.username}!</p>
            </div>
            <button onClick={logout} className="btn-secondary" style={{ padding: '8px 20px' }}>
              Logout
            </button>
          </div>
          <div className="chat-messages" style={{ height: 'calc(100% - 80px)' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: '#9ca3af', marginTop: '2rem' }}>
                <p>✨ Start a conversation by typing a message below.</p>
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`message ${msg.role}`}>
                <strong>{msg.role === 'user' ? 'You' : 'BuddyAI'}</strong>
                <div style={{ marginTop: '4px' }}>{msg.content}</div>
              </div>
            ))}
            {loading && (
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="input-group">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={loading}
            />
            <button type="submit" className="btn-primary" disabled={loading} style={{ width: 'auto' }}>
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Home;