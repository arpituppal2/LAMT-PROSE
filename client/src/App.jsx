import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './utils/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import WriteProblem from './pages/WriteProblem';
import ProblemInventory from './pages/ProblemInventory';
import ProblemDetail from './pages/ProblemDetail';
import Leaderboard from './pages/Leaderboard';
import GiveFeedback from './pages/GiveFeedback';
import ViewTests from './pages/ViewTests';
import QuestionsToEndorse from './pages/QuestionsToEndorse';
import UserProfile from './pages/UserProfile';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }
  return user ? <Navigate to="/home" /> : children;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

          <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/write" element={<PrivateRoute><WriteProblem /></PrivateRoute>} />
          <Route path="/write/:id" element={<PrivateRoute><WriteProblem /></PrivateRoute>} />
          <Route path="/inventory" element={<PrivateRoute><ProblemInventory /></PrivateRoute>} />
          <Route path="/problem/:id" element={<PrivateRoute><ProblemDetail /></PrivateRoute>} />
          <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
          <Route path="/feedback" element={<PrivateRoute><GiveFeedback /></PrivateRoute>} />
          <Route path="/feedback/:problemId" element={<PrivateRoute><GiveFeedback /></PrivateRoute>} />
          <Route path="/tests" element={<PrivateRoute><ViewTests /></PrivateRoute>} />
          <Route path="/endorsements" element={<PrivateRoute><QuestionsToEndorse /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><UserProfile /></PrivateRoute>} />

          <Route path="/" element={<Navigate to="/home" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
