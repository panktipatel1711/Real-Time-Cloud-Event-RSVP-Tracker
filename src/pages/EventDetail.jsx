import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Calendar, MapPin, Check, HelpCircle, X, AlertTriangle } from 'lucide-react';

export default function EventDetail() {
  const { eventId } = useParams();
  const { user } = useContext(AuthContext);
  const [event, setEvent] = useState(null);
  const [currentRsvp, setCurrentRsvp] = useState(null);
  const [guests, setGuests] = useState(0);
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    api.get(`/api/events/${eventId}`).then((res) => setEvent(res.data));
  }, [eventId]);

  // Real-time listener for organizer announcements
  useEffect(() => {
    const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + `/ws/events/${eventId}`;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (eventMsg) => {
      const data = JSON.parse(eventMsg.data);
      if (data.event_type === 'NEW_ANNOUNCEMENT') {
        setNotification(`ANNOUNCEMENT: ${data.title} - ${data.message}`);
      }
    };

    return () => socket.close();
  }, [eventId]);

  const handleRSVP = async (status) => {
    try {
      const res = await api.post(`/api/events/${eventId}/rsvp`, { status, guests: parseInt(guests) });
      setCurrentRsvp(res.data.status);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit RSVP');
    }
  };

  if (!event) return <div className="p-8 text-center text-slate-500">Loading Event Details...</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {notification && (
        <div className="p-4 bg-amber-50 border-l-4 border-amber-500 text-amber-800 text-sm flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h1 className="text-3xl font-extrabold text-slate-900">{event.title}</h1>
        <p className="text-slate-600 leading-relaxed">{event.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-slate-100 text-sm text-slate-600">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>{new Date(event.event_date).toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <span>{event.venue}</span>
          </div>
        </div>

        {/* RSVP Buttons */}
        <div className="pt-4 space-y-4">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
            Number of Additional Guests (+1s):
          </label>
          <input
            type="number"
            min="0"
            max="3"
            value={guests}
            onChange={(e) => setGuests(e.target.value)}
            className="w-24 px-3 py-1.5 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleRSVP('GOING')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
                currentRsvp === 'GOING'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>Going</span>
            </button>

            <button
              onClick={() => handleRSVP('MAYBE')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
                currentRsvp === 'MAYBE'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>Maybe</span>
            </button>

            <button
              onClick={() => handleRSVP('NOT_GOING')}
              className={`flex items-center space-x-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition ${
                currentRsvp === 'NOT_GOING'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
            >
              <X className="w-4 h-4" />
              <span>Not Going</span>
            </button>
          </div>

          {currentRsvp && (
            <div className="mt-4 p-3 bg-slate-50 rounded-lg text-xs font-medium text-slate-700 border">
              Current Registered Status: <span className="font-bold text-slate-900">{currentRsvp}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}