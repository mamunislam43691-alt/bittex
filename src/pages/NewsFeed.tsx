import { useState, useEffect, useCallback } from 'react'
import { Newspaper, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { adminApi } from '../lib/api'
import { onDataUpdated } from '../lib/socket'
import { notifyGeneral } from '../lib/notificationService'

type Category = 'news' | 'update' | 'tips'

const LAST_SEEN_NEWS_KEY = 'bittx_last_seen_newsfeed'

const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string; label: string }> = {
  news:   { bg: '#dbeafe', text: '#2563eb', border: '#93c5fd', label: 'NEWS' },
  update: { bg: '#ede9fe', text: '#7c3aed', border: '#c4b5fd', label: 'UPDATE' },
  tips:   { bg: '#dcfce7', text: '#16a34a', border: '#86efac', label: 'TIPS' },
}

function MediaBlock({ post }: { post: any }) {
  if (post.videoUrl || post.videoFile) {
    const url = post.videoUrl || post.videoFile || ''
    const isYT = url.includes('youtube.com') || url.includes('youtu.be')
    if (isYT) {
      const ytId = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop()?.split('?')[0]
      return (
        <div style={{ borderRadius: '14px 14px 0 0', overflow: 'hidden' }}>
          <iframe width="100%" height="240" src={`https://www.youtube.com/embed/${ytId}`}
            frameBorder="0" allowFullScreen style={{ display: 'block' }}/>
        </div>
      )
    }
    return <video src={url} controls style={{ width: '100%', borderRadius: '14px 14px 0 0', maxHeight: 240, display: 'block' }}/>
  }
  if (post.imageUrl || post.imageFile) {
    return <img src={post.imageUrl || post.imageFile} alt={post.title}
      style={{ width: '100%', height: 220, objectFit: 'cover', borderRadius: '14px 14px 0 0', display: 'block' }}
      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}/>
  }
  return null
}

function NewsCard({ post, accentColor, isNew }: { post: any; accentColor: string; isNew?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const cat = CATEGORY_COLORS[post.category as Category] || CATEGORY_COLORS.news
  const hasMedia = post.videoUrl || post.videoFile || post.imageUrl || post.imageFile
  const preview = (post.content || '').length > 140 ? post.content.slice(0, 140) + '…' : (post.content || '')

  return (
    <div className="card" style={{
      overflow: 'hidden', padding: 0,
      border: isNew ? `2px solid ${accentColor}` : '1px solid var(--border)',
      borderRadius: 14, background: 'var(--bg-card)', transition: 'box-shadow 0.2s',
      position: 'relative',
    }}>
      {/* NEW ribbon */}
      {isNew && (
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 5,
          display: 'flex', alignItems: 'center', gap: 4,
          background: accentColor, color: '#fff',
          fontSize: 10, fontWeight: 800, padding: '3px 9px',
          borderRadius: 20, letterSpacing: '0.05em',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          animation: 'pulse 2s infinite',
        }}>
          <Sparkles size={9} /> NEW
        </div>
      )}
      {hasMedia && <MediaBlock post={post}/>}
      <div style={{ padding: '18px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: cat.bg, color: cat.text, border: `1px solid ${cat.border}`, letterSpacing: '0.04em' }}>
            {cat.label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
          </span>
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 10px', lineHeight: 1.3 }}>{post.title}</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0 }}>
          {expanded ? post.content : preview}
        </p>
        {(post.content || '').length > 140 && (
          <button onClick={() => setExpanded(v => !v)}
            style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 700, color: accentColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {expanded ? <><ChevronUp size={14}/> Show less</> : <><ChevronDown size={14}/> Read more</>}
          </button>
        )}
        {/* Action Button */}
        {post.buttonText && post.buttonUrl && (
          <a
            href={post.buttonUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              marginTop: 14, padding: '9px 18px', borderRadius: 9,
              background: cat.bg, color: cat.text,
              fontWeight: 700, fontSize: 13, textDecoration: 'none',
              border: `1.5px solid ${cat.border}`,
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
            {post.buttonText}
          </a>
        )}
      </div>
    </div>
  )
}

export default function NewsFeed() {
  const { accentColor } = useTheme()
  const [activeFilter, setActiveFilter] = useState<'all' | Category>('all')
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  // Track when user last visited this page
  const [lastSeenDate, setLastSeenDate] = useState<Date | null>(null)

  useEffect(() => {
    // Load last-seen timestamp
    const stored = localStorage.getItem(LAST_SEEN_NEWS_KEY)
    if (stored) setLastSeenDate(new Date(stored))
    // Mark as seen now
    localStorage.setItem(LAST_SEEN_NEWS_KEY, new Date().toISOString())
  }, [])

  const fetchPosts = useCallback(() => {
    adminApi.newsfeed()
      .then((res: any) => {
        const list = (res?.posts || []).filter((p: any) => p.published)
        setPosts(list)
      })
      .catch(() => setPosts([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  // Realtime: notify + refetch when admin publishes a new post
  useEffect(() => {
    const unsub = onDataUpdated((data: any) => {
      if (data?.type === 'newsfeed' || data?.type === 'announcements') {
        fetchPosts()
        // Fire browser notification for new news post
        if (data?.type === 'newsfeed') {
          notifyGeneral('📰 BITTX SMS — New Post!', 'A new news post has been published.')
        }
      }
    })
    return unsub
  }, [fetchPosts])

  // Helper: is this post "new" (published after last visit)?
  const isNewPost = (post: any) => {
    if (!lastSeenDate) return false
    const postDate = new Date(post.createdAt || post.updatedAt || 0)
    return postDate > lastSeenDate
  }

  const newCount = posts.filter(p => isNewPost(p)).length

  const filtered = activeFilter === 'all' ? posts : posts.filter(p => p.category === activeFilter)

  return (
    <div className="page-wrap">
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Newspaper size={22} style={{ color: accentColor }}/>
          <h1 className="page-title">News Feed</h1>
          {newCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 800, padding: '2px 10px', borderRadius: 20,
              background: accentColor, color: '#fff',
              letterSpacing: '0.04em', animation: 'pulse 2s infinite',
            }}>
              {newCount} NEW
            </span>
          )}
        </div>
        <p className="page-sub">Latest updates and announcements from BITTX SMS.</p>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['all', 'news', 'update', 'tips'] as const).map(cat => (
          <button key={cat} onClick={() => setActiveFilter(cat)}
            style={{
              fontSize: 12, fontWeight: 600, padding: '4px 14px', borderRadius: 20, cursor: 'pointer', border: 'none',
              background: cat === activeFilter
                ? (cat === 'all' ? accentColor : CATEGORY_COLORS[cat as Category].text)
                : (cat === 'all' ? `${accentColor}18` : CATEGORY_COLORS[cat as Category]?.bg || '#f1f5f9'),
              color: cat === activeFilter
                ? '#fff'
                : (cat === 'all' ? accentColor : CATEGORY_COLORS[cat as Category]?.text || '#64748b'),
              transition: 'all 0.15s',
            }}>
            {cat === 'all' ? 'All Posts' : CATEGORY_COLORS[cat as Category]?.label || cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8', fontSize: 13 }}>Loading news...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#94a3b8' }}>
          <Newspaper size={48} style={{ margin: '0 auto 16px', opacity: 0.4 }}/>
          <p style={{ fontSize: 16, fontWeight: 600 }}>No news yet</p>
          <p style={{ fontSize: 13, marginTop: 6 }}>Check back later for updates.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filtered.map((post: any) => (
            <NewsCard
              key={post._id || post.id}
              post={post}
              accentColor={accentColor}
              isNew={isNewPost(post)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
