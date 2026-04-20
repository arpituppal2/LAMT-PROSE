import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { 
  Edit, User, Archive, Star, ChevronDown, ChevronUp, 
  CheckCircle, Image as ImageIcon, X,
  AlertCircle, Save, ArrowLeft, MessageSquare, Trash2,
  Eye, ExternalLink
} from 'lucide-react';
import api from '../utils/api';
import { getProblemStatus, STATUS_BADGE_CLASS } from '../utils/problemStatus';
import { useAuth } from '../utils/AuthContext';
import Layout from '../components/Layout';
import KatexRenderer from '../components/KatexRenderer';