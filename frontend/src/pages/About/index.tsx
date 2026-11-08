import logo from '@/assets/images/mailize-logo.png'
import {Card} from '@/components/ui/Card'
import {useAppInfo} from '@/hooks/useAppInfo'

export default function AboutPage() {
  const {info, error, loading} = useAppInfo()

  return (
    <div className="mx-auto max-w-xl pt-8">
      <Card className="p-8 text-center">
        <img src={logo} alt="" className="mx-auto size-20" draggable={false} />
        <h2 className="mt-4 text-xl font-semibold">Mailize</h2>
        <p className="mt-1 text-muted">{info?.tagline ?? 'Build. Send. Capture. Debug.'}</p>

        <dl className="selectable mt-6 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-t border-border pt-5 text-left text-[13px]">
          {loading && <dd className="col-span-2 text-muted">Loading…</dd>}
          {error && <dd className="col-span-2 text-danger">Could not read app info: {error}</dd>}
          {info && (
            <>
              <dt className="text-muted">Version</dt>
              <dd className="font-mono">{info.version}</dd>
              <dt className="text-muted">Platform</dt>
              <dd className="font-mono">
                {info.os}/{info.arch}
              </dd>
              <dt className="text-muted">Go runtime</dt>
              <dd className="font-mono">{info.goVersion}</dd>
            </>
          )}
        </dl>

        <p className="mt-6 text-xs text-muted">
          Mailize is a local testing tool. Captured emails are never delivered to real recipients.
        </p>
      </Card>
    </div>
  )
}
