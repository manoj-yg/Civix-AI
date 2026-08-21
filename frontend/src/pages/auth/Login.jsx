import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/common/Button';
import { Shield, Lock, Mail, UserCheck, Smartphone, CheckCircle2, ArrowRight, Heart, AlertCircle } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState('admin@civix.gov');
  const [password, setPassword] = useState('admin123');
  const [role, setRole] = useState('ADMIN');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleModeSwitch = (selectedRole) => {
    setRole(selectedRole);
    setError('');
    if (selectedRole === 'CITIZEN') {
      setEmail('citizen@civix.gov');
      setPassword('citizen123');
    } else if (selectedRole === 'INSPECTOR') {
      setEmail('inspector@civix.gov');
      setPassword('inspector123');
    } else {
      setEmail('admin@civix.gov');
      setPassword('admin123');
    }
  };

  const handleCitizenQuickLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await login({ email: 'citizen.guest@civix.gov', password: 'guest', role: 'CITIZEN' });
      navigate('/field');
    } catch (err) {
      // Fallback try citizen@civix.gov
      try {
        await login({ email: 'citizen@civix.gov', password: 'citizen123', role: 'CITIZEN' });
        navigate('/field');
      } catch (fallbackErr) {
        setError(fallbackErr.message || err.message || 'Instant citizen login failed. Please enter credentials below.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = await login({ email, password, role });
      const userRole = (user?.role || role || '').toUpperCase();
      if (userRole === 'ADMIN' || userRole === 'ENGINEER') {
        navigate('/admin');
      } else {
        navigate('/field');
      }
    } catch (err) {
      console.error('Login submission error:', err);
      setError(err.message || 'Invalid email or password. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex flex-col justify-center py-10 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-3xl mx-auto shadow-lg">
          C
        </div>
        <h2 className="mt-4 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">CIVIX AI Platform</h2>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
          Predictive Infrastructure Intelligence & Public Asset Monitoring
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white dark:bg-slate-900 py-7 px-6 shadow-xl rounded-2xl border border-slate-200 dark:border-slate-800 space-y-5">
          
          {/* Quick Citizen 1-Click Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-blue-700 dark:text-blue-300 font-bold text-xs">
              <Heart className="w-4 h-4 text-red-500 fill-red-500" />
              <span>Public Citizen Direct Reporting Portal</span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Report potholes, streetlight outages, or footpath damage in 1 tap
            </p>
            <Button
              type="button"
              onClick={handleCitizenQuickLogin}
              loading={loading}
              fullWidth
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 shadow-sm"
              icon={ArrowRight}
            >
              Continue as Citizen Reporter (Instant Access)
            </Button>
          </div>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-[10px] uppercase font-bold text-slate-400 absolute">
              Or Sign In With Role Credentials
            </span>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Switcher */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Select User Workspace
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => handleModeSwitch('ADMIN')}
                className={`py-2 px-2 text-[11px] font-bold rounded-lg border transition-all ${
                  role === 'ADMIN'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Admin / Eng.
              </button>

              <button
                type="button"
                onClick={() => handleModeSwitch('INSPECTOR')}
                className={`py-2 px-2 text-[11px] font-bold rounded-lg border transition-all ${
                  role === 'INSPECTOR'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Field Inspector
              </button>

              <button
                type="button"
                onClick={() => handleModeSwitch('CITIZEN')}
                className={`py-2 px-2 text-[11px] font-bold rounded-lg border transition-all ${
                  role === 'CITIZEN'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                Citizen
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  placeholder="user@civix.gov"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <Button type="submit" fullWidth size="lg" loading={loading} className="py-2.5">
              Sign In to {role === 'ADMIN' ? 'Admin GIS Portal' : role === 'INSPECTOR' ? 'Field App' : 'Citizen Portal'}
            </Button>
          </form>

          <div className="text-center pt-1">
            <p className="text-xs text-slate-500">
              New user?{' '}
              <Link to="/register" className="font-bold text-blue-600 hover:underline">
                Register Credentials
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

