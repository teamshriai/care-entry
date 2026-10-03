import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, ExternalLink, MessageCircle, MessageSquareText, QrCode } from 'lucide-react'
import { Card, CardBody, CardHeader } from '../ui/Card'
import { Button } from '../ui/Button'
import { MobileInput } from '../ui/MobileInput'
import { FieldError } from '../patient/AgeConfirm'
import { useToast } from '../../hooks/useToast'
import { isValidMobile, nationalMobile, MOBILE_ERROR } from '../../utils/phone'
import { cn } from '../../utils/cn'
import { selfRegistrationLink } from '../../utils/selfRegistration'

const linkButton =
  'focus-ring inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors'

/**
 * The patient self-registration form, to share: scan the QR code at the
 * desk, open or copy the link, or send it to the patient's mobile by
 * WhatsApp or SMS. The form is a demo for now — answers stay on the
 * patient's phone — so the desk still registers the patient on arrival.
 */
export function SelfRegistrationShare({
  subtitle = 'Share the form — the patient fills it in on their phone',
}: {
  subtitle?: string
}) {
  const { notify } = useToast()
  const link = selfRegistrationLink()
  const [mobile, setMobile] = useState('')
  const [touched, setTouched] = useState(false)
  const valid = isValidMobile(mobile)
  const showError = touched && mobile !== '' && !valid
  const national = nationalMobile(mobile)
  const message = `SHRI Health: please fill in your registration details before your visit — ${link}`

  function copyLink() {
    void navigator.clipboard?.writeText(link).then(
      () => notify('Link copied', { detail: link }),
      () => notify('Could not copy the link', { tone: 'error' }),
    )
  }

  const sendClass = (enabled: boolean) =>
    cn(
      linkButton,
      enabled ? 'border-border bg-surface-1 text-ink hover:bg-surface-2' : 'pointer-events-none border-border-soft bg-surface-2 text-ink-subtle',
    )

  return (
    <Card accentTone="teal">
      <CardHeader icon={QrCode} iconTone="teal" title="Patient self-registration" subtitle={subtitle} />
      <CardBody className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start gap-4">
          {/* White behind the code in both themes, so any phone can read it. */}
          <div className="shrink-0 rounded-xl bg-white p-2.5 shadow-card">
            <QRCodeSVG value={link} size={112} level="M" role="img" aria-label="QR code that opens the self-registration form" />
          </div>
          <div className="flex min-w-0 flex-1 basis-48 flex-col gap-2">
            <p className="break-all rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-muted">{link}</p>
            <div className="flex flex-wrap gap-2">
              <a href={link} target="_blank" rel="noopener noreferrer" className={cn(linkButton, 'border-transparent bg-primary-600 text-on-primary hover:bg-primary-700')}>
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
                Open form
              </a>
              <Button size="sm" variant="secondary" onClick={copyLink}>
                <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                Copy link
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border-soft pt-3">
          <label htmlFor="share-mobile" className="text-xs font-medium text-ink-muted">
            Send to the patient's mobile
          </label>
          <div className="flex flex-wrap gap-2">
            <MobileInput
              id="share-mobile"
              value={mobile}
              onValueChange={setMobile}
              onBlur={() => setTouched(true)}
              placeholder="10-digit mobile"
              aria-invalid={showError}
              aria-describedby={showError ? 'share-mobile-error' : undefined}
              className={cn(
                'h-9 min-w-0 flex-1 basis-36 rounded-lg border bg-surface-1 px-3 text-sm text-ink outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600',
                showError ? 'border-critical' : 'border-border',
              )}
            />
            <a
              href={valid ? `https://wa.me/91${national}?text=${encodeURIComponent(message)}` : undefined}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={!valid}
              className={sendClass(valid)}
            >
              <MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              WhatsApp
            </a>
            <a href={valid ? `sms:+91${national}?body=${encodeURIComponent(message)}` : undefined} aria-disabled={!valid} className={sendClass(valid)}>
              <MessageSquareText className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden="true" />
              SMS
            </a>
          </div>
          {showError ? <FieldError id="share-mobile-error" message={MOBILE_ERROR} /> : null}
        </div>

        <p className="text-xs text-ink-subtle">
          The form is a preview: what the patient fills in stays on their phone and is not sent to the desk yet. Register the patient here when they
          arrive.
        </p>
      </CardBody>
    </Card>
  )
}
