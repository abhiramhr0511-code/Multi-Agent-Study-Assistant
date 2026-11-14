import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { notificationAPI, authAPI } from '../services/api';
import {
  User,
  Mail,
  Shield,
  Calendar,
  BookOpen,
  LogOut,
  Bell,
  CheckCircle2,
  Clock,
  Send,
  Flame,
  RotateCcw,
  Sparkles,
  AlertCircle,
  History,
  ToggleLeft,
  ToggleRight,
  Check,
  KeyRound
} from 'lucide-react';

export const Profile = () => {
  const { user, logout } = useAuth();

  // Local user state for live verification badge
  const [currentUser, setCurrentUser] = useState(user);

  // Notification Settings State
  const [settings, setSettings] = useState({
    daily_routine_emails: true,
    weekly_exam_emails: true,
    revision_emails: true,
    exam_reminder_emails: true,
    streak_emails: true,
    routine_time: '09:00',
    routine_name: 'Daily Study Sprint',
    routine_activity: 'Review roadmap milestones, complete 1 quiz, and practice weak topics',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // OTP Verification State
  const [otpCode, setOtpCode] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');

  // Test Email State
  const [testType, setTestType] = useState('test');
  const [sendingTest, setSendingTest] = useState(false);
  const [testMessage, setTestMessage] = useState(null);

  // Email Logs State
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    fetchProfileAndSettings();
  }, []);

  const fetchProfileAndSettings = async () => {
    try {
      setLoading(true);
      const [userData, notifData] = await Promise.all([
        authAPI.getMe().catch(() => user),
        notificationAPI.getSettings().catch(() => null),
      ]);
      if (userData) setCurrentUser(userData);
      if (notifData) setSettings(notifData);
    } catch (err) {
      console.error('Failed to load profile/settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSaveSettings = async (e) => {
    e?.preventDefault();
    try {
      setSaving(true);
      setSaveSuccess(false);
      const updated = await notificationAPI.updateSettings(settings);
      setSettings(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save notification settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSendOtp = async () => {
    try {
      setSendingOtp(true);
      setOtpError('');
      setOtpSuccess('');
      const res = await authAPI.sendVerificationOtp();
      setOtpSent(true);
      setOtpSuccess(`Verification code sent to ${currentUser?.email || 'your email'}! Please check your inbox.`);
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Failed to send OTP code. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.trim().length < 4) {
      setOtpError('Please enter a valid 6-digit OTP code.');
      return;
    }
    try {
      setVerifyingOtp(true);
      setOtpError('');
      const res = await authAPI.verifyEmailOtp(otpCode.trim());
      setOtpSuccess('Email successfully verified! Notification emails are now active.');
      setOtpSent(false);
      setOtpCode('');
      setCurrentUser((prev) => ({ ...prev, email_verified: true }));
      // Update in local storage
      const storedUser = JSON.parse(localStorage.getItem('study_user') || '{}');
      localStorage.setItem('study_user', JSON.stringify({ ...storedUser, email_verified: true }));
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Invalid or expired OTP code.');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setSendingTest(true);
      setTestMessage(null);
      const res = await notificationAPI.sendTestEmail(testType);
      if (res.delivery_result?.status === 'unverified' || res.delivery_result?.status === 'skipped') {
        setTestMessage({
          type: 'error',
          text: res.delivery_result?.message || 'Email is unverified. Please verify your email first.',
        });
      } else {
        setTestMessage({
          type: 'success',
          text: `Test email (${testType}) dispatched to ${res.recipient}! Check your inbox or delivery logs.`,
        });
      }
      fetchLogs();
      setTimeout(() => setTestMessage(null), 6000);
    } catch (err) {
      setTestMessage({
        type: 'error',
        text: 'Failed to send test email. Please check email verification status.',
      });
    } finally {
      setSendingTest(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await notificationAPI.getLogs(15);
      setLogs(res.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  const toggleLogsView = () => {
    if (!showLogs) {
      fetchLogs();
    }
    setShowLogs(!showLogs);
  };

  const isVerified = Boolean(currentUser?.email_verified);

  return (
    <div className="space-y-6 max-w-4xl mx-auto font-sans pb-12">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 flex items-center space-x-5 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-brand-200 text-brand-800 flex items-center justify-center text-2xl font-extrabold shadow-2xs">
          {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'A'}
        </div>
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <h1 className="text-xl font-bold text-slate-900">{currentUser?.name || 'Abhishek'}</h1>
            {isVerified ? (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Verified</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                <AlertCircle className="w-3 h-3 text-amber-600" />
                <span>Unverified Email</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">{currentUser?.email || 'abhishek@gmail.com'}</p>
        </div>
      </div>

      {/* Verification Notice Banner (If Unverified) */}
      {!isVerified && (
        <div className="p-5 rounded-3xl bg-amber-50/90 border border-amber-200 text-amber-900 space-y-3 shadow-xs">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-slate-900">Email Verification Required for Automated Notifications</div>
              <p className="text-slate-600 leading-relaxed">
                To protect your privacy and ensure reliable delivery, study notifications (Daily Routines, Exam Alerts, Spaced Revisions) are paused until you verify your email address.
              </p>
            </div>
          </div>

          {!otpSent ? (
            <button
              onClick={handleSendOtp}
              disabled={sendingOtp}
              className="py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-xs flex items-center space-x-2 cursor-pointer disabled:opacity-50"
            >
              <KeyRound className="w-4 h-4" />
              <span>{sendingOtp ? 'Sending OTP Code...' : 'Send Verification OTP'}</span>
            </button>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2">
              <input
                type="text"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="Enter 6-digit OTP code"
                maxLength={6}
                className="px-3.5 py-2 bg-white rounded-xl border border-amber-300 text-xs font-mono font-bold tracking-widest text-slate-900 focus:outline-hidden focus:border-amber-600"
              />
              <button
                type="submit"
                disabled={verifyingOtp}
                className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{verifyingOtp ? 'Verifying...' : 'Verify OTP'}</span>
              </button>
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={sendingOtp}
                className="text-2xs text-amber-800 hover:underline px-2 py-1 font-semibold"
              >
                Resend Code
              </button>
            </form>
          )}

          {otpSuccess && (
            <div className="p-2.5 bg-emerald-100/70 border border-emerald-300 text-emerald-900 text-xs rounded-xl font-medium flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{otpSuccess}</span>
            </div>
          )}

          {otpError && (
            <div className="p-2.5 bg-rose-100/70 border border-rose-300 text-rose-900 text-xs rounded-xl font-medium flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{otpError}</span>
            </div>
          )}
        </div>
      )}

      {/* User Information Card */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-6 shadow-xs">
        <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <Shield className="w-4 h-4 text-brand-600" />
          <span>Account Information</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium flex items-center space-x-1.5">
              <User className="w-3.5 h-3.5 text-brand-600" />
              <span>Full Name</span>
            </span>
            <p className="text-sm font-bold text-slate-900">{currentUser?.name || 'Abhishek'}</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium flex items-center space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-purple-600" />
              <span>Email Address</span>
            </span>
            <div className="flex items-center space-x-2">
              <p className="text-sm font-bold text-slate-900">{currentUser?.email || 'abhishek@gmail.com'}</p>
              {isVerified ? (
                <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Verified</span>
              ) : (
                <span className="text-3xs font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Unverified</span>
              )}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" />
              <span>Account Created</span>
            </span>
            <p className="text-sm font-bold text-slate-900">
              {currentUser?.created_at ? new Date(currentUser.created_at).toLocaleDateString() : 'Active Member'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-slate-500 font-medium flex items-center space-x-1.5">
              <BookOpen className="w-3.5 h-3.5 text-sky-600" />
              <span>AI Engine Access</span>
            </span>
            <p className="text-sm font-bold text-slate-900">FLAN-T5 Local + Groq Phi</p>
          </div>
        </div>
      </div>

      {/* EMAIL NOTIFICATION & ROUTINE PREFERENCES */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-100 space-y-6 shadow-xs">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Bell className="w-4 h-4 text-indigo-600" />
            <span>Email Notification & Routine Preferences</span>
          </h2>
          <span className="text-2xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-100">
            {isVerified ? 'Active & Verified' : 'Verification Required'}
          </span>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-2xl flex items-center space-x-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Notification preferences updated and saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Notification Toggles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* 1. Daily Routine */}
            <div
              onClick={() => handleToggle('daily_routine_emails')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                settings.daily_routine_emails
                  ? 'bg-indigo-50/50 border-indigo-200 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Daily Routine Email</div>
                  <div className="text-2xs text-slate-500">Scheduled study reminder</div>
                </div>
              </div>
              <div>
                {settings.daily_routine_emails ? (
                  <ToggleRight className="w-6 h-6 text-indigo-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-400" />
                )}
              </div>
            </div>

            {/* 2. Weekly Exam */}
            <div
              onClick={() => handleToggle('weekly_exam_emails')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                settings.weekly_exam_emails
                  ? 'bg-purple-50/50 border-purple-200 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Weekly Exam Alerts</div>
                  <div className="text-2xs text-slate-500">Mock test & scope reminders</div>
                </div>
              </div>
              <div>
                {settings.weekly_exam_emails ? (
                  <ToggleRight className="w-6 h-6 text-purple-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-400" />
                )}
              </div>
            </div>

            {/* 3. Revision Due */}
            <div
              onClick={() => handleToggle('revision_emails')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                settings.revision_emails
                  ? 'bg-sky-50/50 border-sky-200 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Spaced Revision Due</div>
                  <div className="text-2xs text-slate-500">Memory curve recall alerts</div>
                </div>
              </div>
              <div>
                {settings.revision_emails ? (
                  <ToggleRight className="w-6 h-6 text-sky-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-400" />
                )}
              </div>
            </div>

            {/* 4. Streak Alert */}
            <div
              onClick={() => handleToggle('streak_emails')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                settings.streak_emails
                  ? 'bg-amber-50/50 border-amber-200 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Study Streak Protection</div>
                  <div className="text-2xs text-slate-500">Daily streak reset warnings</div>
                </div>
              </div>
              <div>
                {settings.streak_emails ? (
                  <ToggleRight className="w-6 h-6 text-amber-600" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-slate-400" />
                )}
              </div>
            </div>
          </div>

          {/* Daily Routine Configuration */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
            <h3 className="text-xs font-bold text-slate-800 flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>Daily Routine Configuration</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-2xs font-bold text-slate-600 mb-1">Scheduled Time (HH:MM)</label>
                <input
                  type="time"
                  value={settings.routine_time || '09:00'}
                  onChange={(e) => setSettings({ ...settings, routine_time: e.target.value })}
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-slate-900 font-semibold focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-2xs font-bold text-slate-600 mb-1">Routine Name</label>
                <input
                  type="text"
                  value={settings.routine_name || ''}
                  onChange={(e) => setSettings({ ...settings, routine_name: e.target.value })}
                  placeholder="e.g. Morning Study Sprint"
                  className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block text-2xs font-bold text-slate-600 mb-1">Activity / Focus Description</label>
              <textarea
                rows={2}
                value={settings.routine_activity || ''}
                onChange={(e) => setSettings({ ...settings, routine_activity: e.target.value })}
                placeholder="Describe your daily target (e.g. practice 1 quiz and review weak concepts)"
                className="w-full px-3 py-2 bg-white rounded-xl border border-slate-200 text-slate-900 font-medium focus:outline-hidden focus:border-indigo-500 resize-none text-xs"
              />
            </div>
          </div>

          {/* Action Button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <span>Saving Preferences...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Notification Preferences</span>
              </>
            )}
          </button>
        </form>

        {/* Send Test Email & History Card */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <select
              value={testType}
              onChange={(e) => setTestType(e.target.value)}
              className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="test">System Verification Test</option>
              <option value="routine">Daily Routine Sample</option>
              <option value="exam">Weekly Exam Sample</option>
              <option value="revision">Spaced Revision Sample</option>
              <option value="streak">Streak Reminder Sample</option>
            </select>

            <button
              type="button"
              onClick={handleSendTestEmail}
              disabled={sendingTest}
              className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingTest ? 'Sending...' : 'Send Test Email'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={toggleLogsView}
            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>{showLogs ? 'Hide History' : 'Delivery History'}</span>
          </button>
        </div>

        {testMessage && (
          <div
            className={`p-3 rounded-2xl text-xs font-medium flex items-center space-x-2 ${
              testMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {testMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{testMessage.text}</span>
          </div>
        )}

        {/* Email Delivery Audit Trail Section */}
        {showLogs && (
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <History className="w-3.5 h-3.5 text-indigo-600" />
                <span>Recent Sent Email Logs ({logs.length})</span>
              </h4>
              <button
                onClick={fetchLogs}
                className="text-2xs text-indigo-600 font-bold hover:underline cursor-pointer"
              >
                Refresh
              </button>
            </div>

            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No email dispatches recorded yet.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-white rounded-xl border border-slate-100 text-xs flex items-center justify-between shadow-2xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">{log.subject}</div>
                      <div className="text-2xs text-slate-500">
                        {log.event_type} &bull; {new Date(log.sent_at).toLocaleString()}
                      </div>
                    </div>
                    <span
                      className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                        log.status === 'sent'
                          ? 'bg-emerald-100 text-emerald-700'
                          : log.status === 'simulated'
                          ? 'bg-indigo-100 text-indigo-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {log.status.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sign Out Button */}
      <button
        onClick={logout}
        className="w-full py-3 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out of Account</span>
      </button>
    </div>
  );
};
