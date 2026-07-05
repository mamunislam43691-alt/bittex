import { useState, useEffect, useRef } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff, Image, Link, Video, X, Save } from 'lucide-react'
import { Announcement } from '../data/types'
import { adminApi } from '../../lib/api'
import { onDataUpdated } from '../../lib/socket'

const TYPE_COLORS = {
  info:    { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd' },
  warning: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
  success: { bg: '#dcfce7', text: '#16a34a', border: '#86efac' },
  danger:  { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' },
}

interface AnnouncementFull extends Announcement {
  imageUrl?: string
  imageFile?: string   // base64
  videoUrl?: string
  videoType?: 'youtube' | 'direct' | 'upload'
  videoFile?: string
}

function MediaPreview({ ann }: { ann: AnnouncementFull }) {
  if (ann.videoUrl || ann.videoFile) {
    const url = ann.videoUrl || ann.videoFile || ''
    const isYT = url.includes('youtube.com') || url.includes('youtu.be')
    const ytId = isYT ? (url.split('v=')[1]?.split('&')[0] || url.split('/').pop()) : ''
    if (isYT && ytId) return (
      <div style={{ borderRadius: 10, overflow: 'hidden', marginTop: 10 }}>
        <iframe width="100%" height="200"
          src={`https://www.youtube.com/embed/${ytId}`}
          frameBorder="0" allowFullScreen style={{ display: 'block' }}/>
      </div>
    )
    return (
      <video src={url} controls style={{ width: '100%', borderRadius: 10, marginTop: 10, maxHeight: 200 }}/>
    )
  }
  if (ann.imageUrl || ann.imageFile) {
    return <img src={ann.imageUrl || ann.imageFile} alt="" style={{ width: '100%', borderRadius: 10, marginTop: 10, maxHeight: 200, objectFit: 'cover' }}/>
  }
  return null
}

function AnnouncementForm({
  initial, onSave, onCancel
}: {
  initial?: AnnouncementFull
  onSave: (a: AnnouncementFull) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<AnnouncementFull>(initial || {
    id: '', title: '', message: '', type: 'info', active: true, createdAt: '',
  })
  const [mediaMode, setMediaMode] = useState<'none'|'image-upload'|'image-url'|'video-url'|'video-upload'>('none')
  const imgRef = useRef<HTMLInputElement>(null)
  const vidRef = useRef<HTMLInputElement>(null)

  const inputStyle: React.CSSProperties = { width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 10, border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b', outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 6 }

  const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(p => ({ ...p, imageFile: ev.target?.result as string, imageUrl: undefined }))
    reader.readAsDataURL(file)
  }

  const handleVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(p => ({ ...p, videoFile: ev.target?.result as string, videoUrl: undefined }))
    reader.readAsDataURL(file)
  }

  const handleSave = () => {
    if (!form.title || !form.message) return
    onSave({ ...form, id: form.id || 'an' + Date.now(), createdAt: form.createdAt || new Date().toISOString().slice(0,10) })
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '22px 24px', border: '1px solid #7c3aed40' }}>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
        {initial ? 'Edit Announcement' : 'Create Announcement'}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>TITLE</label>
          <input value={form.title} onChange={e => setForm(p=>({...p,title:e.target.value}))} placeholder="Announcement title..." style={inputStyle}/>
        </div>
        <div>
          <label style={labelStyle}>MESSAGE</label>
          <textarea value={form.message} onChange={e => setForm(p=>({...p,message:e.target.value}))}
            placeholder="Write your message here..." rows={4} style={{ ...inputStyle, resize: 'vertical' }}/>
        </div>
        <div>
          <label style={labelStyle}>TYPE</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['info','warning','success','danger'] as const).map(t => {
              const c = TYPE_COLORS[t]
              return (
                <button key={t} onClick={() => setForm(p=>({...p,type:t}))}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    border: `2px solid ${form.type === t ? c.border : '#e2e8f0'}`,
                    background: form.type === t ? c.bg : '#fff',
                    color: form.type === t ? c.text : '#64748b', cursor: 'pointer', textTransform: 'capitalize' }}>
                  {t}
                </button>
              )
            })}
          </div>
        </div>

        {/* Display Type */}
        <div>
          <label style={labelStyle}>DISPLAY TYPE</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { key: 'popup', icon: '🔔', label: 'Popup', desc: 'Shows as a modal dialog when user opens the panel' },
              { key: 'banner', icon: '📢', label: 'Banner', desc: 'Shows as an inline sliding banner on the Dashboard with dot indicators' },
            ].map(({ key, icon, label, desc }) => (
              <button key={key} type="button"
                onClick={() => setForm(p => ({ ...p, displayType: key } as any))}
                style={{
                  padding: '12px 14px', borderRadius: 10, textAlign: 'left', cursor: 'pointer',
                  border: `2px solid ${(form as any).displayType === key ? '#7c3aed' : '#e2e8f0'}`,
                  background: (form as any).displayType === key ? '#f5f3ff' : '#fff',
                }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: (form as any).displayType === key ? '#6d28d9' : '#1e293b' }}>{label}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2, lineHeight: 1.5 }}>{desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Media section */}
        <div>
          <label style={labelStyle}>MEDIA (OPTIONAL)</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            {[
              { key: 'image-upload', icon: <Image size={13}/>, label: 'Upload Image' },
              { key: 'image-url',    icon: <Link size={13}/>,  label: 'Image URL' },
              { key: 'video-url',    icon: <Video size={13}/>, label: 'Video / YouTube URL' },
              { key: 'video-upload', icon: <Video size={13}/>, label: 'Upload Video' },
              { key: 'none',         icon: <X size={13}/>,     label: 'None' },
            ].map(m => (
              <button key={m.key} onClick={() => setMediaMode(m.key as any)}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${mediaMode === m.key ? '#7c3aed' : '#e2e8f0'}`,
                  background: mediaMode === m.key ? '#f3e8ff' : '#fff',
                  color: mediaMode === m.key ? '#7c3aed' : '#64748b', cursor: 'pointer' }}>
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {mediaMode === 'image-upload' && (
            <div>
              <button onClick={() => imgRef.current?.click()} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px dashed #7c3aed', background: '#faf5ff', color: '#7c3aed', cursor: 'pointer' }}>
                📁 Choose Image File
              </button>
              <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageFile}/>
              {form.imageFile && <img src={form.imageFile} alt="" style={{ width: '100%', maxHeight: 150, objectFit: 'cover', borderRadius: 8, marginTop: 8 }}/>}
            </div>
          )}
          {mediaMode === 'image-url' && (
            <input value={form.imageUrl || ''} onChange={e => setForm(p=>({...p,imageUrl:e.target.value,imageFile:undefined}))}
              placeholder="https://example.com/image.jpg" style={inputStyle}/>
          )}
          {mediaMode === 'video-url' && (
            <div>
              <input value={form.videoUrl || ''} onChange={e => setForm(p=>({...p,videoUrl:e.target.value,videoFile:undefined}))}
                placeholder="YouTube URL or direct video link..." style={inputStyle}/>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Supports YouTube, mp4 links, etc.</p>
            </div>
          )}
          {mediaMode === 'video-upload' && (
            <div>
              <button onClick={() => vidRef.current?.click()} style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px dashed #7c3aed', background: '#faf5ff', color: '#7c3aed', cursor: 'pointer' }}>
                📁 Choose Video File
              </button>
              <input ref={vidRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleVideoFile}/>
              {form.videoFile && <p style={{ fontSize: 12, color: '#22c55e', marginTop: 6 }}>✓ Video loaded</p>}
            </div>
          )}
        </div>

        {/* Action Button (Optional) */}
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
          <label style={{ ...labelStyle, color: '#7c3aed', marginBottom: 10 }}>🔗 ACTION BUTTON (OPTIONAL)</label>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 12px' }}>Add a clickable button that links users to any URL</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>BUTTON TEXT</label>
              <input
                value={(form as any).buttonText || ''}
                onChange={e => setForm(p => ({ ...p, buttonText: e.target.value } as any))}
                placeholder="e.g. Join Now, Learn More..."
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>BUTTON URL</label>
              <input
                value={(form as any).buttonUrl || ''}
                onChange={e => setForm(p => ({ ...p, buttonUrl: e.target.value } as any))}
                placeholder="https://t.me/bittxsms"
                style={inputStyle}
              />
            </div>
          </div>
          {(form as any).buttonText && (form as any).buttonUrl && (
            <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>Preview:</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '5px 14px', borderRadius: 7,
                background: TYPE_COLORS[form.type].bg,
                color: TYPE_COLORS[form.type].text,
                border: `1.5px solid ${TYPE_COLORS[form.type].border}`,
                fontSize: 12, fontWeight: 700,
              }}>
                🔗 {(form as any).buttonText}
              </span>
              <button
                onClick={() => setForm(p => ({ ...p, buttonText: '', buttonUrl: '' } as any))}
                style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, border: '1px solid #fecaca', background: '#fff', color: '#ef4444', cursor: 'pointer' }}>
                Remove
              </button>
            </div>
          )}
        </div>

        {/* Live preview */}
        {(form.title || form.message) && (
          <div>
            <label style={labelStyle}>PREVIEW</label>
            <div style={{ padding: '14px 16px', borderRadius: 12, border: `1px solid ${TYPE_COLORS[form.type].border}`, background: TYPE_COLORS[form.type].bg }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: TYPE_COLORS[form.type].text, margin: '0 0 4px' }}>{form.title || 'Title...'}</p>
              <p style={{ fontSize: 13, color: TYPE_COLORS[form.type].text, margin: 0, opacity: 0.85, lineHeight: 1.5 }}>{form.message || '...'}</p>
              <MediaPreview ann={form}/>
              {(form as any).buttonText && (form as any).buttonUrl && (
                <div style={{ marginTop: 10 }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 14px', borderRadius: 8,
                    background: TYPE_COLORS[form.type].border,
                    color: TYPE_COLORS[form.type].text,
                    fontSize: 12, fontWeight: 700,
                  }}>
                    🔗 {(form as any).buttonText}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Save size={14}/> {initial ? 'Save Changes' : 'Publish'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<AnnouncementFull[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editAnn, setEditAnn] = useState<AnnouncementFull | null>(null)
  const [msg, setMsg] = useState<{ok:boolean;text:string}|null>(null)

  const flash = (ok:boolean, text:string) => { setMsg({ok,text}); setTimeout(()=>setMsg(null),3000) }

  const fetchAnnouncements = async () => {
    try {
      const res = await adminApi.announcements()
      const list = (res?.announcements || []).map((a:any) => ({ ...a, id: a._id || a.id }))
      setAnnouncements(list)
    } catch {
      flash(false, 'Failed to load announcements')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  useEffect(() => {
    const unsub = onDataUpdated((data) => {
      if (data.type === 'announcements') fetchAnnouncements()
    })
    return unsub
  }, [])

  const handleAdd = async (a: AnnouncementFull) => {
    try {
      const res = await adminApi.createAnnouncement({
        title: a.title, message: a.message, type: a.type, active: a.active,
        imageUrl: a.imageUrl, videoUrl: a.videoUrl,
      })
      const created = res?.announcement || res
      setAnnouncements(prev => [{ ...created, id: created._id || created.id }, ...prev])
      setShowForm(false)
      flash(true, 'Announcement published!')
    } catch (e:any) { flash(false, e.message || 'Failed to create') }
  }

  const handleEdit = async (a: AnnouncementFull) => {
    try {
      await adminApi.updateAnnouncement(a.id || '', {
        title: a.title, message: a.message, type: a.type, active: a.active,
        imageUrl: a.imageUrl, videoUrl: a.videoUrl,
      })
      setAnnouncements(prev => prev.map(x => x.id === a.id ? a : x))
      setEditAnn(null)
      flash(true, 'Announcement updated!')
    } catch (e:any) { flash(false, e.message || 'Failed to update') }
  }

  const toggleActive = async (id: string) => {
    const ann = announcements.find(a => a.id === id)
    if (!ann) return
    try {
      await adminApi.updateAnnouncement(id, { active: !ann.active })
      setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, active: !a.active } : a))
    } catch (e:any) { flash(false, e.message) }
  }

  const remove = async (id: string) => {
    try {
      await adminApi.deleteAnnouncement(id)
      setAnnouncements(prev => prev.filter(a => a.id !== id))
      flash(true, 'Deleted!')
    } catch (e:any) { flash(false, e.message) }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {msg && (
        <div style={{padding:'10px 14px',borderRadius:10,fontSize:13,fontWeight:600,
          background:msg.ok?'#f0fdf4':'#fef2f2',border:`1px solid ${msg.ok?'#86efac':'#fecaca'}`,
          color:msg.ok?'#16a34a':'#dc2626'}}>
          {msg.text}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>Announcements</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{announcements.filter(a=>a.active).length} active · {announcements.length} total</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditAnn(null) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Plus size={14}/> New Announcement
        </button>
      </div>

      {showForm && !editAnn && <AnnouncementForm onSave={handleAdd} onCancel={() => setShowForm(false)} />}
      {editAnn && <AnnouncementForm initial={editAnn} onSave={handleEdit} onCancel={() => setEditAnn(null)} />}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 13 }}>Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 13 }}>No announcements yet. Create one above!</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {announcements.map(a => {
            const c = TYPE_COLORS[a.type]
            return (
              <div key={a.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', opacity: a.active ? 1 : 0.55, overflow: 'hidden', display: 'flex' }}>
                <div style={{ width: 5, background: c.border, flexShrink: 0 }}/>
                <div style={{ flex: 1, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'uppercase', background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{a.type}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ''}</span>
                        {a.active && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#dcfce7', color: '#16a34a' }}>● LIVE</span>}
                        {(a as AnnouncementFull).imageUrl && <span style={{ fontSize: 11, color: '#94a3b8' }}>🖼 Image</span>}
                        {((a as AnnouncementFull).videoUrl || (a as AnnouncementFull).videoFile) && <span style={{ fontSize: 11, color: '#94a3b8' }}>🎬 Video</span>}
                      </div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', margin: '0 0 4px' }}>{a.title}</h3>
                      <p style={{ fontSize: 13, color: '#64748b', margin: 0, lineHeight: 1.5 }}>{a.message}</p>
                      <MediaPreview ann={a as AnnouncementFull}/>
                      {/* Button indicator */}
                      {(a as any).buttonText && (a as any).buttonUrl && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <a href={(a as any).buttonUrl} target="_blank" rel="noopener noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 7, background: c.bg, color: c.text, border: `1px solid ${c.border}`, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                            🔗 {(a as any).buttonText}
                          </a>
                          <span style={{ fontSize: 10, color: '#94a3b8', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{(a as any).buttonUrl}</span>
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => { setEditAnn(a as AnnouncementFull); setShowForm(false) }} title="Edit"
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e0e7ff', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6366f1' }}>
                        <Edit2 size={13}/>
                      </button>
                      <button onClick={() => toggleActive(a.id || '')} title={a.active ? 'Hide' : 'Show'}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                        {a.active ? <EyeOff size={13}/> : <Eye size={13}/>}
                      </button>
                      <button onClick={() => remove(a.id || '')}
                        style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #fee2e2', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
