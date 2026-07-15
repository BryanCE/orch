import * as React from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface PasswordDisplayProps {
  password: string
  className?: string
}

export function PasswordDisplay({ password, className }: PasswordDisplayProps) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className={cn('inline-flex items-center gap-1', className)}>
      <code
        className="text-sm bg-muted px-2 py-0.5 rounded font-mono"
        style={{ width: `${password.length + 2}ch` }}
      >
        {visible ? password : '•'.repeat(password.length)}
      </code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={() => setVisible(v => !v)}
      >
        {visible ? (
          <EyeOff className="h-3 w-3" />
        ) : (
          <Eye className="h-3 w-3" />
        )}
      </Button>
    </div>
  )
}
