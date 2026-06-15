import React, { useEffect, useState } from 'react';
import api from '../api';

const Sidebar = ({ onSelectConversation, activeConversationId, onNewChat }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    try {
      const res = await api.get('/conversations');
      setConversations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, []);

  const handleNewChat = async () => {
    const res = await api.post('/conversations', { title: 'New Chat' });
    setConversations(prev => [res.data, ...prev]);
    onNewChat(res.data.id);
  };

  const handleSelect = (convId) => {
    onSelectConversation(convId);
  };

  return (
    <div style={{
      width: '280px',
      background: 'rgba(30, 30, 40, 0.95)',
      backdropFilter: 'blur(10px)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      left: 0,
      top: 0,
      padding: '1rem',
      boxShadow: '2px 0 10px rgba(0,0,0,0.2)'
    }}>
      <button onClick={handleNewChat} style={{
        background: '#667eea',
        border: 'none',
        padding: '12px',
        borderRadius: '12px',
        color: 'white',
        fontWeight: 'bold',
        cursor: 'pointer',
        marginBottom: '1.5rem'
      }}>
        + New Chat
      </button>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading && <div style={{ textAlign: 'center' }}>Loading...</div>}
        {conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => handleSelect(conv.id)}
            style={{
              padding: '10px',
              margin: '5px 0',
              borderRadius: '8px',
              cursor: 'pointer',
              background: activeConversationId === conv.id ? '#667eea' : 'rgba(255,255,255,0.1)',
              transition: 'all 0.2s'
            }}
          >
            <div style={{ fontWeight: 500, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {conv.title}
            </div>
            <div style={{ fontSize: '0.7rem', opacity: 0.7 }}>
              {new Date(conv.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: '0.7rem', textAlign: 'center', marginTop: '1rem', opacity: 0.5 }}>
        BuddyAI
      </div>
    </div>
  );
};

export default Sidebar;