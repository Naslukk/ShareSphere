import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Trash2, Edit3, X, MessageSquareText } from 'lucide-react';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myResources, setMyResources] = useState([]);
  const [receivedItems, setReceivedItems] = useState([]);
  const [editModal, setEditModal] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return navigate('/auth');

        const [userRes, listRes, txRes] = await Promise.all([
          axios.get('http://localhost:5000/api/auth/me', { headers: { 'x-auth-token': token } }),
          axios.get('http://localhost:5000/api/resources/me', { headers: { 'x-auth-token': token } }),
          axios.get('http://localhost:5000/api/transactions', { headers: { 'x-auth-token': token } })
        ]);

        setUser(userRes.data);

        const txs = txRes.data;
        const myRes = listRes.data.map(r => {
          if (r.status === 'completed') {
            const tx = txs.find(t => t.resourceId && t.resourceId._id === r._id && t.status === 'completed');
            if (tx && tx.consumerId) {
              return { ...r, receiverName: tx.consumerId.name };
            }
          }
          return r;
        });
        setMyResources(myRes);

        // Extract items received by the current user
        const myId = userRes.data._id;
        const received = txs
          .filter(tx => tx.consumerId && tx.consumerId._id === myId && tx.status === 'completed' && tx.resourceId)
          .map(tx => ({ ...tx.resourceId, providerName: tx.providerId?.name }));
        setReceivedItems(received);
      } catch (err) {
        console.error('Error fetching real user data', err);
        navigate('/auth');
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [navigate]);

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/resources/${id}`, { headers: { 'x-auth-token': token } });
      setMyResources(myResources.filter(r => r._id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`http://localhost:5000/api/resources/${editModal._id}`, {
        title: editModal.title,
        description: editModal.description
      }, { headers: { 'x-auth-token': token } });

      setMyResources(myResources.map(r => r._id === editModal._id ? res.data : r));
      setEditModal(null);
    } catch (err) {
      alert('Update failed');
    }
  };

  if (loading) return <div className="text-center mt-20 text-gray-500 font-bold text-xl animate-pulse">Loading Dashboard...</div>;
  if (!user) return null;

  return (
    <div className="flex-grow bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">

        <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Welcome, {user.name}!</h1>
            <p className="text-gray-500 mt-1">Manage your active posts and track your economy contribution.</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-teal-500 flex items-center justify-center text-white font-black text-2xl shadow-inner">
              {user.communityImpactScore || 0}
            </div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Community Economic Score</p>
              <p className="text-sm font-bold text-primary">Top 10% Contributor</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-2xl"></div>
            <span className="text-4xl mb-3 relative z-10">♻️</span>
            <p className="text-sm text-gray-500 font-medium relative z-10">Current Trust Score</p>
            <h3 className="text-3xl font-extrabold text-gray-900 relative z-10">{user.trustScore}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
            <span className="text-4xl mb-3">🤝</span>
            <p className="text-sm text-gray-500 font-medium">Exchanges Completed</p>
            <h3 className="text-3xl font-extrabold text-gray-900">{user.exchangesCompleted || 0}</h3>
          </div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center hover:shadow-md transition-shadow">
            <span className="text-4xl mb-3">🌍</span>
            <p className="text-sm text-gray-500 font-medium">Estimated CO2 Saved</p>
            <h3 className="text-3xl font-extrabold text-primary">{user.co2Saved || 0} kg</h3>
          </div>
        </div>

        {/* Manage My Resources / Requests Section */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <MessageSquareText className="text-primary w-6 h-6" /> Manage My Active Posts
          </h2>
          {myResources.filter(r => r.status !== 'completed').length === 0 ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-500">You haven't posted any active resources or requests yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myResources.filter(r => r.status !== 'completed').map(r => (
                <div key={r._id} className="p-5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:shadow-lg transition-all group relative">
                  <div className="flex justify-between">
                    <span className="text-[10px] font-bold text-primary bg-primary/10 uppercase tracking-wider px-2 py-1 rounded-md">{r.type}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setEditModal(r)} className="text-gray-400 hover:text-blue-500 transition-colors"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(r._id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <h3 className="font-bold text-lg text-gray-900 mt-3">{r.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">{r.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Completed Exchanges Section */}
        {myResources.filter(r => r.status === 'completed').length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">✅</span> Items I've Shared
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myResources.filter(r => r.status === 'completed').map(r => (
                <div key={r._id} className="p-5 rounded-2xl border border-gray-100 bg-blue-50 relative overflow-hidden group">
                  <div className="flex items-start justify-between relative z-10">
                    <h3 className="font-bold text-lg text-blue-900 max-w-[80%]">{r.title}</h3>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-200/50 uppercase tracking-wider px-2 py-1 rounded-md shrink-0 ml-2">{r.type}</span>
                  </div>
                  <p className="text-sm text-blue-700 line-clamp-2 mt-2 relative z-10">{r.description}</p>
                  {r.receiverName && (
                    <p className="text-xs font-bold text-blue-700 mt-4 pt-3 border-t border-blue-200/50 border-dashed relative z-10">
                      ✨ Shared with: {r.receiverName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Received Items Section */}
        {receivedItems.length > 0 && (
          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <span className="text-2xl">🎁</span> Items I've Received
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {receivedItems.map(r => (
                <div key={r._id} className="p-5 rounded-2xl border border-gray-100 bg-emerald-50 relative overflow-hidden group">
                  <div className="flex items-start justify-between relative z-10">
                    <h3 className="font-bold text-lg text-emerald-900 max-w-[80%]">{r.title}</h3>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-200/50 uppercase tracking-wider px-2 py-1 rounded-md shrink-0 ml-2">{r.type}</span>
                  </div>
                  <p className="text-sm text-emerald-700 line-clamp-2 mt-2 relative z-10">{r.description}</p>
                  {r.providerName && (
                    <p className="text-xs font-bold text-emerald-700 mt-4 pt-3 border-t border-emerald-200/50 border-dashed relative z-10">
                      🎁 Received from: {r.providerName}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative">
            <button onClick={() => setEditModal(null)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6">Update Post</h2>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                <input required value={editModal.title} onChange={(e) => setEditModal({ ...editModal, title: e.target.value })} type="text" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-gray-50" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                <textarea required value={editModal.description} onChange={(e) => setEditModal({ ...editModal, description: e.target.value })} rows="3" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary transition-all bg-gray-50"></textarea>
              </div>
              <button type="submit" className="w-full py-3 mt-4 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-emerald-600 transition-colors">
                Save Changes
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
