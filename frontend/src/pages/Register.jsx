import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { BookOpen, ArrowRight, Lock, Mail, User, AlertCircle, ChevronLeft, KeyRound, CheckCircle2, RotateCcw } from 'lucide-react';

export const Register = () => {
  const [step, setStep] = useState(1); // 1: Info Form, 2: OTP Verification
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  
  const { register, user } = useAuth();
  const navigate = useNavigate();

  // Already authenticated — go to dashboard
  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  // Step 1: Request Registration OTP
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await authAPI.sendRegistrationOtp(name, email);
      setSuccessMsg(`A 6-digit verification code was sent to ${email}`);
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send verification code. Please check your email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Complete Registration -> Redirect to Login
  const handleVerifyAndRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp || otp.trim().length < 4) {
      setError('Please enter the 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      await authAPI.register(name, email, password, otp.trim());
      // Navigate to login page so user signs in explicitly
      navigate('/login', {
        state: {
          registeredEmail: email,
          message: 'Account created & verified successfully! Please sign in with your credentials.',
        },
      });
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed. Please check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    try {
      setResending(true);
      setError('');
      await authAPI.sendRegistrationOtp(name, email);
      setSuccessMsg(`New verification code sent to ${email}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 font-sans">
      {/* Back to Home */}
      <div className="w-full max-w-md mb-4">
        <Link to="/" className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-brand-600 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>

      <div className="w-full max-w-md space-y-7 glass-panel p-8 sm:p-10 rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50">
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-500/20">
            {step === 1 ? <BookOpen className="w-8 h-8" /> : <KeyRound className="w-8 h-8" />}
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            {step === 1 ? 'Create an Account' : 'Verify Your Email'}
          </h2>
          <p className="text-xs text-slate-500">
            {step === 1
              ? 'Join StudyMate AI and start learning smarter today'
              : `Enter the 6-digit code sent to ${email}`}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-medium">{successMsg}</span>
          </div>
        )}

        {step === 1 ? (
          /* STEP 1: Registration Details */
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Abhishek"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="abhishek@gmail.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-brand-500 focus:bg-white focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-brand-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              <span>{loading ? 'Sending Code...' : 'Continue & Verify Email'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* STEP 2: OTP Verification */
          <form onSubmit={handleVerifyAndRegister} className="space-y-5">
            <div className="space-y-2 text-center">
              <label className="block text-xs font-bold text-slate-700">Enter 6-Digit Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                className="w-full text-center tracking-widest font-mono text-xl font-bold bg-slate-50 border-2 border-slate-200 rounded-2xl py-3 text-slate-900 placeholder-slate-300 focus:outline-hidden focus:border-brand-500 focus:bg-white transition-all"
              />
              <p className="text-3xs text-slate-400">The verification code expires in 10 minutes</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Verifying Account...' : 'Verify & Create Account'}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between text-xs pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="text-slate-500 hover:text-slate-800 font-semibold"
              >
                &larr; Change Details
              </button>

              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resending}
                className="text-brand-600 hover:text-brand-700 font-bold flex items-center space-x-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{resending ? 'Sending...' : 'Resend Code'}</span>
              </button>
            </div>
          </form>
        )}

        <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
          Already have an account?{' '}
          <Link to="/login" className="text-brand-600 hover:text-brand-700 font-bold">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
};
