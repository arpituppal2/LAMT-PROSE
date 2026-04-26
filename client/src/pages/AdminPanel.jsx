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

PLACEHOLDER_SIGNAL