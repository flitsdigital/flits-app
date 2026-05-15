import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from 'lucide-react'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      expand
      visibleToasts={4}
      className="toaster group"
      style={{ zIndex: 99999 }}
      toastOptions={{
        style: { zIndex: 99999 },
        classNames: {
          toast:
            'group toast !bg-zinc-900 !text-zinc-50 !border-zinc-600 !shadow-xl',
          description: 'group-[.toast]:!text-zinc-400',
          success: '!bg-zinc-900 !text-zinc-50 !border-green-600',
          error: '!bg-zinc-900 !text-zinc-50 !border-red-600',
        },
      }}
      icons={{
        success: <CircleCheck className="h-4 w-4 text-green-400" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4 text-red-400" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
