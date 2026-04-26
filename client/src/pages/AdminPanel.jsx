import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, ArrowLeft, Search, ChevronRight,
  Save, X, ToggleLeft, ToggleRight, Check, AlertTriangle,
  Plus, Trash2, Pencil, Trophy, ChevronDown,
  FlaskConical, KeyRound, Copy, Users, ChevronUp,
} from 'lucide-react';
import { useAuth } from '../App';
import api from '../utils/api';
import Layout from '../components/Layout';

/* TODO: AdminPanel is not yet implemented. */
const AdminPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user?.isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <ShieldAlert size={32} style={{ color: 'var(--color-text-faint)' }} />
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Access denied.</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1 text-sm"
            style={{ color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <ArrowLeft size={13} /> Go back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl py-20 text-center space-y-4">
        <ShieldAlert size={32} className="mx-auto" style={{ color: 'var(--color-text-faint)' }} />
        <h1 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Admin Panel</h1>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>This page is under construction.</p>
      </div>
    </Layout>
  );
};

export default AdminPanel;
