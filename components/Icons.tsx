import React from 'react';

/*
 * One icon set for the dashboard: 24px grid, 1.5 stroke, currentColor.
 * Drawn small and geometric so every glyph reads at 16px.
 */

export interface IconProps {
  size?: number;
  className?: string;
}

const Svg: React.FC<IconProps & { children: React.ReactNode }> = ({ size = 16, className, children }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.5}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const SearchIcon: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <circle cx="11" cy="11" r="7" />
    <path d="M16.5 16.5 21 21" />
  </Svg>
);

export const BoltIcon: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M13 2.5 5 13h6l-1 8.5L18.5 11H12.5z" />
  </Svg>
);

export const BarsIcon: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M5 20V11" />
    <path d="M12 20V4" />
    <path d="M19 20V14" />
  </Svg>
);

export const AlertIcon: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M12 4 21 19.5H3z" />
    <path d="M12 10v4" />
    <path d="M12 17h.01" />
  </Svg>
);

export const CloseIcon: React.FC<IconProps> = (props) => (
  <Svg {...props}>
    <path d="M6 6l12 12" />
    <path d="M18 6 6 18" />
  </Svg>
);
