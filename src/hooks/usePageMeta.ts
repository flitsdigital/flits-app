import { useEffect } from 'react'

export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title

    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!metaDesc) {
      metaDesc = document.createElement('meta')
      metaDesc.name = 'description'
      document.head.appendChild(metaDesc)
    }
    if (description) metaDesc.content = description

    return () => {
      // Reset naar default bij unmount
      document.title = 'Flits Impact'
    }
  }, [title, description])
}
