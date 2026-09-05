import { sb } from './supabase'

// ─────────────────────────────────────────────────────────────────────────
// Worker identity verification.
//
// Documents go to the PRIVATE `kyc` bucket. We persist the storage PATH on the
// worker row, not a signed URL: signed URLs expire, and the previous build
// stored one-hour URLs, so by the time an admin opened the approval queue the
// documents were already unviewable. Paths are permanent; every viewer mints a
// fresh signed URL when they actually need to look.
// ─────────────────────────────────────────────────────────────────────────

export const BUCKET = 'kyc'
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024    // 8 MB
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024   // 40 MB

export const DOCS = [
  { key: 'aadhaar_front', label: 'Aadhaar Front', hint: 'Front side of your Aadhaar card',
    pathCol: 'aadhaar_front_path', atCol: 'aadhaar_front_submitted_at',
    legacyCol: 'aadhar_front_url', accept: 'image/*', kind: 'image' },
  { key: 'aadhaar_back',  label: 'Aadhaar Back',  hint: 'Back side of your Aadhaar card',
    pathCol: 'aadhaar_back_path',  atCol: 'aadhaar_back_submitted_at',
    legacyCol: 'aadhar_back_url',  accept: 'image/*', kind: 'image' },
  { key: 'selfie_video',  label: 'Selfie Video',  hint: 'A short video of your face — say your name',
    pathCol: 'selfie_video_path',  atCol: 'selfie_video_submitted_at',
    legacyCol: 'selfie_video_url', accept: 'video/*', kind: 'video' },
]

export const KYC_STATUS_LABEL = {
  pending:            'Pending',
  submitted:          'Pending admin review',
  approved:           'Approved',
  rejected:           'Rejected',
  resubmit_required:  'Resubmission required',
}

// A document counts as submitted if we have its path, or a URL from a build
// that predates the path columns.
export function docSubmitted(worker, doc) {
  return !!(worker?.[doc.pathCol] || worker?.[doc.legacyCol] ||
            (doc.key === 'aadhaar_front' && worker?.aadhaar_front_url) ||
            (doc.key === 'aadhaar_back'  && worker?.aadhaar_back_url))
}

export function allDocsSubmitted(worker) {
  return DOCS.every(d => docSubmitted(worker, d))
}

export function isFullyVerified(worker) {
  return worker?.kyc_status === 'approved' && allDocsSubmitted(worker)
}

/**
 * Upload one document and record it on the worker row.
 * Returns { path } on success, or throws with a message meant for a toast.
 */
export async function uploadDoc(uid, doc, file) {
  if (!file) throw new Error('No file selected')
  const limit = doc.kind === 'video' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES
  if (file.size > limit) {
    throw new Error(doc.kind === 'video'
      ? 'That video is too large — please record a shorter clip (under 40 MB)'
      : 'That image is too large — please use a photo under 8 MB')
  }

  // Unique name per upload: overwriting is rejected by storage RLS, and a fresh
  // name also sidesteps stale CDN copies when a document is re-taken.
  const ext = (file.name?.split('.').pop() || (doc.kind === 'video' ? 'mp4' : 'jpg'))
    .toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'bin'
  const path = `${uid}/${doc.key}-${Date.now()}.${ext}`

  const { error } = await sb.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    cacheControl: '3600',
  })
  if (error) throw new Error(error.message)

  // A long-lived signed URL is stored alongside the path purely so older
  // screens that read the *_url columns keep working; the path is the truth.
  let signed = null
  try {
    const { data } = await sb.storage.from(BUCKET).createSignedUrl(path, 60 * 60 * 24 * 7)
    signed = data?.signedUrl || null
  } catch { /* the path alone is enough */ }

  const patch = {
    [doc.pathCol]: path,
    [doc.atCol]: new Date().toISOString(),
    verification_submitted_at: new Date().toISOString(),
  }
  if (signed) patch[doc.legacyCol] = signed
  if (doc.key === 'aadhaar_front') patch.aadhaar_front_url = signed || undefined
  if (doc.key === 'aadhaar_back')  patch.aadhaar_back_url  = signed || undefined
  if (doc.key !== 'selfie_video')  patch.aadhar_submitted  = true

  const { error: upErr } = await sb.from('workers').update(patch).eq('id', uid)
  if (upErr) throw new Error(upErr.message)
  return { path, signedUrl: signed }
}

// Move the worker into the review queue once all three documents are on file.
export async function submitForReview(uid) {
  const { error } = await sb.from('workers')
    .update({ kyc_status: 'submitted', verification_submitted_at: new Date().toISOString() })
    .eq('id', uid)
  if (error) throw new Error(error.message)
}

// Fresh signed URL for previewing a document the viewer is allowed to read.
export async function signedUrlFor(path, seconds = 3600) {
  if (!path) return null
  const { data } = await sb.storage.from(BUCKET).createSignedUrl(path, seconds)
  return data?.signedUrl || null
}
