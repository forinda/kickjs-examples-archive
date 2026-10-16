import { Head, Link } from '@inertiajs/react'
import { Layout } from '~/Layout'

// Rendered for unknown URLs (404) and errors thrown while handling a page.
// In production a 5xx message is replaced with a generic one.
export default function ErrorPage({ status, message }: { status: number; message: string }) {
  return (
    <Layout>
      <Head title={String(status)} />
      <div className="empty">
        <p className="error-status">{status}</p>
        <p className="empty-title">{message}</p>
        <Link href="/notes" className="btn btn-primary">
          Back to notes
        </Link>
      </div>
    </Layout>
  )
}
