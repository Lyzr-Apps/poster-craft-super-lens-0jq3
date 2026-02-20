'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  FiPlus, FiImage, FiClock, FiDownload, FiHome, FiList,
  FiMenu, FiX, FiChevronRight, FiEdit2, FiCheck,
  FiArrowLeft, FiRefreshCw, FiLoader, FiAlertCircle,
  FiCheckCircle, FiTarget, FiType, FiLayout, FiUsers,
  FiDroplet, FiActivity, FiSend, FiTrash2
} from 'react-icons/fi'

// ---- Constants ----
const REQUIREMENTS_AGENT_ID = '6998e3d4dfb56bc22e407f77'
const POSTER_DESIGNER_AGENT_ID = '6998e3d47acfd7d95876f94d'

const PURPOSES = ['Product Launch', 'Event Promo', 'Offer Announcement', 'Brand Awareness', 'Social Campaign']
const FONT_PREFS = ['Modern Sans-Serif', 'Classic Serif', 'Bold Display', 'Minimal Clean', 'Playful Rounded']
const PLATFORMS = ['Instagram Story', 'Instagram Post', 'LinkedIn Post', 'Facebook Ad', 'A4 Print']
const TONES = ['Bold', 'Minimal', 'Corporate', 'Playful', 'Elegant']

const STORAGE_KEY = 'posterforge_history'

// ---- Types ----
type ScreenType = 'dashboard' | 'brief' | 'review' | 'output'

interface PosterHistoryItem {
  id: string
  name: string
  platform: string
  imageUrl: string
  createdAt: string
  brief: any
}

interface BriefFormData {
  purpose: string
  headline: string
  bodyCopy: string
  ctaText: string
  brandColors: string[]
  fontPreference: string
  platform: string
  tone: string
  audience: string
}

interface CopyHierarchy {
  headline: string
  subhead: string
  body: string
  cta: string
}

interface PlatformSpecs {
  platform: string
  dimensions: string
  format: string
}

interface ColorTypography {
  primary_colors: string
  font_suggestions: string
}

interface AnalystBrief {
  copy_hierarchy: CopyHierarchy
  layout_direction: string
  platform_specs: PlatformSpecs
  audience_messaging: string
  color_typography: ColorTypography
  tone_alignment: string
}

interface DesignerResult {
  design_description: string
  design_notes: string
}

// ---- Helpers ----
function safeParseResult(result: any): any {
  if (!result) return {}
  if (typeof result === 'string') {
    try {
      return JSON.parse(result)
    } catch {
      return { text: result }
    }
  }
  return result
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadHistory(): PosterHistoryItem[] {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return Array.isArray(parsed) ? parsed : []
    }
  } catch { /* ignore */ }
  return []
}

function saveHistory(items: PosterHistoryItem[]) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch { /* ignore */ }
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### '))
          return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## '))
          return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# '))
          return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* '))
          return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line))
          return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

// ---- Sample Data ----
const SAMPLE_HISTORY: PosterHistoryItem[] = [
  {
    id: 'sample-1',
    name: 'Summer Sale Announcement',
    platform: 'Instagram Post',
    imageUrl: '',
    createdAt: '2026-02-18T10:30:00Z',
    brief: {}
  },
  {
    id: 'sample-2',
    name: 'Product Launch - Headphones',
    platform: 'Facebook Ad',
    imageUrl: '',
    createdAt: '2026-02-17T14:20:00Z',
    brief: {}
  },
  {
    id: 'sample-3',
    name: 'Conference 2026 Invite',
    platform: 'LinkedIn Post',
    imageUrl: '',
    createdAt: '2026-02-15T09:00:00Z',
    brief: {}
  }
]

const SAMPLE_BRIEF: BriefFormData = {
  purpose: 'Product Launch',
  headline: 'Introducing CloudSound Pro',
  bodyCopy: 'Experience studio-quality sound with our latest wireless headphones. Featuring 40-hour battery life, active noise cancellation, and premium comfort for all-day wear.',
  ctaText: 'Pre-Order Now',
  brandColors: ['#F97316', '#EA580C', '#1E293B'],
  fontPreference: 'Modern Sans-Serif',
  platform: 'Instagram Post',
  tone: 'Bold',
  audience: 'Tech-savvy millennials and Gen Z music enthusiasts aged 18-35 who value premium audio quality and modern design aesthetics.'
}

const SAMPLE_ANALYST_BRIEF: AnalystBrief = {
  copy_hierarchy: {
    headline: 'Introducing CloudSound Pro',
    subhead: 'Studio-Quality Sound. Zero Wires.',
    body: 'Experience 40-hour battery life, active noise cancellation, and premium comfort designed for all-day wear. Engineered for those who refuse to compromise on sound.',
    cta: 'Pre-Order Now - Limited Launch Pricing'
  },
  layout_direction: 'Center-aligned hero layout with product image as focal point. Headline at top in bold weight, subhead below in lighter weight. Body copy in the lower third with CTA button anchored at bottom. Use generous whitespace and a dark-to-warm gradient background.',
  platform_specs: {
    platform: 'Instagram Post',
    dimensions: '1080 x 1080 px',
    format: 'JPEG/PNG, square aspect ratio'
  },
  audience_messaging: 'Speak to the desire for premium experiences without pretension. Use confident, aspirational language that resonates with tech-savvy millennials who see their gear as an extension of their identity.',
  color_typography: {
    primary_colors: 'Deep Orange (#F97316), Burnt Orange (#EA580C), Slate Dark (#1E293B)',
    font_suggestions: 'Headlines: Inter Bold or Montserrat Bold. Body: Inter Regular. CTA: Inter Semi-Bold with high contrast background.'
  },
  tone_alignment: 'Bold and confident with a premium feel. Direct statements over flowery language. Short, punchy sentences that build excitement without overselling.'
}

// ---- ErrorBoundary ----
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---- Glass Card wrapper ----
function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('backdrop-blur-[16px] bg-card/75 border border-white/[0.18] rounded-[0.875rem] shadow-md', className)}>
      {children}
    </div>
  )
}

// ---- Sidebar ----
function Sidebar({
  currentScreen,
  onNavigate,
  isOpen,
  onClose
}: {
  currentScreen: ScreenType
  onNavigate: (screen: ScreenType) => void
  isOpen: boolean
  onClose: () => void
}) {
  const navItems: { screen: ScreenType; label: string; icon: React.ReactNode }[] = [
    { screen: 'dashboard', label: 'Dashboard', icon: <FiHome className="w-5 h-5" /> },
    { screen: 'brief', label: 'New Poster', icon: <FiPlus className="w-5 h-5" /> },
    { screen: 'dashboard', label: 'History', icon: <FiList className="w-5 h-5" /> }
  ]

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside className={cn(
        'fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 lg:translate-x-0 lg:static lg:z-auto',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <FiImage className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold tracking-tight">PosterForge</span>
          </div>
          <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-muted">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <Separator />
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => { onNavigate(item.screen); onClose() }}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-[0.875rem] text-sm font-medium transition-colors',
                (currentScreen === item.screen || (item.label === 'History' && currentScreen === 'dashboard'))
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="text-xs text-muted-foreground">PosterForge v1.0</div>
        </div>
      </aside>
    </>
  )
}

// ---- Header ----
function Header({
  currentScreen,
  onMenuToggle,
  sampleMode,
  onSampleToggle
}: {
  currentScreen: ScreenType
  onMenuToggle: () => void
  sampleMode: boolean
  onSampleToggle: (v: boolean) => void
}) {
  const breadcrumbs: Record<ScreenType, string> = {
    dashboard: 'Dashboard',
    brief: 'New Poster',
    review: 'Creative Brief Review',
    output: 'Poster Output'
  }

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border px-4 lg:px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={onMenuToggle} className="lg:hidden p-2 rounded-md hover:bg-muted">
          <FiMenu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-foreground">PosterForge</span>
          <FiChevronRight className="w-3 h-3 text-muted-foreground" />
          <span className="text-muted-foreground">{breadcrumbs[currentScreen]}</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
        <Switch
          id="sample-toggle"
          checked={sampleMode}
          onCheckedChange={onSampleToggle}
        />
      </div>
    </header>
  )
}

// ---- Dashboard Screen ----
function DashboardScreen({
  history,
  onNewPoster,
  onDeletePoster,
  sampleMode
}: {
  history: PosterHistoryItem[]
  onNewPoster: () => void
  onDeletePoster: (id: string) => void
  sampleMode: boolean
}) {
  const displayItems = sampleMode && history.length === 0 ? SAMPLE_HISTORY : history

  return (
    <div className="space-y-8">
      {/* Hero */}
      <GlassCard className="p-8 md:p-12 bg-gradient-to-br from-primary/10 via-accent/5 to-background">
        <div className="max-w-2xl">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Create Stunning Posters in Seconds
          </h1>
          <p className="text-muted-foreground text-base mb-6 leading-relaxed">
            Transform your ideas into professional poster designs. Powered by AI analysis and image generation, PosterForge handles creative direction, copy optimization, and visual design.
          </p>
          <Button onClick={onNewPoster} size="lg" className="rounded-[0.875rem]">
            <FiPlus className="w-4 h-4 mr-2" />
            New Poster
          </Button>
        </div>
      </GlassCard>

      {/* Recent Posters */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Posters</h2>
          {displayItems.length > 0 && (
            <span className="text-sm text-muted-foreground">{displayItems.length} poster{displayItems.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {displayItems.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <FiImage className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No posters yet</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
              Create your first poster to see it here. Each completed design is saved to your history for easy access.
            </p>
            <Button onClick={onNewPoster} variant="outline" className="rounded-[0.875rem]">
              <FiPlus className="w-4 h-4 mr-2" />
              Create your first poster
            </Button>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayItems.map((item) => (
              <GlassCard key={item.id} className="overflow-hidden group hover:shadow-lg transition-all duration-300">
                <div className="aspect-video bg-muted relative flex items-center justify-center">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FiImage className="w-10 h-10 text-muted-foreground/40" />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium text-sm truncate">{item.name}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <Badge variant="secondary" className="text-[10px]">{item.platform}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <FiClock className="w-3 h-3" />
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                    </div>
                    {!sampleMode && (
                      <button
                        onClick={() => onDeletePoster(item.id)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete poster"
                      >
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Brief Form Screen ----
function BriefFormScreen({
  formData,
  setFormData,
  onAnalyze,
  loading,
  error,
  sampleMode
}: {
  formData: BriefFormData
  setFormData: React.Dispatch<React.SetStateAction<BriefFormData>>
  onAnalyze: () => void
  loading: boolean
  error: string
  sampleMode: boolean
}) {
  const displayData = sampleMode ? SAMPLE_BRIEF : formData

  const updateField = (field: keyof BriefFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const updateColor = (index: number, value: string) => {
    setFormData(prev => {
      const newColors = [...prev.brandColors]
      newColors[index] = value
      return { ...prev, brandColors: newColors }
    })
  }

  const addColor = () => {
    if (formData.brandColors.length < 3) {
      setFormData(prev => ({ ...prev, brandColors: [...prev.brandColors, '#000000'] }))
    }
  }

  const removeColor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      brandColors: prev.brandColors.filter((_, i) => i !== index)
    }))
  }

  const isValid = displayData.purpose && displayData.headline && displayData.platform && displayData.tone

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Poster Brief</h2>
        <p className="text-muted-foreground text-sm mt-1">Fill in your poster details. The AI will analyze your brief and create a structured creative direction.</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-[0.875rem] bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Text inputs */}
        <div className="space-y-5">
          <GlassCard className="p-5 space-y-5">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FiType className="w-4 h-4 text-primary" />
              Copy Details
            </h3>

            <div className="space-y-2">
              <Label htmlFor="purpose">Poster Purpose *</Label>
              <Select
                value={sampleMode ? displayData.purpose : formData.purpose}
                onValueChange={(v) => updateField('purpose', v)}
              >
                <SelectTrigger id="purpose" className="rounded-[0.875rem]">
                  <SelectValue placeholder="Select purpose" />
                </SelectTrigger>
                <SelectContent>
                  {PURPOSES.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="headline">Headline Text *</Label>
                <span className="text-xs text-muted-foreground">{(sampleMode ? displayData.headline : formData.headline).length}/80</span>
              </div>
              <Input
                id="headline"
                placeholder="Your main headline"
                value={sampleMode ? displayData.headline : formData.headline}
                onChange={(e) => updateField('headline', e.target.value)}
                maxLength={80}
                className="rounded-[0.875rem]"
              />
              {!sampleMode && !formData.headline && formData.purpose && (
                <p className="text-xs text-destructive">Headline is required</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bodyCopy">Body Copy</Label>
                <span className="text-xs text-muted-foreground">{(sampleMode ? displayData.bodyCopy : formData.bodyCopy).length}/500</span>
              </div>
              <Textarea
                id="bodyCopy"
                placeholder="Supporting text for your poster"
                value={sampleMode ? displayData.bodyCopy : formData.bodyCopy}
                onChange={(e) => updateField('bodyCopy', e.target.value)}
                maxLength={500}
                rows={4}
                className="rounded-[0.875rem] resize-none"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="ctaText">CTA Text</Label>
                <span className="text-xs text-muted-foreground">{(sampleMode ? displayData.ctaText : formData.ctaText).length}/40</span>
              </div>
              <Input
                id="ctaText"
                placeholder="Call to action (e.g., Shop Now)"
                value={sampleMode ? displayData.ctaText : formData.ctaText}
                onChange={(e) => updateField('ctaText', e.target.value)}
                maxLength={40}
                className="rounded-[0.875rem]"
              />
            </div>
          </GlassCard>
        </div>

        {/* Right Column: Brand & Selectors */}
        <div className="space-y-5">
          <GlassCard className="p-5 space-y-5">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FiDroplet className="w-4 h-4 text-primary" />
              Brand Assets
            </h3>

            <div className="space-y-2">
              <Label>Brand Colors</Label>
              <div className="space-y-2">
                {(sampleMode ? displayData.brandColors : formData.brandColors).map((color, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div
                      className="w-8 h-8 rounded-lg border border-border flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <Input
                      value={color}
                      onChange={(e) => updateColor(idx, e.target.value)}
                      placeholder="#000000"
                      className="rounded-[0.875rem] font-mono text-sm"
                      disabled={sampleMode}
                    />
                    {!sampleMode && formData.brandColors.length > 1 && (
                      <button
                        onClick={() => removeColor(idx)}
                        className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                      >
                        <FiX className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {!sampleMode && formData.brandColors.length < 3 && (
                  <Button variant="outline" size="sm" onClick={addColor} className="rounded-[0.875rem] text-xs">
                    <FiPlus className="w-3 h-3 mr-1" /> Add Color
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fontPref">Font Preference</Label>
              <Select
                value={sampleMode ? displayData.fontPreference : formData.fontPreference}
                onValueChange={(v) => updateField('fontPreference', v)}
              >
                <SelectTrigger id="fontPref" className="rounded-[0.875rem]">
                  <SelectValue placeholder="Select font style" />
                </SelectTrigger>
                <SelectContent>
                  {FONT_PREFS.map(f => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </GlassCard>

          <GlassCard className="p-5 space-y-5">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FiLayout className="w-4 h-4 text-primary" />
              Platform & Tone
            </h3>

            <div className="space-y-2">
              <Label>Platform *</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p}
                    onClick={() => updateField('platform', p)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      (sampleMode ? displayData.platform : formData.platform) === p
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tone *</Label>
              <div className="flex flex-wrap gap-2">
                {TONES.map(t => (
                  <button
                    key={t}
                    onClick={() => updateField('tone', t)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      (sampleMode ? displayData.tone : formData.tone) === t
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <FiUsers className="w-4 h-4 text-primary" />
              Target Audience
            </h3>
            <Textarea
              placeholder="Describe your target audience (demographics, interests, behavior)..."
              value={sampleMode ? displayData.audience : formData.audience}
              onChange={(e) => updateField('audience', e.target.value)}
              rows={3}
              className="rounded-[0.875rem] resize-none"
            />
          </GlassCard>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={onAnalyze}
          disabled={loading || (!sampleMode && !isValid)}
          size="lg"
          className="rounded-[0.875rem] min-w-[200px]"
        >
          {loading ? (
            <>
              <FiLoader className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <FiSend className="w-4 h-4 mr-2" />
              Analyze Requirements
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ---- Review Screen ----
function ReviewScreen({
  brief,
  setBrief,
  onGenerate,
  onBack,
  loading,
  error,
  isAnalyzing
}: {
  brief: AnalystBrief | null
  setBrief: React.Dispatch<React.SetStateAction<AnalystBrief | null>>
  onGenerate: () => void
  onBack: () => void
  loading: boolean
  error: string
  isAnalyzing: boolean
}) {
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const startEdit = (fieldPath: string, currentValue: string) => {
    setEditingField(fieldPath)
    setEditValue(currentValue)
  }

  const saveEdit = (fieldPath: string) => {
    if (!brief) return
    const updated = { ...brief }
    const parts = fieldPath.split('.')
    if (parts.length === 1) {
      (updated as any)[parts[0]] = editValue
    } else if (parts.length === 2) {
      (updated as any)[parts[0]] = { ...(updated as any)[parts[0]], [parts[1]]: editValue }
    }
    setBrief(updated)
    setEditingField(null)
    setEditValue('')
  }

  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
  }

  if (isAnalyzing) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analyzing Your Brief</h2>
          <p className="text-muted-foreground text-sm mt-1">The AI is crafting your creative direction...</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <GlassCard key={i} className="p-5 space-y-3">
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-2/3" />
            </GlassCard>
          ))}
        </div>
      </div>
    )
  }

  if (!brief) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">No brief data available. Please go back and analyze your brief.</p>
        <Button onClick={onBack} variant="outline" className="mt-4 rounded-[0.875rem]">
          <FiArrowLeft className="w-4 h-4 mr-2" />
          Back to Brief
        </Button>
      </div>
    )
  }

  function EditableField({ label, fieldPath, value, icon }: { label: string; fieldPath: string; value: string; icon: React.ReactNode }) {
    const isEditing = editingField === fieldPath
    return (
      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            {icon}
            {label}
          </h3>
          {!isEditing ? (
            <button
              onClick={() => startEdit(fieldPath, value)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              title="Edit"
            >
              <FiEdit2 className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="flex gap-1">
              <button
                onClick={() => saveEdit(fieldPath)}
                className="p-1.5 rounded-md hover:bg-primary/10 text-primary transition-colors"
                title="Save"
              >
                <FiCheck className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={cancelEdit}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
                title="Cancel"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
        {isEditing ? (
          <Textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            rows={3}
            className="rounded-[0.875rem] resize-none text-sm"
            autoFocus
          />
        ) : (
          <div className="text-sm text-muted-foreground leading-relaxed">
            {renderMarkdown(value ?? '')}
          </div>
        )}
      </GlassCard>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Creative Brief Review</h2>
          <p className="text-muted-foreground text-sm mt-1">Review and edit your AI-generated creative direction before generating the poster.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-[0.875rem] bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <FiAlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Copy Hierarchy */}
      <GlassCard className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <FiType className="w-4 h-4 text-primary" />
            Copy Hierarchy
          </h3>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Headline</Label>
              <button
                onClick={() => startEdit('copy_hierarchy.headline', brief?.copy_hierarchy?.headline ?? '')}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <FiEdit2 className="w-3 h-3" />
              </button>
            </div>
            {editingField === 'copy_hierarchy.headline' ? (
              <div className="flex gap-2">
                <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="rounded-[0.875rem]" autoFocus />
                <Button size="sm" onClick={() => saveEdit('copy_hierarchy.headline')} className="rounded-[0.875rem]"><FiCheck className="w-3 h-3" /></Button>
                <Button size="sm" variant="outline" onClick={cancelEdit} className="rounded-[0.875rem]"><FiX className="w-3 h-3" /></Button>
              </div>
            ) : (
              <p className="text-xl font-bold">{brief?.copy_hierarchy?.headline ?? ''}</p>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Subhead</Label>
              <button
                onClick={() => startEdit('copy_hierarchy.subhead', brief?.copy_hierarchy?.subhead ?? '')}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <FiEdit2 className="w-3 h-3" />
              </button>
            </div>
            {editingField === 'copy_hierarchy.subhead' ? (
              <div className="flex gap-2">
                <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="rounded-[0.875rem]" autoFocus />
                <Button size="sm" onClick={() => saveEdit('copy_hierarchy.subhead')} className="rounded-[0.875rem]"><FiCheck className="w-3 h-3" /></Button>
                <Button size="sm" variant="outline" onClick={cancelEdit} className="rounded-[0.875rem]"><FiX className="w-3 h-3" /></Button>
              </div>
            ) : (
              <p className="text-base font-medium text-foreground/80">{brief?.copy_hierarchy?.subhead ?? ''}</p>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Body</Label>
              <button
                onClick={() => startEdit('copy_hierarchy.body', brief?.copy_hierarchy?.body ?? '')}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <FiEdit2 className="w-3 h-3" />
              </button>
            </div>
            {editingField === 'copy_hierarchy.body' ? (
              <div className="space-y-2">
                <Textarea value={editValue} onChange={(e) => setEditValue(e.target.value)} rows={3} className="rounded-[0.875rem] resize-none" autoFocus />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit('copy_hierarchy.body')} className="rounded-[0.875rem]"><FiCheck className="w-3 h-3 mr-1" /> Save</Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit} className="rounded-[0.875rem]">Cancel</Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{brief?.copy_hierarchy?.body ?? ''}</p>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">CTA</Label>
              <button
                onClick={() => startEdit('copy_hierarchy.cta', brief?.copy_hierarchy?.cta ?? '')}
                className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <FiEdit2 className="w-3 h-3" />
              </button>
            </div>
            {editingField === 'copy_hierarchy.cta' ? (
              <div className="flex gap-2">
                <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="rounded-[0.875rem]" autoFocus />
                <Button size="sm" onClick={() => saveEdit('copy_hierarchy.cta')} className="rounded-[0.875rem]"><FiCheck className="w-3 h-3" /></Button>
                <Button size="sm" variant="outline" onClick={cancelEdit} className="rounded-[0.875rem]"><FiX className="w-3 h-3" /></Button>
              </div>
            ) : (
              <Badge className="text-sm">{brief?.copy_hierarchy?.cta ?? ''}</Badge>
            )}
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <EditableField
          label="Layout Direction"
          fieldPath="layout_direction"
          value={brief?.layout_direction ?? ''}
          icon={<FiLayout className="w-4 h-4 text-primary" />}
        />

        <GlassCard className="p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <FiTarget className="w-4 h-4 text-primary" />
            Platform Specs
          </h3>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{brief?.platform_specs?.platform ?? 'N/A'}</Badge>
            <Badge variant="outline">{brief?.platform_specs?.dimensions ?? 'N/A'}</Badge>
            <Badge variant="outline">{brief?.platform_specs?.format ?? 'N/A'}</Badge>
          </div>
        </GlassCard>

        <EditableField
          label="Audience Messaging"
          fieldPath="audience_messaging"
          value={brief?.audience_messaging ?? ''}
          icon={<FiUsers className="w-4 h-4 text-primary" />}
        />

        <GlassCard className="p-5 space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <FiDroplet className="w-4 h-4 text-primary" />
            Color & Typography
          </h3>
          <div className="space-y-2">
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Colors</Label>
              <p className="text-sm mt-0.5">{brief?.color_typography?.primary_colors ?? ''}</p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Fonts</Label>
              <p className="text-sm mt-0.5">{brief?.color_typography?.font_suggestions ?? ''}</p>
            </div>
          </div>
        </GlassCard>

        <EditableField
          label="Tone Alignment"
          fieldPath="tone_alignment"
          value={brief?.tone_alignment ?? ''}
          icon={<FiActivity className="w-4 h-4 text-primary" />}
        />
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button onClick={onBack} variant="ghost" className="rounded-[0.875rem]">
          <FiArrowLeft className="w-4 h-4 mr-2" />
          Back to Brief
        </Button>
        <Button onClick={onGenerate} disabled={loading} size="lg" className="rounded-[0.875rem] min-w-[200px]">
          {loading ? (
            <>
              <FiLoader className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FiImage className="w-4 h-4 mr-2" />
              Generate Poster
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

// ---- Output Screen ----
function OutputScreen({
  designResult,
  imageUrl,
  onRegenerate,
  onBackToBrief,
  onGoHome,
  loading,
  error
}: {
  designResult: DesignerResult | null
  imageUrl: string
  onRegenerate: () => void
  onBackToBrief: () => void
  onGoHome: () => void
  loading: boolean
  error: string
}) {
  const handleDownload = async () => {
    if (!imageUrl) return
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `posterforge-${Date.now()}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      window.open(imageUrl, '_blank')
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <FiLoader className="w-8 h-8 text-primary animate-spin" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Crafting your poster...</h2>
          <p className="text-muted-foreground text-sm max-w-md">
            The AI is generating your custom poster design. This may take a minute.
          </p>
        </div>
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="w-full aspect-square rounded-[0.875rem]" />
          <div className="flex gap-3 justify-center">
            <Skeleton className="h-10 w-28 rounded-[0.875rem]" />
            <Skeleton className="h-10 w-28 rounded-[0.875rem]" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
          <FiAlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Generation Failed</h2>
          <p className="text-muted-foreground text-sm max-w-md">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={onRegenerate} className="rounded-[0.875rem]">
            <FiRefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
          <Button onClick={onBackToBrief} variant="outline" className="rounded-[0.875rem]">
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Back to Brief
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Success banner */}
      {imageUrl && (
        <div className="flex items-center gap-2 p-3 rounded-[0.875rem] bg-green-500/10 border border-green-500/20 text-green-700 text-sm">
          <FiCheckCircle className="w-4 h-4 flex-shrink-0" />
          Poster generated successfully!
        </div>
      )}

      <div className="flex flex-col items-center space-y-6">
        {/* Poster Preview */}
        {imageUrl ? (
          <GlassCard className="overflow-hidden max-w-2xl w-full">
            <img
              src={imageUrl}
              alt="Generated poster"
              className="w-full h-auto"
            />
          </GlassCard>
        ) : (
          <GlassCard className="max-w-2xl w-full aspect-square flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <FiImage className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No image was generated. Try regenerating.</p>
            </div>
          </GlassCard>
        )}

        {/* Action bar */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {imageUrl && (
            <Button onClick={handleDownload} className="rounded-[0.875rem]">
              <FiDownload className="w-4 h-4 mr-2" />
              Download
            </Button>
          )}
          <Button onClick={onRegenerate} variant="secondary" className="rounded-[0.875rem]">
            <FiRefreshCw className="w-4 h-4 mr-2" />
            Regenerate
          </Button>
          <Button onClick={onBackToBrief} variant="ghost" className="rounded-[0.875rem]">
            <FiArrowLeft className="w-4 h-4 mr-2" />
            Back to Brief
          </Button>
          <Button onClick={onGoHome} variant="ghost" className="rounded-[0.875rem]">
            <FiHome className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </div>

        {/* Design Details */}
        {designResult && (
          <div className="max-w-2xl w-full grid grid-cols-1 md:grid-cols-2 gap-4">
            {(designResult?.design_description ?? '') && (
              <GlassCard className="p-5 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <FiImage className="w-4 h-4 text-primary" />
                  Design Description
                </h3>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {renderMarkdown(designResult?.design_description ?? '')}
                </div>
              </GlassCard>
            )}
            {(designResult?.design_notes ?? '') && (
              <GlassCard className="p-5 space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <FiEdit2 className="w-4 h-4 text-primary" />
                  Design Notes
                </h3>
                <div className="text-sm text-muted-foreground leading-relaxed">
                  {renderMarkdown(designResult?.design_notes ?? '')}
                </div>
              </GlassCard>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ---- Agent Status ----
function AgentStatus({ activeAgentId }: { activeAgentId: string | null }) {
  const agents = [
    {
      id: REQUIREMENTS_AGENT_ID,
      name: 'Requirements Analyst',
      purpose: 'Analyzes poster brief, generates creative direction'
    },
    {
      id: POSTER_DESIGNER_AGENT_ID,
      name: 'Poster Designer',
      purpose: 'Generates professional poster images from briefs'
    }
  ]

  return (
    <GlassCard className="p-4 mt-6">
      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">AI Agents</h4>
      <div className="space-y-2">
        {agents.map(agent => (
          <div key={agent.id} className="flex items-center gap-2.5">
            <div className={cn(
              'w-2 h-2 rounded-full flex-shrink-0',
              activeAgentId === agent.id ? 'bg-primary animate-pulse' : 'bg-muted-foreground/30'
            )} />
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{agent.name}</p>
              <p className="text-[10px] text-muted-foreground truncate">{agent.purpose}</p>
            </div>
            {activeAgentId === agent.id && (
              <Badge variant="secondary" className="text-[10px] ml-auto flex-shrink-0">Active</Badge>
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

// ---- Main Page ----
export default function Page() {
  const [screen, setScreen] = useState<ScreenType>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sampleMode, setSampleMode] = useState(false)
  const [history, setHistory] = useState<PosterHistoryItem[]>([])
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Brief form state
  const [formData, setFormData] = useState<BriefFormData>({
    purpose: '',
    headline: '',
    bodyCopy: '',
    ctaText: '',
    brandColors: ['#F97316'],
    fontPreference: '',
    platform: '',
    tone: '',
    audience: ''
  })

  // Analyst brief
  const [analystBrief, setAnalystBrief] = useState<AnalystBrief | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')

  // Designer output
  const [designResult, setDesignResult] = useState<DesignerResult | null>(null)
  const [posterImageUrl, setPosterImageUrl] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationError, setGenerationError] = useState('')

  // Load history from localStorage on mount
  useEffect(() => {
    setHistory(loadHistory())
  }, [])

  const navigateTo = useCallback((s: ScreenType) => {
    setScreen(s)
    window.scrollTo(0, 0)
  }, [])

  const handleNewPoster = useCallback(() => {
    setFormData({
      purpose: '',
      headline: '',
      bodyCopy: '',
      ctaText: '',
      brandColors: ['#F97316'],
      fontPreference: '',
      platform: '',
      tone: '',
      audience: ''
    })
    setAnalystBrief(null)
    setDesignResult(null)
    setPosterImageUrl('')
    setAnalysisError('')
    setGenerationError('')
    navigateTo('brief')
  }, [navigateTo])

  const handleDeletePoster = useCallback((id: string) => {
    setHistory(prev => {
      const updated = prev.filter(item => item.id !== id)
      saveHistory(updated)
      return updated
    })
  }, [])

  const handleAnalyze = useCallback(async () => {
    const source = sampleMode ? SAMPLE_BRIEF : formData
    setIsAnalyzing(true)
    setAnalysisError('')
    setActiveAgentId(REQUIREMENTS_AGENT_ID)
    navigateTo('review')

    try {
      const message = `Poster Brief:
- Purpose: ${source.purpose}
- Platform: ${source.platform}
- Headline: ${source.headline}
- Body Copy: ${source.bodyCopy}
- CTA Text: ${source.ctaText}
- Brand Colors: ${source.brandColors.join(', ')}
- Font Preference: ${source.fontPreference}
- Target Audience: ${source.audience}
- Tone/Style: ${source.tone}`

      const result = await callAIAgent(message, REQUIREMENTS_AGENT_ID)

      if (result.success) {
        const rawResult = result?.response?.result
        const data = safeParseResult(rawResult)

        const briefData: AnalystBrief = {
          copy_hierarchy: {
            headline: data?.copy_hierarchy?.headline ?? source.headline ?? '',
            subhead: data?.copy_hierarchy?.subhead ?? '',
            body: data?.copy_hierarchy?.body ?? source.bodyCopy ?? '',
            cta: data?.copy_hierarchy?.cta ?? source.ctaText ?? ''
          },
          layout_direction: data?.layout_direction ?? '',
          platform_specs: {
            platform: data?.platform_specs?.platform ?? source.platform ?? '',
            dimensions: data?.platform_specs?.dimensions ?? '',
            format: data?.platform_specs?.format ?? ''
          },
          audience_messaging: data?.audience_messaging ?? '',
          color_typography: {
            primary_colors: data?.color_typography?.primary_colors ?? source.brandColors.join(', '),
            font_suggestions: data?.color_typography?.font_suggestions ?? source.fontPreference ?? ''
          },
          tone_alignment: data?.tone_alignment ?? source.tone ?? ''
        }
        setAnalystBrief(briefData)
      } else {
        setAnalysisError(result?.error ?? 'Analysis failed. Please try again.')
        if (sampleMode) {
          setAnalystBrief(SAMPLE_ANALYST_BRIEF)
        }
      }
    } catch (err) {
      setAnalysisError('An unexpected error occurred. Please try again.')
      if (sampleMode) {
        setAnalystBrief(SAMPLE_ANALYST_BRIEF)
      }
    } finally {
      setIsAnalyzing(false)
      setActiveAgentId(null)
    }
  }, [formData, sampleMode, navigateTo])

  const handleGenerate = useCallback(async () => {
    const briefToUse = analystBrief ?? (sampleMode ? SAMPLE_ANALYST_BRIEF : null)
    if (!briefToUse) return

    setIsGenerating(true)
    setGenerationError('')
    setPosterImageUrl('')
    setDesignResult(null)
    setActiveAgentId(POSTER_DESIGNER_AGENT_ID)
    navigateTo('output')

    try {
      const message = `Generate a professional poster based on this creative brief:
${JSON.stringify(briefToUse, null, 2)}`

      const result = await callAIAgent(message, POSTER_DESIGNER_AGENT_ID)

      if (result.success) {
        const rawResult = result?.response?.result
        const data = safeParseResult(rawResult)

        setDesignResult({
          design_description: data?.design_description ?? '',
          design_notes: data?.design_notes ?? ''
        })

        const files = Array.isArray(result?.module_outputs?.artifact_files)
          ? result.module_outputs!.artifact_files
          : []
        const imgUrl = files?.[0]?.file_url ?? ''
        setPosterImageUrl(imgUrl)

        // Save to history
        if (imgUrl) {
          const source = sampleMode ? SAMPLE_BRIEF : formData
          const newItem: PosterHistoryItem = {
            id: generateId(),
            name: briefToUse.copy_hierarchy?.headline ?? source.headline ?? 'Untitled Poster',
            platform: briefToUse.platform_specs?.platform ?? source.platform ?? 'Unknown',
            imageUrl: imgUrl,
            createdAt: new Date().toISOString(),
            brief: briefToUse
          }
          setHistory(prev => {
            const updated = [newItem, ...prev]
            saveHistory(updated)
            return updated
          })
        }
      } else {
        setGenerationError(result?.error ?? 'Poster generation failed. Please try again.')
      }
    } catch (err) {
      setGenerationError('An unexpected error occurred. Please try again.')
    } finally {
      setIsGenerating(false)
      setActiveAgentId(null)
    }
  }, [analystBrief, sampleMode, formData, navigateTo])

  const handleRegenerate = useCallback(() => {
    handleGenerate()
  }, [handleGenerate])

  const handleSampleToggle = useCallback((v: boolean) => {
    setSampleMode(v)
    if (v && screen === 'review' && !analystBrief) {
      setAnalystBrief(SAMPLE_ANALYST_BRIEF)
    }
  }, [screen, analystBrief])

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background text-foreground flex">
        {/* Sidebar */}
        <Sidebar
          currentScreen={screen}
          onNavigate={navigateTo}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Main */}
        <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <Header
            currentScreen={screen}
            onMenuToggle={() => setSidebarOpen(prev => !prev)}
            sampleMode={sampleMode}
            onSampleToggle={handleSampleToggle}
          />

          <ScrollArea className="flex-1">
            <main className="p-4 lg:p-6 max-w-5xl mx-auto w-full pb-8">
              {screen === 'dashboard' && (
                <DashboardScreen
                  history={history}
                  onNewPoster={handleNewPoster}
                  onDeletePoster={handleDeletePoster}
                  sampleMode={sampleMode}
                />
              )}

              {screen === 'brief' && (
                <BriefFormScreen
                  formData={formData}
                  setFormData={setFormData}
                  onAnalyze={handleAnalyze}
                  loading={isAnalyzing}
                  error={analysisError}
                  sampleMode={sampleMode}
                />
              )}

              {screen === 'review' && (
                <ReviewScreen
                  brief={sampleMode && !analystBrief ? SAMPLE_ANALYST_BRIEF : analystBrief}
                  setBrief={setAnalystBrief}
                  onGenerate={handleGenerate}
                  onBack={() => navigateTo('brief')}
                  loading={isGenerating}
                  error={analysisError}
                  isAnalyzing={isAnalyzing}
                />
              )}

              {screen === 'output' && (
                <OutputScreen
                  designResult={designResult}
                  imageUrl={posterImageUrl}
                  onRegenerate={handleRegenerate}
                  onBackToBrief={() => navigateTo('review')}
                  onGoHome={() => navigateTo('dashboard')}
                  loading={isGenerating}
                  error={generationError}
                />
              )}

              {/* Agent Status */}
              <AgentStatus activeAgentId={activeAgentId} />
            </main>
          </ScrollArea>
        </div>
      </div>
    </ErrorBoundary>
  )
}
