import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { kindLabels, statusOptions, type Kind, type MediaItem } from './types'
import { deleteItem, getItems, replaceItems, saveItem } from './storage'
import { searchImages, type ImageResult } from './imageSearch'

type View = 'all' | Kind | 'favorites'
type Toast = { message: string; tone: 'success' | 'error' }

const iconPaths: Record<string, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
  film: <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M7 3v18M17 3v18M3 8h4m-4 8h4m10-8h4m-4 8h4" /></>,
  tv: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m8 2 4 3 4-3M8 22h8m-4-3v3" /></>,
  game: <><path d="M6 11h12a4 4 0 0 1 3.8 5l-.5 1.7a2 2 0 0 1-3.1 1L15 16H9l-3.2 2.7a2 2 0 0 1-3.1-1L2.2 16A4 4 0 0 1 6 11Z" /><path d="M7 11 8 7h8l1 4M7 15h.01M10 15h.01M16 14v2m-1-1h2" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5m-5 5V3" /></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5m5-5v12" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.4.8l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.4-.8l-1.7.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-1.7l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.4-.8l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.4.8l1.7-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 1.6Z" transform="translate(-1 -1) scale(1.08)" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z" />,
  edit: <><path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" /></>,
  trash: <><path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6" /></>,
  arrow: <><path d="M5 12h14m-7-7 7 7-7 7" /></>,
  back: <><path d="M19 12H5m7 7-7-7 7-7" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  image: <><rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" /></>,
  sparkle: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Zm7 12 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15ZM5 3l.7 1.3L7 5l-1.3.7L5 7l-.7-1.3L3 5l1.3-.7L5 3Z" /></>,
  filter: <><path d="M4 7h16M7 12h10m-7 5h4" /><circle cx="8" cy="7" r="1" /><circle cx="15" cy="12" r="1" /></>,
}

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>
}

function Cover({ src, kind, large = false }: { src?: string; kind: Kind; large?: boolean }) {
  const [failed, setFailed] = useState(false)
  if (src && !failed) return <img className={`cover-image${large ? ' cover-large' : ''}`} src={src} alt="" onError={() => setFailed(true)} />
  return <div className={`cover-placeholder ${kind}${large ? ' cover-large' : ''}`}><Icon name={kind === 'movie' ? 'film' : kind === 'series' ? 'tv' : 'game'} size={large ? 34 : 27} /><span>HAZUNI</span></div>
}

function ImageResultOption({ result, selected, onSelect }: { result: ImageResult; selected: boolean; onSelect: (url: string) => void }) {
  const [image, setImage] = useState(result.image)
  const [fallbackTried, setFallbackTried] = useState(false)

  useEffect(() => {
    setImage(result.image)
    setFallbackTried(false)
  }, [result])

  const handleImageError = () => {
    if (result.fallbackImage && !fallbackTried) {
      setFallbackTried(true)
      setImage(result.fallbackImage)
    } else {
      setImage('')
    }
  }

  return (
    <button type="button" className={`image-result${selected ? ' selected' : ''}`} onClick={() => image && onSelect(image)} title={`${result.title} · ${result.source}`} disabled={!image}>
      {image ? <img src={image} alt={result.title} onError={handleImageError} /> : <span className="image-result-unavailable">Prévia indisponível</span>}
      <span>{result.source}</span>
    </button>
  )
}

function itemLabel(item: MediaItem) {
  return item.kind === 'game' ? item.platform : item.year
}

function MediaCard({ item, onOpen, onFavorite }: { item: MediaItem; onOpen: () => void; onFavorite: () => void }) {
  return (
    <article className="media-card">
      <button className="card-cover-button" onClick={onOpen} aria-label={`Ver detalhes de ${item.title}`}>
        <Cover src={item.cover} kind={item.kind} />
        <span className="cover-kind">{kindLabels[item.kind].slice(0, -1)}</span>
        <span className="card-rating"><Icon name="star" size={13} /> {item.rating ? Number(item.rating).toFixed(1) : '—'}</span>
        <span className="cover-open"><Icon name="arrow" size={18} /></span>
      </button>
      <div className="card-content">
        <div className="card-title-row">
          <button className="card-title" onClick={onOpen}>{item.title}</button>
          <button className={`favorite-button${item.favorite ? ' active' : ''}`} onClick={onFavorite} aria-label={item.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><Icon name="heart" size={17} /></button>
        </div>
        <div className="card-meta"><span>{itemLabel(item) || item.genre || 'Sem detalhes'}</span><span className="status-dot" /> <span>{item.status}</span></div>
      </div>
    </article>
  )
}

function Modal({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className={`modal${wide ? ' modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header"><div><span className="eyebrow">HAZUNI LIBRARY</span><h2>{title}</h2></div><button className="icon-button" onClick={onClose} aria-label="Fechar"><Icon name="close" /></button></header>
        {children}
      </section>
    </div>
  )
}

function MediaForm({ kind, item, onSave, onClose }: { kind: Kind; item?: MediaItem; onSave: (item: MediaItem) => Promise<void>; onClose: () => void }) {
  const [selectedKind, setSelectedKind] = useState<Kind>(() => item?.kind ?? kind)
  const [draft, setDraft] = useState<Partial<MediaItem>>(() => item ? { ...item } : { kind, status: statusOptions[kind][0], favorite: false, rating: '' })
  const [query, setQuery] = useState(() => item?.title ?? '')
  const [results, setResults] = useState<ImageResult[]>([])
  const [searching, setSearching] = useState(false)
  const [saving, setSaving] = useState(false)
  const [imageError, setImageError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const setField = (field: keyof MediaItem, value: string | boolean) => setDraft((current) => ({ ...current, [field]: value }))
  const changeKind = (nextKind: Kind) => {
    setSelectedKind(nextKind)
    setDraft((current) => ({
      ...current,
      kind: nextKind,
      status: statusOptions[nextKind].includes(current.status ?? '') ? current.status : statusOptions[nextKind][0],
      director: nextKind === 'movie' ? current.director : '',
      watchedAt: nextKind === 'movie' ? current.watchedAt : '',
      seasons: nextKind === 'series' ? current.seasons : '',
      episodes: nextKind === 'series' ? current.episodes : '',
      currentSeason: nextKind === 'series' ? current.currentSeason : '',
      currentEpisode: nextKind === 'series' ? current.currentEpisode : '',
    }))
    setResults([])
    setImageError('')
  }
  const handleSearch = async () => {
    const searchTerm = query.trim() || String(draft.title ?? '').trim()
    if (!searchTerm) { setImageError('Digite o título do filme ou da série para pesquisar capas.'); return }
    setImageError('')
    setResults([])
    setSearching(true)
    try {
      const found = await searchImages(searchTerm, selectedKind, localStorage.getItem('hazuni-tmdb-key') ?? '')
      setResults(found)
      if (found.length === 0) setImageError('Nenhuma capa encontrada. Tente outro título ou use uma URL ou imagem do seu dispositivo.')
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Erro ao pesquisar imagens.')
    } finally { setSearching(false) }
  }
  const searchGoogleImages = () => {
    const searchTerm = query.trim() || String(draft.title ?? '').trim()
    if (!searchTerm) { setImageError('Digite o título para pesquisar no Google Imagens.'); return }
    const mediaTerm = selectedKind === 'series' ? 'dorama série pôster' : selectedKind === 'movie' ? 'filme pôster' : 'jogo capa'
    const googleUrl = new URL('https://www.google.com/search')
    googleUrl.searchParams.set('tbm', 'isch')
    googleUrl.searchParams.set('q', `${searchTerm} ${mediaTerm}`)
    window.open(googleUrl.toString(), '_blank', 'noopener,noreferrer')
  }
  const handleFile = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setImageError('Selecione um arquivo de imagem válido.'); return }
    if (file.size > 5 * 1024 * 1024) { setImageError('A imagem deve ter no máximo 5 MB.'); return }
    const reader = new FileReader()
    reader.onload = () => { setField('cover', String(reader.result)); setImageError('') }
    reader.onerror = () => setImageError('Não foi possível ler a imagem selecionada.')
    reader.readAsDataURL(file)
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaving(true)
    try {
      await onSave({
        id: item?.id ?? crypto.randomUUID(),
        kind: selectedKind,
        title: String(draft.title ?? '').trim(),
        year: String(draft.year ?? ''),
        genre: String(draft.genre ?? '').trim(),
        synopsis: String(draft.synopsis ?? '').trim(),
        cover: String(draft.cover ?? ''),
        rating: String(draft.rating ?? ''),
        status: String(draft.status ?? statusOptions[selectedKind][0]),
        notes: String(draft.notes ?? '').trim(),
        createdAt: item?.createdAt ?? new Date().toISOString(),
        favorite: Boolean(draft.favorite),
        director: String(draft.director ?? ''),
        watchedAt: String(draft.watchedAt ?? ''),
        seasons: String(draft.seasons ?? ''),
        episodes: String(draft.episodes ?? ''),
        currentSeason: String(draft.currentSeason ?? ''),
        currentEpisode: String(draft.currentEpisode ?? ''),
        platform: String(draft.platform ?? ''),
        developer: String(draft.developer ?? ''),
        playedAt: String(draft.playedAt ?? ''),
      })
      onClose()
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Não foi possível salvar o cadastro.')
    } finally { setSaving(false) }
  }
  const title = selectedKind === 'game' ? 'Nome do jogo' : 'Título'

  return (
    <Modal title={item ? 'Editar cadastro' : `Adicionar ${kindLabels[selectedKind].slice(0, -1).toLowerCase()}`} onClose={onClose} wide>
      <form className="media-form" onSubmit={submit}>
        <div className="form-grid">
          {kind !== 'game' && <div className="category-picker field-span" role="group" aria-label="Categoria do título"><span className="category-picker-label">O que você quer cadastrar?</span><div className="category-picker-options"><button type="button" className={`category-option${selectedKind === 'movie' ? ' active' : ''}`} aria-pressed={selectedKind === 'movie'} onClick={() => changeKind('movie')}><Icon name="film" size={17} /> Filme</button><button type="button" className={`category-option${selectedKind === 'series' ? ' active' : ''}`} aria-pressed={selectedKind === 'series'} onClick={() => changeKind('series')}><Icon name="tv" size={17} /> Série</button></div></div>}
          <label className="field field-span"><span>{title} <i>*</i></span><input required autoFocus value={draft.title ?? ''} onChange={(event) => { setField('title', event.target.value); setQuery((current) => !current || current === String(draft.title ?? '') ? event.target.value : current) }} placeholder={selectedKind === 'game' ? 'Ex.: The Last of Us Part II' : selectedKind === 'series' ? 'Ex.: The Rookie' : 'Ex.: Interestelar'} /></label>
          <section className="image-picker field-span">
            <div className="section-heading"><span className="section-icon"><Icon name="image" size={17} /></span><div><strong>Capa ou pôster</strong><small>Escolha uma imagem da internet ou do seu dispositivo</small></div></div>
            <div className="image-search-row"><div className="search-input compact"><Icon name="search" size={17} /><input aria-label="Título para buscar capas" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void handleSearch() } }} placeholder={`Pesquisar capas de ${draft.title || 'um título'}...`} /></div><button type="button" className="button button-secondary" disabled={searching} onClick={() => void handleSearch()}>{searching ? 'Buscando...' : 'Buscar capas'}</button><button type="button" className="button button-secondary google-image-button" onClick={searchGoogleImages}>Google Imagens</button></div>
            <div className="image-actions"><label className="url-field"><span>URL da imagem</span><input type="url" value={draft.cover?.startsWith('data:') ? '' : draft.cover ?? ''} onChange={(event) => setField('cover', event.target.value)} placeholder="https://..." /></label><input ref={fileRef} hidden type="file" accept="image/*" onChange={(event) => handleFile(event.target.files?.[0])} /><button type="button" className="text-button" onClick={() => fileRef.current?.click()}><Icon name="upload" size={16} /> Enviar imagem</button></div>
            {imageError && <p className="inline-message">{imageError}</p>}
            {results.some((result) => result.related) && <p className="inline-message">Não encontramos capas com correspondência exata. Estas são imagens relacionadas; confira antes de selecionar.</p>}
            {results.length > 0 && <div className="image-results">{results.map((result) => <ImageResultOption key={result.id} result={result} selected={draft.cover === result.image || draft.cover === result.fallbackImage} onSelect={(image) => setField('cover', image)} />)}</div>}
            {!results.length && draft.cover && <div className="selected-cover-preview"><Cover src={draft.cover} kind={kind} /><span>Pré-visualização da capa selecionada</span><button type="button" className="text-button" onClick={() => setField('cover', '')}>Remover</button></div>}
            <small className="provider-note">Google Imagens abre em outra aba. Para usar uma imagem de lá, copie o endereço e cole em URL da imagem. {localStorage.getItem('hazuni-tmdb-key') && selectedKind !== 'game' ? 'A busca também consulta TMDB, Wikipedia, TVmaze, Openverse e Wikimedia Commons.' : 'A busca automática consulta Wikipedia, TVmaze, Openverse e Wikimedia Commons.'}</small>
          </section>
          <label className="field"><span>Ano de lançamento</span><input type="number" min="1888" max="2100" value={draft.year ?? ''} onChange={(event) => setField('year', event.target.value)} placeholder="2024" /></label>
          <label className="field"><span>Gênero</span><input value={draft.genre ?? ''} onChange={(event) => setField('genre', event.target.value)} placeholder="Ação, drama..." /></label>
          {selectedKind === 'movie' && <label className="field"><span>Diretor</span><input value={draft.director ?? ''} onChange={(event) => setField('director', event.target.value)} placeholder="Nome do diretor" /></label>}
          {selectedKind === 'game' && <>
            <label className="field"><span>Plataforma</span><select value={draft.platform ?? ''} onChange={(event) => setField('platform', event.target.value)}><option value="">Selecione</option>{['PS3', 'PS4', 'PS5', 'PC', 'Xbox 360', 'Xbox One', 'Xbox Series X|S', 'Nintendo Switch', 'Nintendo 3DS', 'Outra'].map((platform) => <option key={platform}>{platform}</option>)}</select></label>
            <label className="field"><span>Desenvolvedora</span><input value={draft.developer ?? ''} onChange={(event) => setField('developer', event.target.value)} placeholder="Estúdio" /></label>
          </>}
          {selectedKind === 'series' && <>
            <label className="field"><span>Temporadas</span><input type="number" min="0" value={draft.seasons ?? ''} onChange={(event) => setField('seasons', event.target.value)} placeholder="0" /></label>
            <label className="field"><span>Episódios</span><input type="number" min="0" value={draft.episodes ?? ''} onChange={(event) => setField('episodes', event.target.value)} placeholder="0" /></label>
            <label className="field"><span>Temporada atual</span><input type="number" min="0" value={draft.currentSeason ?? ''} onChange={(event) => setField('currentSeason', event.target.value)} placeholder="0" /></label>
            <label className="field"><span>Episódio atual</span><input type="number" min="0" value={draft.currentEpisode ?? ''} onChange={(event) => setField('currentEpisode', event.target.value)} placeholder="0" /></label>
          </>}
          <label className="field"><span>Nota pessoal (0–10)</span><input type="number" min="0" max="10" step="0.1" value={draft.rating ?? ''} onChange={(event) => setField('rating', event.target.value)} placeholder="—" /></label>
          <label className="field"><span>Status</span><select value={draft.status ?? statusOptions[selectedKind][0]} onChange={(event) => setField('status', event.target.value)}>{statusOptions[selectedKind].map((status) => <option key={status}>{status}</option>)}</select></label>
          {selectedKind !== 'series' && <label className="field"><span>{selectedKind === 'game' ? 'Data em que joguei' : 'Data em que assisti'}</span><input type="date" value={selectedKind === 'game' ? draft.playedAt ?? '' : draft.watchedAt ?? ''} onChange={(event) => setField(selectedKind === 'game' ? 'playedAt' : 'watchedAt', event.target.value)} /></label>}
          <label className="field field-span"><span>Sinopse</span><textarea rows={3} value={draft.synopsis ?? ''} onChange={(event) => setField('synopsis', event.target.value)} placeholder="Do que se trata?" /></label>
          <label className="field field-span"><span>Minhas observações</span><textarea rows={3} value={draft.notes ?? ''} onChange={(event) => setField('notes', event.target.value)} placeholder="O que você achou? Anote algo para lembrar..." /></label>
        </div>
        {submitError && <p className="inline-message form-save-error" role="alert">{submitError}</p>}
        <footer className="form-footer"><label className="favorite-check"><input type="checkbox" checked={Boolean(draft.favorite)} onChange={(event) => setField('favorite', event.target.checked)} /><span><Icon name="heart" size={16} /> Favoritar</span></label><div className="form-buttons"><button type="button" className="button button-quiet" onClick={onClose}>Cancelar</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Salvando...' : item ? 'Salvar alterações' : 'Adicionar à biblioteca'}</button></div></footer>
      </form>
    </Modal>
  )
}

function Details({ item, onClose, onEdit, onDelete, onFavorite }: { item: MediaItem; onClose: () => void; onEdit: () => void; onDelete: () => void; onFavorite: () => void }) {
  const details = [
    ['Ano', item.year], ['Gênero', item.genre], ['Diretor', item.director],
    ['Plataforma', item.platform], ['Desenvolvedora', item.developer],
    ['Temporadas', item.seasons], ['Episódios', item.episodes],
    ['Progresso', item.currentSeason ? `T${item.currentSeason} · E${item.currentEpisode || '—'}` : ''],
    ['Data assistido', item.watchedAt], ['Data jogado', item.playedAt],
  ].filter((entry) => entry[1])
  return <Modal title={item.title} onClose={onClose} wide>
    <div className="details-layout"><div className="details-cover"><Cover src={item.cover} kind={item.kind} large /></div><div className="details-body">
      <div className="details-tags"><span className="pill">{kindLabels[item.kind]}</span><span className="pill">{item.status}</span>{item.rating && <span className="pill rating-pill"><Icon name="star" size={14} /> {Number(item.rating).toFixed(1)}</span>}</div>
      <div className="details-grid">{details.map(([label, value]) => <div key={label} className="detail-pair"><span>{label}</span><strong>{value}</strong></div>)}</div>
      {item.synopsis && <section className="detail-copy"><h3>Sinopse</h3><p>{item.synopsis}</p></section>}
      {item.notes && <section className="detail-copy"><h3>Minhas observações</h3><p>{item.notes}</p></section>}
      <footer className="details-actions"><button className={`button ${item.favorite ? 'button-favorited' : 'button-secondary'}`} onClick={onFavorite}><Icon name="heart" size={17} /> {item.favorite ? 'Favoritado' : 'Favoritar'}</button><button className="button button-secondary" onClick={onEdit}><Icon name="edit" size={16} /> Editar</button><button className="button button-danger" onClick={onDelete}><Icon name="trash" size={16} /> Excluir</button></footer>
    </div></div>
  </Modal>
}

function App() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [view, setView] = useState<View>('all')
  const [query, setQuery] = useState('')
  const [genreFilter, setGenreFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')
  const [sort, setSort] = useState('newest')
  const [formKind, setFormKind] = useState<Kind | null>(null)
  const [editing, setEditing] = useState<MediaItem | undefined>()
  const [selected, setSelected] = useState<MediaItem | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [tmdbKey, setTmdbKey] = useState(() => localStorage.getItem('hazuni-tmdb-key') ?? '')
  const [toast, setToast] = useState<Toast | null>(null)
  const [ready, setReady] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    getItems().then((stored) => { setItems(stored); setReady(true) }).catch((error: unknown) => {
      setToast({ message: error instanceof Error ? error.message : 'Falha ao carregar biblioteca.', tone: 'error' })
      setReady(true)
    })
  }, [])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3600)
    return () => window.clearTimeout(timer)
  }, [toast])

  const genres = useMemo(() => [...new Set(items.map((item) => item.genre).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [items])
  const filtered = useMemo(() => {
    const lowered = query.trim().toLocaleLowerCase('pt-BR')
    return items.filter((item) => {
      const matchesView = view === 'all' || view === 'favorites' ? view === 'all' || item.favorite : item.kind === view
      return matchesView
        && (!lowered || `${item.title} ${item.genre} ${item.synopsis} ${item.notes}`.toLocaleLowerCase('pt-BR').includes(lowered))
        && (!genreFilter || item.genre === genreFilter)
        && (!statusFilter || item.status === statusFilter)
        && (!yearFilter || item.year === yearFilter)
    }).sort((a, b) => sort === 'title' ? a.title.localeCompare(b.title, 'pt-BR') : sort === 'oldest' ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt))
  }, [items, view, query, genreFilter, statusFilter, yearFilter, sort])

  const notify = (message: string, tone: Toast['tone'] = 'success') => setToast({ message, tone })
  const save = async (item: MediaItem) => {
    await saveItem(item)
    setItems((current) => [item, ...current.filter((entry) => entry.id !== item.id)])
    setView(item.kind)
    notify(editing ? 'Cadastro atualizado com sucesso.' : 'Adicionado à sua biblioteca.')
    setFormKind(null)
    setEditing(undefined)
  }
  const remove = async (item: MediaItem) => {
    if (!window.confirm(`Excluir “${item.title}” da sua biblioteca? Esta ação não pode ser desfeita.`)) return
    try {
      await deleteItem(item.id)
      setItems((current) => current.filter((entry) => entry.id !== item.id))
      setSelected(null)
      notify('Cadastro excluído.')
    } catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível excluir.', 'error') }
  }
  const toggleFavorite = async (item: MediaItem) => {
    const updated = { ...item, favorite: !item.favorite }
    try {
      await saveItem(updated)
      setItems((current) => current.map((entry) => entry.id === item.id ? updated : entry))
      setSelected((current) => current?.id === item.id ? updated : current)
    } catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível atualizar favorito.', 'error') }
  }
  const exportBackup = () => {
    const blob = new Blob([JSON.stringify({ app: 'HAZUNI STREAMING', version: 1, exportedAt: new Date().toISOString(), items }, null, 2)], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `hazuni-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(link.href), 1000)
    notify('Backup exportado.')
  }
  const importBackup = async (file?: File) => {
    if (!file) return
    try {
      const parsed: unknown = JSON.parse(await file.text())
      const imported = Array.isArray(parsed) ? parsed : (parsed as { items?: unknown })?.items
      if (!Array.isArray(imported) || !imported.every((entry) => entry && typeof entry === 'object' && typeof entry.id === 'string' && typeof entry.title === 'string' && ['movie', 'series', 'game'].includes(entry.kind))) {
        throw new Error('O arquivo não contém um backup HAZUNI válido.')
      }
      if (!window.confirm(`Restaurar ${imported.length} título(s)? Isso substituirá os dados atuais neste navegador.`)) return
      await replaceItems(imported as MediaItem[])
      setItems(imported as MediaItem[])
      notify('Backup restaurado com sucesso.')
    } catch (error) { notify(error instanceof Error ? error.message : 'Não foi possível importar o backup.', 'error') }
    finally { if (importRef.current) importRef.current.value = '' }
  }
  const openAdd = (kind: Kind) => { setEditing(undefined); setFormKind(kind) }
  const openEdit = (item: MediaItem) => { setSelected(null); setEditing(item); setFormKind(item.kind) }
  const titleText = view === 'all' ? 'Sua biblioteca' : view === 'favorites' ? 'Seus favoritos' : kindLabels[view]
  const descriptions: Record<View, string> = { all: 'Seu universo de entretenimento, em um só lugar.', favorites: 'Os títulos que você guardou com carinho.', movie: 'Uma coleção feita para a sua próxima sessão.', series: 'Acompanhe suas histórias, episódio por episódio.', game: 'Suas jornadas, conquistas e próximos desafios.' }
  const categoryCounts: Record<Kind, number> = { movie: items.filter((item) => item.kind === 'movie').length, series: items.filter((item) => item.kind === 'series').length, game: items.filter((item) => item.kind === 'game').length }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setView('all')} aria-label="HAZUNI STREAMING início"><img src={new URL('../logo.png', import.meta.url).href} alt="HAZUNI STREAMING" /><span>YOUR PERSONAL MEDIA LIBRARY</span></button>
        <div className="sidebar-label">MENU PRINCIPAL</div>
        <nav className="main-nav">
          <button className={`nav-link${view === 'all' ? ' active' : ''}`} onClick={() => setView('all')}><Icon name="grid" /><span>Visão geral</span></button>
          <button className={`nav-link${view === 'movie' ? ' active' : ''}`} onClick={() => setView('movie')}><Icon name="film" /><span>Filmes</span><small>{categoryCounts.movie}</small></button>
          <button className={`nav-link${view === 'series' ? ' active' : ''}`} onClick={() => setView('series')}><Icon name="tv" /><span>Séries</span><small>{categoryCounts.series}</small></button>
          <button className={`nav-link${view === 'game' ? ' active' : ''}`} onClick={() => setView('game')}><Icon name="game" /><span>Games</span><small>{categoryCounts.game}</small></button>
          <button className={`nav-link${view === 'favorites' ? ' active' : ''}`} onClick={() => setView('favorites')}><Icon name="heart" /><span>Favoritos</span></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className="note-glow"><Icon name="sparkle" size={16} /></span><strong>Sua coleção.<br />Seu universo.</strong><p>Tudo o que você ama, reunido em um só lugar.</p></div>
          <button className="nav-link" onClick={() => setSettingsOpen(true)}><Icon name="settings" /><span>Ajustes e integrações</span></button>
          <div className="sidebar-caption">PRIVADO · SALVO NESTE DISPOSITIVO</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar"><div className="topbar-leading">{view !== 'all' && <button className="back-button" onClick={() => setView('all')}><Icon name="back" size={16} /><span>Voltar</span></button>}<div className="breadcrumb"><span>HAZUNI</span><b>/</b><strong>{titleText}</strong></div></div><div className="topbar-actions"><label className="search-input global-search"><Icon name="search" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar na biblioteca..." /><kbd>⌘ K</kbd></label><button className="top-icon" onClick={() => setSettingsOpen(true)} aria-label="Configurações"><Icon name="settings" /></button><div className="avatar">H</div></div></header>
        <div className="content-wrap">
          {view === 'all' && <section className="welcome-banner"><div className="banner-orb orb-one" /><div className="banner-orb orb-two" /><div className="banner-copy"><span className="eyebrow"><span className="live-dot" /> SEU ESPAÇO PARTICULAR</span><h1>Bem-vindo ao seu<br /><em>universo de histórias.</em></h1><p>Filmes, séries e games que fazem parte de você — organizados do seu jeito.</p><div className="banner-buttons"><button className="button button-primary" onClick={() => openAdd('movie')}><Icon name="plus" size={17} /> Adicionar título</button><button className="button button-secondary" onClick={() => openAdd('game')}><Icon name="game" size={17} /> Adicionar game</button><button className="button button-glass" onClick={() => setView('all')}>Explorar biblioteca <Icon name="arrow" size={17} /></button></div></div><div className="banner-art"><div className="banner-ring ring-one" /><div className="banner-ring ring-two" /><div className="banner-art-core"><Icon name="sparkle" size={40} /></div><span className="orbit-tag tag-top">EST. YOUR WAY</span><span className="orbit-tag tag-bottom">01 / YOUR LIBRARY</span></div><div className="banner-index">01 <span>—</span> 03</div></section>}

          {view === 'all' && <section className="stats-grid">
            {(['movie', 'series', 'game'] as Kind[]).map((kind) => <button key={kind} className={`stat-card stat-${kind}`} onClick={() => setView(kind)}><span className="stat-icon"><Icon name={kind === 'movie' ? 'film' : kind === 'series' ? 'tv' : 'game'} /></span><span className="stat-info"><small>{kindLabels[kind]}</small><strong>{categoryCounts[kind].toString().padStart(2, '0')}</strong></span><span className="stat-arrow"><Icon name="arrow" size={16} /></span><span className="stat-decoration" /></button>)}
          </section>}

          <section className="library-section">
            <div className="section-title-row"><div><div className="section-kicker"><span className="section-kicker-line" /> SUA COLEÇÃO</div><h2>{titleText} <span className="count-badge">{filtered.length}</span></h2><p>{descriptions[view]}</p></div><div className="section-controls"><div className="sort-select"><Icon name="clock" size={16} /><select aria-label="Ordenar" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Mais recentes</option><option value="oldest">Mais antigos</option><option value="title">Ordem alfabética</option></select></div><button className={`filter-button${filtersOpen ? ' active' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)}><Icon name="filter" size={17} /> Filtros</button></div></div>
            {filtersOpen && <div className="filter-bar"><label>Gênero<select value={genreFilter} onChange={(event) => setGenreFilter(event.target.value)}><option value="">Todos</option>{genres.map((genre) => <option key={genre}>{genre}</option>)}</select></label><label>Ano<select value={yearFilter} onChange={(event) => setYearFilter(event.target.value)}><option value="">Todos</option>{[...new Set(items.map((item) => item.year).filter(Boolean))].sort((a, b) => b.localeCompare(a)).map((year) => <option key={year}>{year}</option>)}</select></label><label>Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Todos</option>{[...new Set(items.map((item) => item.status))].sort().map((status) => <option key={status}>{status}</option>)}</select></label><button className="text-button" onClick={() => { setGenreFilter(''); setYearFilter(''); setStatusFilter('') }}>Limpar filtros</button></div>}
            <div className="collection-tabs"><button className={view === 'all' ? 'selected' : ''} onClick={() => setView('all')}>Tudo <span>{items.length}</span></button><button className={view === 'movie' ? 'selected' : ''} onClick={() => setView('movie')}>Filmes <span>{categoryCounts.movie}</span></button><button className={view === 'series' ? 'selected' : ''} onClick={() => setView('series')}>Séries <span>{categoryCounts.series}</span></button><button className={view === 'game' ? 'selected' : ''} onClick={() => setView('game')}>Games <span>{categoryCounts.game}</span></button></div>

            {!ready ? <div className="empty-state"><div className="loading-spinner" /><p>Carregando sua biblioteca...</p></div> : filtered.length ? <div className="media-grid">{filtered.map((item) => <MediaCard key={item.id} item={item} onOpen={() => setSelected(item)} onFavorite={() => void toggleFavorite(item)} />)}</div> : <div className="empty-state"><div className="empty-art"><Icon name={query || genreFilter || statusFilter || yearFilter ? 'search' : 'sparkle'} size={29} /></div><h3>{items.length === 0 ? 'Sua história começa aqui.' : 'Nenhum título por aqui.'}</h3><p>{items.length === 0 ? 'Adicione seu primeiro filme, série ou game e comece a montar sua coleção.' : 'Tente outra busca ou ajuste os filtros para encontrar o que procura.'}</p>{items.length === 0 && <div className="empty-actions"><button className="button button-primary" onClick={() => openAdd('movie')}><Icon name="plus" size={17} /> Adicionar primeiro título</button><button className="button button-secondary" onClick={() => openAdd('series')}>Adicionar série</button><button className="button button-secondary" onClick={() => openAdd('game')}>Adicionar game</button></div>}</div>}
          </section>
          <footer className="page-footer"><span>HAZUNI STREAMING <i>·</i> UMA BIBLIOTECA PESSOAL</span><span><span className="footer-lock">◆</span> Seus dados ficam neste dispositivo</span></footer>
        </div>
      </main>
      <button className="floating-add" onClick={() => { const kind = view !== 'all' && view !== 'favorites' ? view : 'movie'; openAdd(kind) }} aria-label="Adicionar título"><Icon name="plus" size={24} /></button>

      {formKind && <MediaForm key={`${editing?.id ?? 'new'}-${formKind}`} kind={formKind} item={editing} onSave={save} onClose={() => { setFormKind(null); setEditing(undefined) }} />}
      {selected && <Details item={selected} onClose={() => setSelected(null)} onEdit={() => openEdit(selected)} onFavorite={() => void toggleFavorite(selected)} onDelete={() => void remove(selected)} />}
      {settingsOpen && <Modal title="Ajustes e integrações" onClose={() => setSettingsOpen(false)}><div className="settings-content"><div className="settings-block"><span className="settings-icon"><Icon name="image" /></span><div><h3>Busca de pôsteres TMDB</h3><p>Adicione sua chave do TMDB para priorizar pôsteres oficiais de filmes e séries. Sem chave, a busca consulta automaticamente Wikipedia, TVmaze, Openverse e Wikimedia Commons.</p></div></div><label className="field"><span>Chave de API TMDB</span><input type="password" value={tmdbKey} onChange={(event) => setTmdbKey(event.target.value)} placeholder="Sua chave pessoal de API" autoComplete="off" /></label><p className="settings-hint">A chave fica salva somente no armazenamento local deste navegador. Obtenha uma chave em themoviedb.org/settings/api.</p><div className="settings-divider" /><div className="settings-block"><span className="settings-icon"><Icon name="download" /></span><div><h3>Backup da biblioteca</h3><p>Exporte seus dados para transferir ou guardar uma cópia. Restaurar substitui os dados atuais.</p></div></div><div className="backup-actions"><button className="button button-secondary" onClick={exportBackup}><Icon name="download" size={17} /> Exportar backup</button><input ref={importRef} hidden type="file" accept="application/json,.json" onChange={(event) => void importBackup(event.target.files?.[0])} /><button className="button button-secondary" onClick={() => importRef.current?.click()}><Icon name="upload" size={17} /> Importar backup</button></div><div className="settings-divider" /><div className="privacy-note"><span className="privacy-lock">◆</span><span><strong>Seus dados são seus.</strong><br />A biblioteca fica salva localmente neste navegador. Não usamos contas, anúncios ou serviços de streaming.</span></div><footer className="settings-footer"><button className="button button-quiet" onClick={() => setSettingsOpen(false)}>Cancelar</button><button className="button button-primary" onClick={() => { localStorage.setItem('hazuni-tmdb-key', tmdbKey.trim()); setSettingsOpen(false); notify('Configurações salvas.') }}>Salvar ajustes</button></footer></div></Modal>}
      {toast && <div className={`toast ${toast.tone}`} role="status"><span>{toast.tone === 'success' ? '✓' : '!'}</span>{toast.message}</div>}
    </div>
  )
}

export default App
