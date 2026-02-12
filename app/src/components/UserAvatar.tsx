interface UserAvatarProps {
  email?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  sm: 'h-7 w-7 text-[10px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
}

// Generate a stable color from a string
function colorFromString(str: string): string {
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-rose-500',
    'bg-cyan-500',
    'bg-indigo-500',
    'bg-teal-500',
  ]
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

function getInitials(email?: string, name?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) {
    const local = email.split('@')[0]
    // Try to split on dots or underscores
    const parts = local.split(/[._-]/)
    if (parts.length >= 2 && parts[0] && parts[1]) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return local.slice(0, 2).toUpperCase()
  }
  return '?'
}

export function UserAvatar({ email, name, size = 'md', className = '' }: UserAvatarProps) {
  const initials = getInitials(email, name)
  const bg = colorFromString(email ?? name ?? 'default')

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${bg} ${sizeMap[size]} ${className}`}
      title={name ?? email}
    >
      {initials}
    </div>
  )
}
