import React, { useState, useEffect, useContext } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { Users, CheckCircle, HelpCircle, XCircle, Clock, Send } from 'lucide-react';

export default function OrganizerDashboard() {
  const { eventId } = useParams();
  const { user } = useContext(AuthContext);
  const [event, setEvent] = useState(null);
  const [analytics, setAnalytics] = useState({
    going_count: 0,
    maybe_count: 0,
    not_going_count: 0,
    waitlist_count: 0,
    max_capacity: 100,
    capacity_utilization_pct: 0,
  });
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });
  const [statusMsg, setStatusMsg] = useState('');

  // 1. Fetch baseline event & analytics
  useEffect(() => {
    api.get(`/api/events/${eventId}`).then((res) => setEvent(res.data));
    api.get(`/api/events/${eventId}/analytics`).then((res) => setAnalytics(res.data));
  }, [eventId]);

  // 2. Establish Real-Time WebSocket Channel
  useEffect(() => {
    const wsUrl = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + `/ws/events/${eventId}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => console.log('WebSocket Connected to Event Channel');

    socket.onmessage = (eventMsg) => {
      const data = JSON.parse(eventMsg.data);
      if (data.event_type === 'RSVP_UPDATED') {
        setAnalytics((prev) => {
          const going = data.counts.going;
          const totalCapacity = prev.max_capacity;
          return {
            ...prev,
            going_count: going,
            maybe_count: data.counts.maybe,
            not_going_count: data.counts.not_going,
            waitlist_count: data.counts.waitlist,
            capacity_utilization_pct: Math.min(Math.round((going / totalCapacity) * 100), 100),
          };
        });
      }
    };

    socket.onerror = (err) => console.error('WebSocket Error:', err);
    socket.onclose = () => console.log('WebSocket Disconnected');

    return () => socket.close();
  }, [eventId]);

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/api/events/${eventId}/announcements`, announcement);
      setAnnouncement({ title: '', message: '' });
      setStatusMsg('Announcement dispatched to all attendees in real time.');
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setStatusMsg('Failed to post announcement.');
    }
  };

  if (!event) return <div className="p-8 text-center text-slate-500">Loading Cloud Workspace...</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded">
            Live Cloud Telemetry
          </span>
          <h1 className="text-3xl font-bold text-slate-900 mt-2">{event.title}</h1>
          <p className="text-slate-500">{event.venue} • Capacity: {event.max_capacity}</p>
        </div>
      </div>

      {/* Live Counter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-100 rounded-lg text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 transition-all duration-300">
              {analytics.going_count}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Going</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-amber-100 rounded-lg text-amber-600">
            <HelpCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{analytics.maybe_count}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Maybe</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-rose-100 rounded-lg text-rose-600">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{analytics.not_going_count}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Not Going</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-indigo-100 rounded-lg text-indigo-600">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{analytics.waitlist_count}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Waitlist</div>
          </div>
        </div>
      </div>

      {/* Capacity Utilization Progress Bar */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex justify-between items-center text-sm font-medium">
          <span className="text-slate-700">Capacity Saturation</span>
          <span className="text-slate-900 font-semibold">{analytics.capacity_utilization_pct}%</span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              analytics.capacity_utilization_pct >= 100 ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${analytics.capacity_utilization_pct}%` }}
          />
        </div>
        <div className="text-xs text-slate-400">
          {analytics.going_count} confirmed of {analytics.max_capacity} available seats.
        </div>
      </div>

      {/* Broadcast Announcement Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Push Real-Time Announcement</h2>
        {statusMsg && <div className="mb-4 text-sm font-medium text-emerald-700 bg-emerald-50 p-3 rounded">{statusMsg}</div>}
        <form onSubmit={handlePostAnnouncement} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Announcement Title (e.g., Room Changed to Hall B)"
              required
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={announcement.title}
              onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
            />
          </div>
          <div>
            <textarea
              placeholder="Details or instructions for attendees..."
              required
              rows={3}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
              value={announcement.message}
              onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
            />
          </div>
          <button
            type="submit"
            className="flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-lg text-sm font-medium transition"
          >
            <Send className="w-4 h-4" />
            <span>Broadcast Update</span>
          </button>
        </form>
      </div>
    </div>
  );
}