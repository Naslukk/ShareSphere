import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Send, UserCircle, MessageCircle, Check, CheckCheck, Trash2 } from 'lucide-react';

const socket = io('http://localhost:5000');

export default function Chats() {
  const [sessions, setSessions] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const myId = localStorage.getItem('userId');
  const messagesEndRef = useRef(null);
  const location = useLocation();

  const handleSessionClick = async (s) => {
    setActiveSession(s);
    setSessions(prev => prev.map(session => session.userId === s.userId ? { ...session, unreadCount: 0 } : session));
    try {
       await axios.put(`http://localhost:5000/api/messages/mark-read/${s.userId}`, {}, { headers: { 'x-auth-token': localStorage.getItem('token') }});
       window.dispatchEvent(new Event('chatRead'));
    } catch(e) {}
  };

  useEffect(() => {
     if (location.state?.newChat) {
        handleSessionClick(location.state.newChat);
     }
  }, [location.state]);

  const fetchSessions = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/messages/sessions', { headers: { 'x-auth-token': localStorage.getItem('token') }});
      let loaded = res.data;
      
      const targetId = location.state?.newChat?.userId;
      if (targetId) {
         loaded = loaded.map(s => s.userId === targetId ? { ...s, unreadCount: 0 } : s);
      }

      if (location.state?.newChat) {
         if (!loaded.find(s => s.userId === location.state.newChat.userId)) {
            loaded.unshift({
               userId: location.state.newChat.userId,
               userName: location.state.newChat.userName,
               lastMessage: 'Say hello!',
               unreadCount: 0
            });
         }
      }
      
      setSessions(prev => loaded.map(s => {
         const explicitlyZeroed = prev.find(p => p.userId === s.userId && p.unreadCount === 0);
         return explicitlyZeroed || s.userId === targetId ? { ...s, unreadCount: 0 } : s;
      }));
    } catch (err) { console.log(err); }
  };

  useEffect(() => {
    fetchSessions();
    const handleConnect = () => socket.emit('join', myId);
    if (myId) {
       if (socket.connected) handleConnect();
       socket.on('connect', handleConnect);
    }

    const handleReceiveMessage = (data) => {
       setMessages(prev => {
          if (activeSession && activeSession.userId === data.senderId) {
             axios.put(`http://localhost:5000/api/messages/mark-read/${data.senderId}`, {}, { headers: { 'x-auth-token': localStorage.getItem('token') }});
             window.dispatchEvent(new Event('chatRead'));
             setSessions(sList => sList.map(sess => sess.userId === data.senderId ? {...sess, lastMessage: data.text, timestamp: data.timestamp, unreadCount: 0} : sess));
             return [...prev, { senderId: data.senderId, text: data.text, timestamp: data.timestamp, isRead: true }];
          } else {
             fetchSessions(); 
             return prev;
          }
       });
    };

    socket.on('receiveMessage', handleReceiveMessage);
    return () => {
       socket.off('connect', handleConnect);
       socket.off('receiveMessage', handleReceiveMessage);
    };
  }, [myId, activeSession]);

  const fetchMessages = async (otherId) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/messages/${otherId}`, { headers: { 'x-auth-token': localStorage.getItem('token') }});
      setMessages(res.data);
    } catch (err) { console.log(err); }
  };

  useEffect(() => {
    if (activeSession) fetchMessages(activeSession.userId);
  }, [activeSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if(!input.trim() || !activeSession) return;
    
    const msgData = {
      receiverId: activeSession.userId,
      text: input,
      senderId: myId,
      senderName: localStorage.getItem('userName'),
      timestamp: new Date().toISOString()
    };
    
    socket.emit('sendMessage', msgData);
    setMessages(prev => [...prev, { senderId: myId, text: input, timestamp: msgData.timestamp, isRead: false }]);
    setInput('');
    
    setSessions(prev => {
       const exists = prev.find(s => s.userId === activeSession.userId);
       if (exists) {
          return prev.map(s => s.userId === activeSession.userId ? { ...s, lastMessage: input, timestamp: msgData.timestamp } : s);
       } else {
          return [{ userId: activeSession.userId, userName: activeSession.userName, lastMessage: input, timestamp: msgData.timestamp, unreadCount: 0 }, ...prev];
       }
    });
  };

  const clearChat = async () => {
    if (!activeSession) return;
    if (!window.confirm(`Are you sure you want to clear the entire chat history with ${activeSession.userName}?`)) return;
    
    try {
      await axios.delete(`http://localhost:5000/api/messages/${activeSession.userId}`, { headers: { 'x-auth-token': localStorage.getItem('token') }});
      setActiveSession(null);
      setMessages([]);
      fetchSessions();
    } catch(e) { console.log(e); }
  };

  return (
    <div className="flex flex-col md:flex-row flex-grow h-[calc(100vh-64px)] bg-[#efeae2] border-t border-gray-200">
      {/* Sidebar inbox */}
      <div className="w-full md:w-[350px] border-r border-gray-200 bg-white overflow-y-auto shrink-0 shadow-sm flex flex-col">
         <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center sticky top-0 shrink-0">
            <h2 className="font-extrabold text-xl text-gray-800">Chats</h2>
         </div>

         {sessions.length === 0 ? (
            <p className="p-6 text-gray-400 text-sm text-center">No active chats yet. Connect with someone on the map!</p>
         ) : (
            <div className="flex-1">
              {sessions.map(s => (
                  <div key={s.userId} onClick={() => handleSessionClick(s)} className={`p-4 flex items-center gap-3 cursor-pointer border-b border-gray-100 transition-colors ${activeSession?.userId === s.userId ? 'bg-gray-100' : 'hover:bg-gray-50'}`}>
                    <UserCircle className="text-gray-400 w-12 h-12 shrink-0"/> 
                    <div className="flex-1 overflow-hidden">
                       <div className="flex justify-between items-baseline mb-0.5">
                          <h3 className="font-bold text-gray-900 truncate">{s.userName}</h3>
                          {s.timestamp && <span className="text-[10px] text-gray-500 shrink-0 ml-2">{new Date(s.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>}
                       </div>
                       <div className="flex justify-between items-center">
                          <p className="text-sm text-gray-500 truncate mr-2">{s.lastMessage}</p>
                          {s.unreadCount > 0 && (
                             <span className="shrink-0 bg-emerald-500 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center shadow-sm">
                               {s.unreadCount}
                             </span>
                          )}
                       </div>
                    </div>
                  </div>
              ))}
            </div>
         )}
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#efeae2] relative pb-16 md:pb-0">
         {activeSession ? (
           <>
             {/* Header */}
             <div className="p-3 bg-gray-50 border-b border-gray-200 shadow-sm flex items-center gap-3 shrink-0 sticky top-0 z-10">
                <UserCircle className="text-gray-400 w-10 h-10"/> 
                <h2 className="font-bold text-lg text-gray-800 flex-1">{activeSession.userName}</h2>
                <button 
                   onClick={clearChat}
                   className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                   title="Clear Chat"
                >
                   <Trash2 className="w-5 h-5" />
                </button>
             </div>

             {/* Messages */}
             <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-[100px] md:pb-4">
                <div className="text-center my-6">
                   <span className="bg-[#ffeecd] text-gray-600 text-[11px] font-semibold px-4 py-1.5 rounded-lg shadow-sm">
                     Messages are end-to-end encrypted with trust scoring.
                   </span>
                </div>
                {messages.map((m, i) => (
                   <div key={i} className={`flex ${m.senderId === myId ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] p-2.5 px-3 flex flex-col shadow-sm relative ${m.senderId === myId ? 'bg-[#d9fdd3] text-gray-900 rounded-xl rounded-tr-sm' : 'bg-white text-gray-900 border border-gray-100 rounded-xl rounded-tl-sm'}`}>
                         <span className="text-[15px] leading-snug break-all sm:break-normal mb-3 sm:mb-1 pr-14">{m.text}</span>
                                  <div className={`absolute bottom-1 right-2 flex items-center gap-1 text-[10px] tracking-tighter ${m.senderId === myId ? 'text-gray-500' : 'text-gray-400'}`}>
                            <span>{new Date(m.timestamp || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            {m.senderId === myId && (
                               m.isRead ? <CheckCheck className="w-3.5 h-3.5 text-blue-500 -ml-0.5" /> : <Check className="w-3 h-3 text-gray-400 -ml-0.5" />
                            )}
                         </div>
                      </div>
                   </div>
                ))}
                <div ref={messagesEndRef} />
             </div>

             {/* Input area */}
             <div className="absolute bottom-0 w-full p-3 bg-[#f0f2f5] md:relative shrink-0 z-10 border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
               <form onSubmit={sendMessage} className="flex items-center gap-3">
                  <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message" className="flex-1 p-3 px-5 bg-white border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-sm" />
                  <button type="submit" className="p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors shadow-md">
                     <Send className="w-5 h-5 -ml-1 mt-0.5" />
                  </button>
               </form>
             </div>
           </>
         ) : (
           <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8 text-center hidden md:flex h-full">
             <MessageCircle className="w-20 h-20 mb-6 text-gray-300 opacity-50" />
             <p className="text-2xl font-extrabold text-gray-400">ShareSphere Web</p>
             <p className="text-sm mt-3 max-w-md leading-relaxed text-gray-500">Send and receive messages in real-time. Negotiate barters securely to build your Community Impact Score.</p>
           </div>
         )}
      </div>
    </div>
  );
}
