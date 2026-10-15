import { Link, usePage } from '@inertiajs/react'
import type { ReactNode } from 'react'
import { Toasts } from './toasts'

/** The shared props from InertiaAdapter's `share` (src/inertia.ts). */
export interface SharedProps {
  [key: string]: unknown
  appName: string
  user: { name: string }
}

export function Layout({ children }: { children: ReactNode }) {
  const { props } = usePage<SharedProps>()
  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/notes" className="brand">
            {props.appName}
          </Link>
          <span className="user" title="Shared prop from InertiaAdapter's share()">
            {props.user.name}
          </span>
        </div>
      </header>
      <main className="content">{children}</main>
      <Toasts />
    </>
  )
}
