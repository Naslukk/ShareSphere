import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Send, Plus, X, MessageSquare, MapPin, Crosshair } from 'lucide-react';
import { io } from 'socket.io-client';

// Fix Leaflet's default icon path issues in Vite
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center); }, [center, map]);
  return null;
}

const socket = io('http://localhost:5000');

export default function Home() {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  // UI State
  const [showPostModal, setShowPostModal] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState({ title: '', description: '', type: 'lend', distance: '1.0 km' });
  const [geoLoading, setGeoLoading] = useState(false);

  // Default coordinate center (India)
  const defaultCenter = [28.6139, 77.2090];
  const [postCoords, setPostCoords] = useState(defaultCenter);
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  const myId = localStorage.getItem('userId');

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        setPostCoords([pos.coords.latitude, pos.coords.longitude]);
      });
    }
  }, []);

  useEffect(() => {
    const handleConnect = () => socket.emit('join', myId);
    if (myId) {
       if (socket.connected) handleConnect();
       socket.on('connect', handleConnect);
    }
    
    socket.on('receiveMessage', (data) => {
       setMessages(prev => [...prev, { text: data.text, sender: data.senderName }]);
    });
    
    return () => {
       socket.off('connect', handleConnect);
       socket.off('receiveMessage');
    };
  }, [myId]);

  useEffect(() => {
    fetchResources();
  }, []);

  const fetchResources = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/resources');
      setResources(res.data);
    } catch (err) {
      console.error('Failed to fetch resources from backend, falling back to mock.', err);
      setResources([
        { _id: '1', title: 'Power Drill Base', type: 'lend', distance: '1.2 km', ownerId: { _id: '60d5ecb8b392d700153ee001', name: 'Alice' }, location: { coordinates: [-122.4194, 37.7749] } },
        { _id: '2', title: 'React JS Tutoring', type: 'skill', distance: '3.0 km', ownerId: { _id: '60d5ecb8b392d700153ee002', name: 'Bob' }, location: { coordinates: [-122.4080, 37.7800] } },
        { _id: '3', title: 'Organic Tomatoes', type: 'donate', distance: '0.5 km', ownerId: { _id: '60d5ecb8b392d700153ee003', name: 'Carol' }, location: { coordinates: [-122.4210, 37.7650] } }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handlePostChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleUseLocation = () => {
     setGeoLoading(true);
     navigator.geolocation.getCurrentPosition((pos) => {
        setPostCoords([pos.coords.latitude, pos.coords.longitude]);
        setFormData(prev => ({ ...prev, distance: 'Very close' }));
        setGeoLoading(false);
     }, () => {
        alert("Location access denied. Using default SF coordinates.");
        setGeoLoading(false);
     });
  };

  const handlePostSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:5000/api/resources', {
         ...formData,
         location: { type: 'Point', coordinates: [postCoords[1], postCoords[0]] }
      }, { headers: { 'x-auth-token': token }});
      
      setShowPostModal(false);
      setFormData({ title: '', description: '', type: 'lend', distance: '1.0 km' });
      fetchResources();
    } catch(err) {
      console.error(err);
      if(!localStorage.getItem('token')) {
         const newRes = {
            _id: Date.now().toString(),
            title: formData.title,
            type: formData.type,
            distance: formData.distance,
            ownerId: { _id: '60d5ecb8b392d700153ee004', name: 'You (Demo User)' },
            location: { coordinates: [postCoords[1], postCoords[0]] }
         };
         setResources([newRes, ...resources]);
         setShowPostModal(false);
         setFormData({ title: '', description: '', type: 'lend', distance: '1.0 km' });
      } else {
         alert('Failed to post. Check backend connection.');
      }
    }
  };

  const openChat = (resource) => {
    const ownerId = resource.ownerId?._id;
    const ownerName = resource.ownerId?.name || 'Neighbor';
    if (!ownerId) return alert("Cannot chat with an anonymous user!");
    if (ownerId === myId) return alert("This is your own post!");
    navigate('/chats', { state: { newChat: { userId: ownerId, userName: ownerName } } });
  };

  return (
    <div className="flex flex-col md:flex-row flex-grow h-[calc(100vh-64px)] bg-gray-50 overflow-hidden relative">
      
      {/* Sidebar List */}
      <div className="w-full md:w-[400px] h-full bg-white border-r border-gray-200 overflow-y-auto p-4 flex flex-col shadow-xl z-10 shrink-0">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-2xl font-extrabold text-gray-900">Explore Hub</h2>
          <button 
            onClick={() => setShowPostModal(true)}
            className="p-2 bg-primary/10 text-primary rounded-full hover:bg-primary hover:text-white transition-colors"
            title="Post a Resource"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">Discover resources and skills near you.</p>
        
        <input 
          type="text" 
          placeholder="Search items or skills..." 
          className="w-full p-3 mb-4 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary transition-all shadow-inner"
        />
        
        <div className="flex-grow space-y-3 overflow-y-auto pb-6 pr-2">
          {loading ? (
             <p className="text-center text-gray-500 mt-10">Loading real-time resources...</p>
          ) : resources.map((r, index) => (
            <div key={r._id} className="p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer bg-white group relative overflow-hidden">
              {index === 0 && (
                 <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-500 to-teal-400 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-md z-20 flex items-center">
                   ✨ 98% AI Match for your Requests
                 </div>
              )}
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full z-0"></div>
              
              <div className="flex justify-between items-start mb-2 relative z-10 mt-3">
                <div>
                  <h3 className="font-bold text-lg text-gray-800 group-hover:text-primary transition-colors">{r.title}</h3>
                  <span className="text-xs font-semibold text-gray-500">by {r.ownerId?.name || r.user || 'Community'}</span>
                </div>
                <span className="text-[10px] font-bold text-primary bg-primary/10 uppercase tracking-wider px-2 py-1 rounded-md mb-auto">{r.type}</span>
              </div>
              
              <div className="flex items-center text-xs text-gray-500 bg-gray-50 w-fit px-2 py-1 rounded-md mb-3 border border-gray-100 relative z-10">
                <MapPin className="w-3 h-3 mr-1 text-primary"/> {r.distance || 'Nearby'}
              </div>
              
              {r.ownerId?._id !== myId && (
                <button 
                  onClick={() => openChat(r)}
                  className="w-full flex items-center justify-center space-x-2 border border-primary text-primary hover:bg-primary hover:text-white font-semibold py-2 rounded-lg transition-colors relative z-10"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Connect via Chat</span>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
      
      {/* Live Map Area */}
      <div className="flex-grow relative bg-gray-200 z-0 hidden md:block">
        <MapContainer center={mapCenter} zoom={13} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
          <MapUpdater center={mapCenter} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          />
          {resources.map(r => (
             r.location && r.location.coordinates ? (
               <Marker key={`map-${r._id}`} position={[r.location.coordinates[1], r.location.coordinates[0]]}>
                  <Popup>
                    <div className="font-bold text-sm text-gray-900">{r.title}</div>
                    <div className="text-xs font-semibold text-primary uppercase mt-1">{r.type}</div>
                    <div className="text-xs text-gray-500 mt-1">by {r.ownerId?.name || r.user || 'Community'}</div>
                  </Popup>
               </Marker>
             ) : null
          ))}
        </MapContainer>
      </div>

      {/* Post Resource Modal Layer */}
      {showPostModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 relative">
            <button onClick={() => setShowPostModal(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-1">Post a Resource</h2>
            <p className="text-sm text-gray-500 mb-6">Share items or skills to build Community Impact Score.</p>
            
            <form onSubmit={handlePostSubmit} className="space-y-4">
               <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Title</label>
                  <input required name="title" value={formData.title} onChange={handlePostChange} type="text" placeholder="e.g. Lawn Mower, Python Tutoring" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-gray-50" />
               </div>
               
               {/* GeoLocation Feature */}
               <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Location Coordinates</label>
                    <input type="text" readOnly value={`${postCoords[0].toFixed(4)}, ${postCoords[1].toFixed(4)}`} className="w-full p-3 border border-gray-200 rounded-xl bg-gray-100 text-gray-500" />
                  </div>
                  <button type="button" onClick={handleUseLocation} disabled={geoLoading} className="p-3 bg-teal-100 text-teal-800 hover:bg-teal-200 rounded-xl transition-colors whitespace-nowrap font-bold flex items-center gap-1 shadow-sm">
                     <Crosshair className="w-5 h-5"/> {geoLoading ? 'Finding GPS...' : 'Use My GPS'}
                  </button>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
                    <select name="type" value={formData.type} onChange={handlePostChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary bg-gray-50">
                      <option value="lend">Lend Item</option>
                      <option value="donate">Donate Item</option>
                      <option value="exchange">Barter Exchange</option>
                      <option value="skill">Offer Skill</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Visibility Details</label>
                    <input name="distance" value={formData.distance} onChange={handlePostChange} type="text" placeholder="e.g. 1.0 km" className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary bg-gray-50" />
                  </div>
               </div>
               <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
                  <textarea required name="description" value={formData.description} onChange={handlePostChange} rows="3" placeholder="Condition, time availability..." className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary transition-all bg-gray-50"></textarea>
               </div>
               <button type="submit" className="w-full py-3.5 mt-2 bg-gradient-to-r from-primary to-emerald-600 hover:from-emerald-600 hover:to-primary text-white font-bold rounded-xl shadow-lg transform transition-all hover:-translate-y-0.5">
                  Share to Community Map
               </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
