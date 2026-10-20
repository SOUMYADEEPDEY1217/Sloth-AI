import React from 'react';

interface SlothIconProps {
  className?: string;
  variant?: 'brand' | 'resting' | 'branch';
}

export const SlothIcon: React.FC<SlothIconProps> = ({
  className = 'w-6 h-6',
  variant = 'brand',
}) => {
  if (variant === 'resting') {
    return (
      <svg
        viewBox="0 0 120 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Tree branch */}
        <path
          d="M8 26C35 28 85 24 112 20"
          stroke="currentColor"
          strokeWidth="4.5"
          strokeLinecap="round"
          className="opacity-45"
        />
        <path
          d="M92 22C98 15 104 12 110 11"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className="opacity-35"
        />
        {/* Leaf accent */}
        <path
          d="M18 25C14 17 20 11 26 15C24 21 21 24 18 25Z"
          fill="currentColor"
          className="opacity-30"
        />
        {/* Sloth limbs holding branch */}
        <path
          d="M42 26V42M76 24V40"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
        {/* Hanging sloth body */}
        <path
          d="M36 40C36 55 48 64 62 64C76 64 84 54 84 40C84 34 76 31 60 31C44 31 36 34 36 40Z"
          fill="currentColor"
          className="opacity-15"
        />
        <path
          d="M38 38C38 53 48 62 61 62C74 62 82 52 82 38"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Sloth head */}
        <circle
          cx="44"
          cy="44"
          r="11"
          fill="currentColor"
          className="opacity-20"
        />
        <circle
          cx="44"
          cy="44"
          r="11"
          stroke="currentColor"
          strokeWidth="3"
        />
        {/* Calm closed eyes & gentle smile */}
        <path
          d="M39 43C40.2 44.2 41.8 44.2 43 43"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M46 43C47.2 44.2 48.8 44.2 50 43"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M42.5 47.5C43.8 48.5 45.2 48.5 46.5 47.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Outer calm medallion */}
      <rect
        x="2.5"
        y="2.5"
        width="31"
        height="31"
        rx="9"
        stroke="currentColor"
        strokeWidth="2.2"
        className="opacity-85"
      />
      {/* Top branch line */}
      <path
        d="M7 11.5H29"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        className="opacity-50"
      />
      {/* Sloth face emblem */}
      <circle
        cx="18"
        cy="20.5"
        r="7.5"
        stroke="currentColor"
        strokeWidth="2.2"
      />
      {/* Reach arms up to branch */}
      <path
        d="M13 15L11.5 11.5M23 15L24.5 11.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Eye patches / calm expression */}
      <path
        d="M14.5 19.5C15.2 20.3 16.3 20.3 17 19.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M19 19.5C19.7 20.3 20.8 20.3 21.5 19.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Nose & gentle smile */}
      <circle cx="18" cy="22" r="1.1" fill="currentColor" />
      <path
        d="M16.2 24C17.2 24.8 18.8 24.8 19.8 24"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
};
