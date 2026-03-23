import { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, User, Map, LayoutDashboard, LogOut, MessageSquare } from 'lucide-react';

const socket = io('http://localhost:5000');

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const myId = localStorage.getItem('userId');
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnread = async () => {
    if(!token) return;
    try {
      const res = await axios.get('http://localhost:5000/api/messages/unread-count', { headers: { 'x-auth-token': token } });
      setUnreadCount(res.data.count);
    } catch(e) {}
  };

  useEffect(() => {
    if (myId) {
       fetchUnread();
       const handleConnect = () => socket.emit('join', myId);
       if (socket.connected) handleConnect();
       socket.on('connect', handleConnect);
       
       const receiveHandler = () => {
          // Immediately bump the badge locally if a message drops in
          setUnreadCount(prev => prev + 1);
       };
       socket.on('receiveMessage', receiveHandler);
       
       window.addEventListener('chatRead', fetchUnread);
       
       return () => {
          socket.off('connect', handleConnect);
          socket.off('receiveMessage', receiveHandler);
          window.removeEventListener('chatRead', fetchUnread);
       };
    }
  }, [myId]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    navigate('/auth');
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-100 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center space-x-2">
            <Leaf className="h-8 w-8 text-primary" />
            <span className="font-bold text-xl tracking-tight text-gray-900">ShareSphere</span>
          </Link>
          <div className="flex space-x-6">
            <Link to="/" className="text-gray-600 hover:text-primary flex items-center space-x-1 transition-colors">
              <Map className="w-5 h-5" />
              <span className="hidden md:inline">Explore</span>
            </Link>
            <Link to="/dashboard" className="text-gray-600 hover:text-primary flex items-center space-x-1 transition-colors">
              <LayoutDashboard className="w-5 h-5" />
              <span className="hidden md:inline">Dashboard</span>
            </Link>
            <Link to="/chats" className="text-gray-600 hover:text-primary flex items-center space-x-1 transition-colors relative">
              <MessageSquare className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 text-[10px] text-white font-bold items-center justify-center border border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
              <span className="hidden md:inline pl-1">Chats</span>
            </Link>
            {token ? (
              <button onClick={handleLogout} className="text-gray-600 hover:text-primary flex items-center space-x-1 transition-colors">
                <LogOut className="w-5 h-5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            ) : (
              <Link to="/auth" className="text-gray-600 hover:text-primary flex items-center space-x-1 transition-colors">
                <User className="w-5 h-5" />
                <span className="hidden md:inline">Login</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
