import React from 'react';

export const RobotIllustration = () => {
  return (
    <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
      {/* Glow aura */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-purple-400/30 to-indigo-400/20 blur-xl animate-pulse" />

      {/* Modern AI Robot SVG Illustration */}
      <svg
        viewBox="0 0 240 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full relative z-10 drop-shadow-xl"
      >
        <defs>
          <linearGradient id="cloudGrad" x1="0" y1="160" x2="240" y2="220" gradientUnits="userSpaceOnUse">
            <stop stopColor="#e9d5ff" />
            <stop offset="1" stopColor="#c084fc" />
          </linearGradient>
          <linearGradient id="bodyGrad" x1="60" y1="40" x2="180" y2="180" gradientUnits="userSpaceOnUse">
            <stop stopColor="#ffffff" />
            <stop offset="0.5" stopColor="#e0e7ff" />
            <stop offset="1" stopColor="#c7d2fe" />
          </linearGradient>
          <linearGradient id="screenGrad" x1="80" y1="65" x2="160" y2="105" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1e1b4b" />
            <stop offset="1" stopColor="#312e81" />
          </linearGradient>
          <linearGradient id="bookGrad" x1="70" y1="140" x2="170" y2="185" gradientUnits="userSpaceOnUse">
            <stop stopColor="#7c3aed" />
            <stop offset="1" stopColor="#4c1d95" />
          </linearGradient>
          <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#a855f7" />
            <stop offset="1" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        {/* Soft Cloud Base */}
        <path
          d="M40 180 C30 180 20 170 20 155 C20 142 30 132 42 130 C45 115 60 105 75 105 C85 105 95 110 100 118 C108 108 122 102 135 102 C155 102 170 115 174 130 C185 130 195 138 195 150 C195 162 185 170 175 170 L40 180 Z"
          fill="url(#cloudGrad)"
          opacity="0.85"
        />

        {/* Floating Magic Sparkles */}
        <circle cx="35" cy="50" r="3" fill="#a855f7" />
        <circle cx="205" cy="70" r="4" fill="#818cf8" />
        <circle cx="190" cy="140" r="2.5" fill="#c084fc" />
        <path d="M195 45 L200 40 L205 45 L200 50 Z" fill="#7c3aed" />
        <path d="M25 110 L28 105 L31 110 L28 115 Z" fill="#818cf8" />

        {/* Antenna */}
        <line x1="120" y1="42" x2="120" y2="22" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" />
        <circle cx="120" cy="18" r="7" fill="#a855f7" />
        <circle cx="120" cy="18" r="3" fill="#ffffff" />

        {/* Robot Ears */}
        <rect x="62" y="62" width="8" height="16" rx="4" fill="#818cf8" />
        <rect x="170" y="62" width="8" height="16" rx="4" fill="#818cf8" />

        {/* Robot Head */}
        <rect x="68" y="38" width="104" height="74" rx="28" fill="url(#bodyGrad)" stroke="#c7d2fe" strokeWidth="3" />

        {/* Face Screen */}
        <rect x="80" y="52" width="80" height="46" rx="18" fill="url(#screenGrad)" />

        {/* Robot Eyes (Happy Curved Eyes) */}
        <path d="M96 72 Q102 65 108 72" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" />
        <path d="M132 72 Q138 65 144 72" stroke="#38bdf8" strokeWidth="4.5" strokeLinecap="round" />

        {/* Cheeks */}
        <circle cx="92" cy="82" r="4" fill="#f472b6" opacity="0.7" />
        <circle cx="148" cy="82" r="4" fill="#f472b6" opacity="0.7" />

        {/* Robot Body */}
        <path d="M82 116 C82 110 88 106 100 106 L140 106 C152 106 158 110 158 116 L150 160 C150 165 142 168 120 168 C98 168 90 165 90 160 Z" fill="url(#bodyGrad)" stroke="#c7d2fe" strokeWidth="3" />

        {/* Chest Light Emblem */}
        <circle cx="120" cy="126" r="6" fill="#a855f7" />

        {/* Robot Arms Holding Book */}
        <path d="M72 122 Q60 140 85 152" stroke="#c7d2fe" strokeWidth="10" strokeLinecap="round" />
        <path d="M168 122 Q180 140 155 152" stroke="#c7d2fe" strokeWidth="10" strokeLinecap="round" />

        {/* Open Book */}
        <path d="M85 145 Q120 140 120 152 Q120 140 155 145 L152 178 Q120 172 120 182 Q120 172 88 178 Z" fill="url(#bookGrad)" />
        <path d="M90 148 Q118 143 118 154 L118 177 Q90 173 90 175 Z" fill="#ffffff" opacity="0.9" />
        <path d="M150 148 Q122 143 122 154 L122 177 Q150 173 150 175 Z" fill="#ffffff" opacity="0.9" />

        {/* Book Text Lines */}
        <line x1="95" y1="156" x2="112" y2="155" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />
        <line x1="95" y1="162" x2="110" y2="161" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />
        <line x1="128" y1="156" x2="145" y2="155" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" />
        <line x1="128" y1="162" x2="142" y2="161" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" />

        {/* Small Plant next to books */}
        <rect x="180" y="162" width="25" height="14" rx="4" fill="#38bdf8" />
        <rect x="182" y="152" width="21" height="10" rx="3" fill="#f43f5e" />
        <path d="M192 152 C188 140 180 142 184 135 C192 140 192 148 192 152 Z" fill="#4ade80" />
        <path d="M192 152 C196 140 204 142 200 135 C192 140 192 148 192 152 Z" fill="#22c55e" />
      </svg>
    </div>
  );
};
