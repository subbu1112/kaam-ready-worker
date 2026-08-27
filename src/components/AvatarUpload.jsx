import { useState, useEffect } from 'react'
import { sb } from '../lib/supabase'

// Accepts either `userId` or a full `user` object. If `currentUrl` isn't
// passed, it loads the saved avatar itself so the photo always shows.
export default function AvatarUpload({ user, userId, currentUrl, table = 'profiles', onUploaded, size = 72, dark = false, showToast }) {
  const uid = userId || user?.id
  const [uploading, setUploading] = useState(false)
  const [url, setUrl] = useState(currentUrl || null)

  useEffect(() => { if (currentUrl) setUrl(currentUrl) }, [currentUrl])

  useEffect(() => {
    if (currentUrl || !uid) return
    sb.from(table).select('avatar_url').eq('id', uid).single()
      .then(({ data }) => { if (data?.avatar_url) setUrl(data.avatar_url) })
  }, [uid, table, currentUrl])

  const notify = (msg) => { if (showToast) showToast(msg); else console.log(msg) }

  async function pick(e) {
    const file = e.target.files[0]
    e.target.value = '' // allow picking the same file again
    if (!file) return
    if (!uid) { notify('Please log in again to change your photo'); return }
    setUploading(true)
    try {
      // Unique filename per upload: works even when the storage bucket only
      // allows inserts (no update policy), and the CDN can never serve a
      // stale cached image.
      const path = `${uid}/avatar-${Date.now()}.jpg`
      const { error: upErr } = await sb.storage.from('avatars')
        .upload(path, file, { contentType: file.type || 'image/jpeg' })
      if (upErr) throw upErr
      const { data } = sb.storage.from('avatars').getPublicUrl(path)
      const publicUrl = data.publicUrl
      const { error: dbErr } = await sb.from(table).update({ avatar_url: publicUrl }).eq('id', uid)
      if (dbErr) throw dbErr
      setUrl(publicUrl)
      onUploaded && onUploaded(publicUrl)
      notify('Profile photo updated ✓')
    } catch (err) {
      console.error('Avatar upload failed:', err)
      notify('Photo update failed — ' + (err?.message || 'please try again'))
    }
    setUploading(false)
  }

  const bg = dark ? '#F1F1F3' : '#FFF7DA'

  return (
    <label style={{ cursor:'pointer', display:'block', width:size, height:size, borderRadius:size*0.28, margin:'0 auto', position:'relative' }}>
      {url ? (
        <img src={url} alt="avatar"
          style={{ width:size, height:size, borderRadius:size*0.28, objectFit:'cover', border:'3px solid #F5C000' }} />
      ) : (
        <div style={{ width:size, height:size, borderRadius:size*0.28, background:bg,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.5 }}>
          {dark ? '⚡' : '👤'}
        </div>
      )}
      <div style={{ position:'absolute', bottom:-4, right:-4, width:26, height:26, borderRadius:8,
        background:'#F5C000', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14,
        boxShadow:'0 2px 6px rgba(0,0,0,.2)' }}>
        {uploading ? '⏳' : '📷'}
      </div>
      <input type="file" accept="image/*" aria-label="Upload profile photo" style={{ display:'none' }} onChange={pick} disabled={uploading} />
    </label>
  )
}
