import { useState } from 'react'
import { C, card, btnPrimary, btnGreen } from '../theme'
import { DOCS, KYC_STATUS_LABEL, docSubmitted, allDocsSubmitted, uploadDoc, submitForReview } from '../lib/kyc'

const STATUS_TONE = {
  approved:          { bg: C.greenL,  fg: C.green,  ico: '✓' },
  submitted:         { bg: C.blueL,   fg: C.blue,   ico: '⏳' },
  pending:           { bg: C.amberL,  fg: '#92400E',ico: '•' },
  rejected:          { bg: C.redL,    fg: C.red,    ico: '✕' },
  resubmit_required: { bg: C.amberL,  fg: '#92400E',ico: '↻' },
}

/**
 * Aadhaar front, Aadhaar back and a selfie video — the three things a worker
 * must hand over before they can be approved. Used both in onboarding and in
 * the profile, so there is one place that knows what "verified" means.
 *
 * onChange(updatedWorkerPatch) lets the parent keep its copy of the profile
 * current without a refetch.
 */
export default function VerificationPanel({ worker, showToast, onChange, compact = false }) {
  const [busy,  setBusy]  = useState(null)   // doc key currently uploading
  const [local, setLocal] = useState({})     // optimistic per-doc state

  const w = { ...(worker || {}), ...local }
  const status = w.kyc_status || 'pending'
  const tone = STATUS_TONE[status] || STATUS_TONE.pending
  const complete = allDocsSubmitted(w)

  async function handleFile(doc, file) {
    if (!file || !w.id) return
    setBusy(doc.key)
    try {
      const { path } = await uploadDoc(w.id, doc, file)
      const patch = { [doc.pathCol]: path, [doc.atCol]: new Date().toISOString() }
      setLocal(prev => ({ ...prev, ...patch }))
      onChange?.(patch)
      showToast?.(`${doc.label} uploaded ✓`)
    } catch (e) {
      showToast?.(e.message || 'Upload failed — please try again')
    } finally {
      setBusy(null)
    }
  }

  async function submit() {
    if (!complete) { showToast?.('Please upload all three documents first'); return }
    setBusy('submit')
    try {
      await submitForReview(w.id)
      setLocal(prev => ({ ...prev, kyc_status: 'submitted' }))
      onChange?.({ kyc_status: 'submitted' })
      showToast?.('Sent for verification — an admin will review shortly ⏳')
    } catch (e) {
      showToast?.(e.message || 'Could not submit')
    } finally { setBusy(null) }
  }

  return (
    <div style={compact ? {} : { ...card, padding:16 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, marginBottom:6 }}>
        <p style={{ fontWeight:800, fontSize:15, color:C.text }}>🛡️ Identity Verification</p>
        <span style={{ background:tone.bg, color:tone.fg, fontSize:11, fontWeight:800,
          padding:'4px 10px', borderRadius:8, whiteSpace:'nowrap' }}>
          {tone.ico} {KYC_STATUS_LABEL[status] || status}
        </span>
      </div>
      <p style={{ fontSize:12, color:C.text3, marginBottom:12, lineHeight:1.55 }}>
        You can browse the app while this is pending, but you can only be assigned jobs once an
        admin approves your documents. They are stored privately and are never shown to customers
        or other workers.
      </p>

      {(status === 'rejected' || status === 'resubmit_required') && w.kyc_rejection_reason && (
        <div style={{ background:C.redL, border:`1px solid ${C.red}`, borderRadius:12, padding:'11px 13px', marginBottom:12 }}>
          <p style={{ fontSize:12, fontWeight:800, color:C.red, marginBottom:3 }}>
            {status === 'rejected' ? 'Rejected by admin' : 'Resubmission requested'}
          </p>
          <p style={{ fontSize:12.5, color:C.text2, lineHeight:1.5 }}>{w.kyc_rejection_reason}</p>
        </div>
      )}

      {DOCS.map(doc => {
        const done = docSubmitted(w, doc)
        const uploading = busy === doc.key
        return (
          <div key={doc.key} style={{ display:'flex', alignItems:'center', gap:12,
            padding:'12px 0', borderTop:`1px solid ${C.lineSoft}` }}>
            <div style={{ width:38, height:38, borderRadius:11, flexShrink:0,
              background: done ? C.greenL : C.cardAlt, color: done ? C.green : C.text3,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:17, fontWeight:900 }}>
              {done ? '✓' : (doc.kind === 'video' ? '🎥' : '🪪')}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <p style={{ fontSize:14, fontWeight:700, color:C.text }}>{doc.label}</p>
              <p style={{ fontSize:11.5, color: done ? C.green : C.text3, marginTop:2 }}>
                {done ? 'Submitted' : 'Not Submitted'}{!done && ` · ${doc.hint}`}
              </p>
            </div>
            <label style={{ flexShrink:0, background: done ? C.card : C.yellow,
              border: done ? `1.5px solid ${C.line}` : 'none', borderRadius:11,
              padding:'9px 14px', fontSize:12.5, fontWeight:800, cursor:'pointer',
              color:C.text, opacity: uploading ? .6 : 1 }}>
              {uploading ? 'Uploading…' : (done ? 'Replace' : 'Upload')}
              <input type="file" accept={doc.accept}
                capture={doc.kind === 'video' ? 'user' : 'environment'}
                style={{ display:'none' }} disabled={!!busy}
                onChange={e => { handleFile(doc, e.target.files?.[0]); e.target.value = '' }} />
            </label>
          </div>
        )
      })}

      {doc_note()}

      {status !== 'approved' && (
        <button onClick={submit} disabled={!complete || busy === 'submit'}
          style={{ ...(complete ? btnGreen : btnPrimary), marginTop:12,
            background: complete ? C.green : C.lineSoft,
            color: complete ? '#fff' : C.text3,
            opacity: busy === 'submit' ? .6 : 1,
            cursor: complete ? 'pointer' : 'not-allowed' }}>
          {busy === 'submit' ? 'Submitting…'
            : status === 'submitted' ? 'Resend for verification'
            : complete ? 'Submit for verification ✓'
            : 'Upload all three to continue'}
        </button>
      )}
    </div>
  )
}

function doc_note() {
  return (
    <p style={{ fontSize:11, color:C.text3, marginTop:10, lineHeight:1.55,
      background:C.cardAlt, borderRadius:10, padding:'10px 12px' }}>
      🎥 For the selfie video: hold the phone at arm's length, look at the camera and say your full
      name. Ten seconds is enough. Good light, no cap or sunglasses.
    </p>
  )
}
