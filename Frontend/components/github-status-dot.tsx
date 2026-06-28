'use client'

type DotColor = 'green' | 'yellow' | 'red' | 'gray'

interface GitHubStatusDotProps {
  color: DotColor
  size?: 'sm' | 'md'
  pulse?: boolean
  title?: string
}

const colorMap: Record<DotColor, string> = {
  green: 'bg-emerald-400',
  yellow: 'bg-yellow-400',
  red: 'bg-red-400',
  gray: 'bg-gray-500',
}

const sizeMap = {
  sm: 'w-1.5 h-1.5',
  md: 'w-2 h-2',
}

export function GitHubStatusDot({ color, size = 'sm', pulse, title }: GitHubStatusDotProps) {
  return (
    <span
      title={title}
      className={`inline-block rounded-full ${colorMap[color]} ${sizeMap[size]} ${pulse ? 'animate-pulse' : ''}`}
    />
  )
}
