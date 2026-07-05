import { useState, useRef, useEffect } from 'react'
import { Plus, Edit2, Trash2, Eye, EyeOff, Newspaper, X, Save, Image, Link, Video } from 'lucide-react'
import { adminApi } from '../../lib/api'
import { onDataUpdated } from '../../lib/socket'

type Category = 'news' | 'update' | 'tips'

interface NewsPost {
  _id?: string
  id?: string
  title: string
  content: string
  category: Category
  imageUrl?: string
  imageFile?: string
  videoUrl?: string
  videoFile?: string
  buttonText?: string
  buttonUrl?: string
  published: boolean
  createdAt?: string
}

const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string; label: string }> = {
  news:   { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd', label: 'NEWS' },
  update: { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd', label: 'UPDATE' },
  tips:   { bg: '#dcfce7', text: '#16a34a', border: '#86efac', label: 'TIPS' },
}

function MediaPreview({ post }: { post: NewsPost }) {
  if (post.videoUrl || post.videoFile) {
    const url = post.videoUrl || post.videoFile || ''
    const isYT = url.includes('youtube.com') || url.includes('youtu.be')
    if (isYT) {
      const ytId = url.includes('v=')
        ? url.split('v=')[1]?.split('&')[0]
        : url.split('/').pop()?.split('?')[0]
      return (
        <div style={{ borderRadius: 10, overflow: 'hidden', marginTop: 10 }}>
          <iframe width="100%" height="200" src={`https://www.youtube.com/embed/${ytId}`}
            frameBorder="0" allowFullScreen style={{ display: 'block' }}/>
        </div>
      )
    }
    return <video src={url} controls style={{ width: '100%', borderRadius: 10, marginTop: 10, maxHeight: 200 }}/>
  }
  if (post.imageUrl || post.imageFile) {
    return <img src={post.imageUrl || post.imageFile} alt=""
      style={{ width: '100%', borderRadius: 10, marginTop: 10, maxHeight: 200, objectFit: 'cover' }}/>
  }
  return null
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 10,
  border: '1px solid #e2e8f0', background: '#f8fafc', color: '#1e293b',
  outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: '#94a3b8', display: 'block', marginBottom: 6,
}

type MediaMode = 'none' | 'image-upload' | 'image-url' | 'video-url' | 'video-upload'

function NewsPostForm({ initial, onSave, onCancel }: {
  initial?: NewsPost; onSave: (p: NewsPost) => void; onCancel: () => void
}) {
  const [form, setForm] = useState<NewsPost>(
    initial ?? { id: '', title: '', content: '', category: 'news', published: true, createdAt: '' }
  )
  const [mediaMode, setMediaMode] = useState<MediaMode>('none')
  const imgRef = useRef<HTMLInputElement>(null)
  const vidRef = useRef<HTMLInputElement>(null)

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
    if (!form.title.trim()) return
    const saved = { ...form, id: form.id || 'n' + Date.now(), createdAt: form.createdAt || new Date().toISOString().slice(0, 10) }
    onSave(saved)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: '22px 24px', border: '1px solid #7c3aed40' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', margin: 0 }}>{initial ? 'Edit Post' : 'New Post'}</h3>
        <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}><X size={16}/></button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <label style={labelStyle}>TITLE *</label>
          <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Post title..." style={inputStyle}/>
        </div>
        <div>
          <label style={labelStyle}>CONTENT</label>
          <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
            placeholder="Write your post content here..." rows={5} style={{ ...inputStyle, resize: 'vertical' }}/>
        </div>
        <div>
          <label style={labelStyle}>CATEGORY</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {(['news', 'update', 'tips'] as Category[]).map(cat => {
              const c = CATEGORY_COLORS[cat]
              return (
                <button key={cat} onClick={() => setForm(p => ({ ...p, category: cat }))}
                  style={{ flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 700,
                    border: `2px solid ${form.category === cat ? c.border : '#e2e8f0'}`,
                    background: form.category === cat ? c.bg : '#fff',
                    color: form.category === cat ? c.text : '#64748b',
                    cursor: 'pointer', textTransform: 'uppercase' }}>
                  {c.label}
                </button>
              )
            })}
          </div>
        </div>
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
              <button key={m.key} onClick={() => setMediaMode(m.key as MediaMode)}
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
            <input value={form.imageUrl || ''} onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value, imageFile: undefined }))}
              placeholder="https://example.com/image.jpg" style={inputStyle}/>
          )}
          {mediaMode === 'video-url' && (
            <div>
              <input value={form.videoUrl || ''} onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value, videoFile: undefined }))}
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
          <label style={{ ...labelStyle, color: '#7c3aed', marginBottom: 8 }}>🔗 ACTION BUTTON (OPTIONAL)</label>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 10px' }}>Add a button that links users to any URL</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>BUTTON TEXT</label>
              <input
                value={(form as any).buttonText || ''}
                onChange={e => setForm(p => ({ ...p, buttonText: e.target.value } as any))}
                placeholder="e.g. Read More, Visit..."
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>BUTTON URL</label>
              <input
                value={(form as any).buttonUrl || ''}
                onChange={e => setForm(p => ({ ...p, buttonUrl: e.target.value } as any))}
                placeholder="https://..."
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
                background: CATEGORY_COLORS[form.category].bg,
                color: CATEGORY_COLORS[form.category].text,
                border: `1.5px solid ${CATEGORY_COLORS[form.category].border}`,
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

        {/* Published toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Published</label>
          <button onClick={() => setForm(p => ({ ...p, published: !p.published }))}
            style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: form.published ? '#22c55e' : '#e2e8f0', position: 'relative', transition: 'background 0.2s' }}>
            <span style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff',
              left: form.published ? 22 : 2, transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}/>
          </button>
          <span style={{ fontSize: 12, color: form.published ? '#16a34a' : '#94a3b8' }}>
            {form.published ? 'Visible to users' : 'Hidden'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{ padding: '9px 20px', borderRadius: 10, fontSize: 13, fontWeight: 600, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 22px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer' }}>
            <Save size={14}/> {initial ? 'Save Changes' : 'Publish Post'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminNewsFeed() {
  const [posts, setPosts] = useState<NewsPost[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editPost, setEditPost] = useState<NewsPost | null>(null)
  const [msg, setMsg] = useState<{ok:boolean;text:string}|null>(null)

  const flash = (ok:boolean, text:string) => { setMsg({ok,text}); setTimeout(()=>setMsg(null),3000) }

  const fetchPosts = async () => {
    try {
      const res = await adminApi.newsfeed()
      const list = (res?.posts || []).map((p:any) => ({ ...p, id: p._id || p.id }))
      setPosts(list)
    } catch {
      flash(false, 'Failed to load news feed')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [])

  useEffect(() => {
    const unsub = onDataUpdated((data) => {
      if (data.type === 'newsfeed') fetchPosts()
    })
    return unsub
  }, [])

  const handleAdd = async (p: NewsPost) => {
    try {
      const res = await adminApi.createPost({
        title: p.title, content: p.content, category: p.category, published: p.published,
        imageUrl: p.imageUrl, videoUrl: p.videoUrl,
      })
      const created = res?.post || res
      setPosts(prev => [{ ...created, id: created._id || created.id }, ...prev])
      setShowForm(false)
      flash(true, 'Post published!')
    } catch (e:any) { flash(false, e.message || 'Failed to create post') }
  }

  const handleEdit = async (p: NewsPost) => {
    try {
      await adminApi.updatePost(p.id || '', {
        title: p.title, content: p.content, category: p.category, published: p.published,
        imageUrl: p.imageUrl, videoUrl: p.videoUrl,
      })
      setPosts(prev => prev.map(x => x.id === p.id ? p : x))
      setEditPost(null)
      flash(true, 'Post updated!')
    } catch (e:any) { flash(false, e.message || 'Failed to update') }
  }

  const togglePublished = async (id: string) => {
    const post = posts.find(p => p.id === id)
    if (!post) return
    try {
      await adminApi.updatePost(id, { published: !post.published })
      setPosts(prev => prev.map(p => p.id === id ? { ...p, published: !p.published } : p))
    } catch (e:any) { flash(false, e.message) }
  }

  const remove = async (id: string) => {
    try {
      await adminApi.deletePost(id)
      setPosts(prev => prev.filter(p => p.id !== id))
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
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#0f172a', margin: 0 }}>News Feed</h1>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
            {posts.filter(p => p.published).length} published · {posts.length} total
          </p>
        </div>
        <button onClick={() => { setShowForm(true); setEditPost(null) }}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer' }}>
          <Plus size={14}/> New Post
        </button>
      </div>

      {showForm && !editPost && <NewsPostForm onSave={handleAdd} onCancel={() => setShowForm(false)}/>}
      {editPost && <NewsPostForm initial={editPost} onSave={handleEdit} onCancel={() => setEditPost(null)}/>}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 13 }}>Loading posts...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {posts.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              <Newspaper size={40} style={{ margin: '0 auto 12px' }}/>
              <p style={{ fontSize: 15 }}>No posts yet. Create one above!</p>
            </div>
          )}
          {posts.map(post => {
          const cat = CATEGORY_COLORS[post.category]
          const hasMedia = post.videoUrl || post.videoFile || post.imageUrl || post.imageFile
          return (
            <div key={post.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', opacity: post.published ? 1 : 0.6 }}>
              {hasMedia && <div style={{ maxHeight: 200, overflow: 'hidden' }}><MediaPreview post={post}/></div>}
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: cat.bg, color: cat.text, border: `1px solid ${cat.border}` }}>{cat.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: post.published ? '#dcfce7' : '#f1f5f9', color: post.published ? '#16a34a' : '#94a3b8' }}>
                        {post.published ? '● Published' : '○ Hidden'}
                      </span>
                    </div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', margin: '0 0 6px' }}>{post.title}</h3>
                    <p style={{ fontSize: 13, color: '#475569', margin: '0 0 8px', lineHeight: 1.6 }}>
                      {post.content.length > 100 ? post.content.slice(0, 100) + '…' : post.content}
                    </p>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>{post.createdAt}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button onClick={() => { setEditPost(post); setShowForm(false) }} title="Edit"
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e0e7ff', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                      <Edit2 size={13}/>
                    </button>
                    <button onClick={() => togglePublished(post.id || '')} title={post.published ? 'Hide' : 'Publish'}
                      style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                      {post.published ? <EyeOff size={13}/> : <Eye size={13}/>}
                    </button>
                    <button onClick={() => remove(post.id || '')} title="Delete"
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
