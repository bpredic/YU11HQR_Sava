import { cn } from "@/lib/utils"

interface FilenameCellProps {
  filename: string
  className?: string
  maxWidth?: number
}

export function FilenameCell({ filename, className, maxWidth = 180 }: FilenameCellProps) {
  return (
    <div className={cn("relative group", className)} style={{ maxWidth }}>
      <div className="truncate whitespace-nowrap">{filename}</div>
      <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 w-max max-w-xs whitespace-normal break-all rounded-md border bg-popover px-2.5 py-1.5 text-xs font-mono text-popover-foreground shadow-md opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        {filename}
      </div>
    </div>
  )
}
