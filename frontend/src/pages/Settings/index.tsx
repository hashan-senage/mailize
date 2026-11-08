import {AlertTriangle, Monitor, Moon, Sun} from 'lucide-react'
import {useEffect, useState, type FormEvent} from 'react'
import {toast} from 'sonner'
import {Button} from '@/components/ui/Button'
import {Card, CardHeader} from '@/components/ui/Card'
import {ConfirmDialog} from '@/components/ui/ConfirmDialog'
import {CopyButton} from '@/components/ui/CopyButton'
import {Field, Input, Switch} from '@/components/ui/Field'
import {ErrorState, Loading} from '@/components/ui/States'
import {useBackend} from '@/hooks/useBackend'
import {cn} from '@/lib/utils'
import {api, errorMessage} from '@/services/api'
import {useThemeStore, type ThemePreference} from '@/stores/theme'
import type {Settings} from '@/types'

const THEMES: {value: ThemePreference; label: string; icon: typeof Sun}[] = [
  {value: 'dark', label: 'Dark', icon: Moon},
  {value: 'light', label: 'Light', icon: Sun},
  {value: 'system', label: 'System', icon: Monitor},
]

const isLoopback = (h: string) => h === 'localhost' || h === '::1' || /^127\./.test(h)

function Row({title, hint, children}: {title: string; hint?: string; children: React.ReactNode}) {
  return (
    <div className="flex items-center justify-between gap-6 py-3">
      <div>
        <p className="text-[13px] font-medium">{title}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

export default function SettingsPage() {
  const {preference, setPreference} = useThemeStore()
  const {data, error, loading, reload} = useBackend(api.settings)
  const {data: storage} = useBackend(api.storageInfo)
  const [form, setForm] = useState<Settings | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [clearing, setClearing] = useState(false)

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  if (loading && !form) return <Loading />
  if (error || !form) return <ErrorState message={error ?? 'Unable to load settings.'} onRetry={reload} />

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm({...form, [k]: v})
  const publicBind = !isLoopback(form.smtpHost)
  const dirty = JSON.stringify(form) !== JSON.stringify(data)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      await api.updateSettings({
        ...form,
        smtpPort: Number(form.smtpPort),
        maxMessageMb: Number(form.maxMessageMb),
        maxConnections: Number(form.maxConnections),
        allowPublicBind: publicBind && form.allowPublicBind,
      })
      toast.success('Settings saved')
      reload()
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card>
        <CardHeader title="Appearance" />
        <div className="grid grid-cols-3 gap-3 p-4">
          {THEMES.map(({value, label, icon: Icon}) => (
            <button
              key={value}
              onClick={() => setPreference(value)}
              aria-pressed={preference === value}
              className={cn(
                'flex flex-col items-center gap-2 rounded-lg border p-4 text-[13px] transition-colors',
                preference === value ? 'border-brand bg-brand/10 text-fg' : 'border-border text-muted hover:text-fg',
              )}
            >
              <Icon className="size-5" />
              {label}
            </button>
          ))}
        </div>
      </Card>

      <form onSubmit={save}>
        <Card>
          <CardHeader title="SMTP server" />
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Host" hint="127.0.0.1 keeps the server private to this computer.">
                <Input value={form.smtpHost} onChange={(e) => set('smtpHost', e.target.value.trim())} className="font-mono" />
              </Field>
              <Field label="Port">
                <Input type="number" min={1} max={65535} value={form.smtpPort} onChange={(e) => set('smtpPort', e.target.valueAsNumber || 0)} className="font-mono" />
              </Field>
              <Field label="Maximum message size (MB)">
                <Input type="number" min={1} max={100} value={form.maxMessageMb} onChange={(e) => set('maxMessageMb', e.target.valueAsNumber || 0)} />
              </Field>
              <Field label="Maximum connections">
                <Input type="number" min={1} max={1000} value={form.maxConnections} onChange={(e) => set('maxConnections', e.target.valueAsNumber || 0)} />
              </Field>
            </div>

            {publicBind && (
              <div role="alert" className="flex gap-3 rounded-lg border border-warning/50 bg-warning/10 p-3 text-[13px]">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
                <div className="space-y-2">
                  <p>
                    <strong>This exposes the SMTP server to your network.</strong> Anyone who can reach this computer and has a
                    project password could submit mail. Authentication is mandatory for non-local addresses.
                  </p>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={form.allowPublicBind} onChange={(e) => setForm({...form, allowPublicBind: e.target.checked, requireAuth: true})} className="accent-[#0878d1]" />
                    I understand the risk and want to bind to {form.smtpHost}
                  </label>
                </div>
              </div>
            )}

            <div className="divide-y divide-border border-t border-border">
              <Row title="Require authentication" hint="Messages must present a project's credentials. When off, anonymous mail goes to an “Unassigned” project.">
                <Switch checked={form.requireAuth} onChange={(v) => set('requireAuth', publicBind ? true : v)} label="Require authentication" />
              </Row>
              <Row title="Start SMTP server when Mailize launches">
                <Switch checked={form.autoStartSmtp} onChange={(v) => set('autoStartSmtp', v)} label="Start SMTP server on launch" />
              </Row>
            </div>

            {formError && <p role="alert" className="text-[13px] text-danger">{formError}</p>}
            <div className="flex items-center justify-end gap-2">
              <p className="mr-auto text-xs text-muted">A running server restarts automatically to apply changes.</p>
              <Button type="button" onClick={() => data && setForm(data)} disabled={!dirty}>Reset</Button>
              <Button type="submit" variant="primary" disabled={!dirty || saving}>Save settings</Button>
            </div>
          </div>
        </Card>
      </form>

      <Card>
        <CardHeader title="Storage" />
        <div className="space-y-3 p-4 text-[13px]">
          {storage &&
            [
              ['Data folder', storage.dataDir],
              ['Database', storage.databasePath],
              ['Attachments', storage.attachmentsDir],
              ['Raw messages', storage.rawDir],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-muted">{label}</span>
                <span className="selectable min-w-0 flex-1 truncate font-mono text-xs">{value}</span>
                <CopyButton text={value} label={`Copy ${label.toLowerCase()} path`} what="Path" />
              </div>
            ))}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted">Deletes every captured email and attachment. Projects and settings are kept.</p>
            <Button className="border-danger/60 text-danger hover:bg-danger/10" onClick={() => setClearing(true)}>
              Clear application data
            </Button>
          </div>
        </div>
      </Card>

      <ConfirmDialog
        open={clearing}
        onOpenChange={setClearing}
        title="Clear all captured data?"
        description="Every captured email and attachment in every project will be permanently deleted. This cannot be undone."
        confirmLabel="Delete everything"
        onConfirm={async () => {
          try {
            await api.clearAllData()
            toast.success('All captured emails deleted')
          } catch (e) {
            toast.error(errorMessage(e))
          }
        }}
      />
    </div>
  )
}
