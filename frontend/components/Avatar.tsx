import React, { memo, useMemo } from 'react';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  'aria-label'?: string;
}

// Color palette for consistent avatar backgrounds
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-indigo-500',
  'bg-red-500',
  'bg-teal-500',
] as const;

// Size configurations
const SIZE_CONFIGS = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
} as const;

/**
 * Generate initials from a full name
 * Takes up to the first 2 words and uses their first letters
 */
const getInitials = (fullName: string): string => {
  if (!fullName?.trim()) return '?';
  
  return fullName
    .trim()
    .split(' ')
    .slice(0, 2) // Take only first two words
    .map(word => word.charAt(0).toUpperCase())
    .join('');
};

/**
 * Generate a consistent background color based on the name
 * Uses a simple hash to ensure the same name always gets the same color
 */
const getBackgroundColor = (name: string): string => {
  if (!name?.trim()) return AVATAR_COLORS[0];
  
  const hash = name
    .trim()
    .toLowerCase()
    .split('')
    .reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);
  
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

/**
 * Avatar component displays user initials in a colored circle
 * 
 * @param name - Full name of the user
 * @param size - Size variant (sm, md, lg)
 * @param className - Additional CSS classes
 * @param onClick - Click handler function
 * @param aria-label - Accessibility label
 */
const Avatar: React.FC<AvatarProps> = memo(({ 
  name, 
  size = 'md', 
  className = '',
  onClick,
  'aria-label': ariaLabel
}) => {
  const initials = useMemo(() => getInitials(name), [name]);
  const backgroundColor = useMemo(() => getBackgroundColor(name), [name]);
  const sizeClass = SIZE_CONFIGS[size];

  const baseClasses = `
    ${sizeClass}
    ${backgroundColor}
    rounded-full
    flex
    items-center
    justify-center
    text-white
    font-medium
    select-none
    ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}
    ${className}
  `.replace(/\s+/g, ' ').trim();

  const Component = onClick ? 'button' : 'div';
  const accessibilityLabel = ariaLabel || `Avatar for ${name}`;

  return (
    <Component
      className={baseClasses}
      onClick={onClick}
      title={name}
      aria-label={accessibilityLabel}
      {...(onClick && { type: 'button' })}
    >
      {initials}
    </Component>
  );
});

Avatar.displayName = 'Avatar';

export default Avatar; 