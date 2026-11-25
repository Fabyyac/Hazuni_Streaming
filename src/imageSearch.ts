import type { Kind } from './types'

export interface ImageResult {
  id: string
  title: string
  image: string
  fallbackImage?: string
  source: string
  related?: boolean
}

interface ScoredImage extends ImageResult {
  score: number
}

const TMDB_BASE = 'https://image.tmdb.org/t/p/w500'
const TMDB_API = 'https://api.themoviedb.org/3'
const TVMAZE_API = 'https://api.tvmaze.com'
const OPENVERSE_API = 'https://api.openverse.org/v1/images/'
const COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
const WIKIPEDIA_API = 'https://en.wikipedia.org/w/rest.php/v1/search/page'

function words(value: string): string[] {
  const mapped = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .match(/[a-z0-9]+/g) ?? []
  const numberWords: Record<string, string> = { one: '1', two: '2', three: '3', four: '4', five: '5' }
  return mapped.map((word) => numberWords[word] ?? word)
}

function scoreTitle(title: string, query: string): number {
  const queryWords = [...new Set(words(query))]
  const titleWords = new Set(words(title))
  if (queryWords.length === 0) return 0

  const matched = queryWords.filter((word) => titleWords.has(word)).length
  const allWordsMatch = matched === queryWords.length
  const titlePhrase = words(title).join(' ')
  const queryPhrase = queryWords.join(' ')
  const exactTitle = titlePhrase === queryPhrase
  const startsWithTitle = titlePhrase.startsWith(`${queryPhrase} `)
  const artworkTerms = new Set(['poster', 'cover', 'artwork', 'movie', 'film', 'series', 'tv', 'keyart', 'promo', 'affiche', 'afiche', 'capa'])
  const artworkMatch = words(title).some((word) => artworkTerms.has(word))
  const unrelatedTerms = new Set(['list', 'episode', 'episodes', 'soundtrack', 'accolades', 'awards', 'award', 'characters'])
  const unrelatedMatch = words(title).some((word) => unrelatedTerms.has(word))

  return (exactTitle ? 100 : startsWithTitle ? 30 : 0) + (allWordsMatch ? 50 : 0) + matched * 10 + (artworkMatch ? 5 : 0) - (unrelatedMatch ? 60 : 0)
}

async function searchTmdb(query: string, kind: Exclude<Kind, 'game'>, key: string): Promise<ImageResult[]> {
  const mediaType = kind === 'movie' ? 'movie' : 'tv'
  const url = new URL(`${TMDB_API}/search/${mediaType}`)
  url.searchParams.set('query', query)
  url.searchParams.set('include_adult', 'false')
  url.searchParams.set('language', 'pt-BR')
  url.searchParams.set('api_key', key)
  const response = await fetch(url)
  if (!response.ok) throw new Error('A busca do TMDB falhou. Confira sua chave de API em Ajustes.')
  const data = await response.json() as { results?: Array<{ id: number; title?: string; name?: string; poster_path?: string | null }> }
  return (data.results ?? [])
    .filter((item) => item.poster_path)
    .slice(0, 12)
    .map((item) => ({
      id: `tmdb-${item.id}`,
      title: item.title ?? item.name ?? 'Pôster',
      image: `${TMDB_BASE}${item.poster_path}`,
      source: 'TMDB',
    }))
}

async function searchTvMaze(query: string): Promise<ImageResult[]> {
  const url = new URL(`${TVMAZE_API}/search/shows`)
  url.searchParams.set('q', query)
  const response = await fetch(url)
  if (!response.ok) throw new Error('A busca de séries no TVmaze não respondeu.')
  const data = await response.json() as Array<{ score: number; show: { id: number; name: string; image?: { medium?: string; original?: string } | null } }>
  return data
    .filter((item) => item.show.image?.original ?? item.show.image?.medium)
    .slice(0, 12)
    .map((item) => ({
      id: `tvmaze-${item.show.id}`,
      title: item.show.name,
      image: item.show.image?.original ?? item.show.image?.medium ?? '',
      source: 'TVmaze',
    }))
}

async function searchOpenverse(query: string): Promise<ImageResult[]> {
  const url = new URL(OPENVERSE_API)
  url.searchParams.set('q', query)
  url.searchParams.set('page_size', '20')
  const response = await fetch(url)
  if (!response.ok) throw new Error('A busca de imagens no Openverse não respondeu.')
  const data = await response.json() as { results?: Array<{ id: string; title: string; thumbnail?: string; url?: string; source?: string }> }
  return (data.results ?? [])
    .filter((item) => item.thumbnail ?? item.url)
    .map((item) => ({
      id: `openverse-${item.id}`,
      title: item.title || 'Imagem',
      image: item.url ?? item.thumbnail ?? '',
      fallbackImage: item.thumbnail && item.url ? item.thumbnail : undefined,
      source: item.source ? `Openverse · ${item.source}` : 'Openverse',
    }))
}

async function searchCommons(query: string): Promise<ImageResult[]> {
  const url = new URL(COMMONS_API)
  url.searchParams.set('action', 'query')
  url.searchParams.set('generator', 'search')
  url.searchParams.set('gsrsearch', query)
  url.searchParams.set('gsrnamespace', '6')
  url.searchParams.set('gsrlimit', '20')
  url.searchParams.set('prop', 'imageinfo')
  url.searchParams.set('iiprop', 'url')
  url.searchParams.set('iiurlwidth', '500')
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  const response = await fetch(url)
  if (!response.ok) throw new Error('A busca no Wikimedia Commons não respondeu.')
  const data = await response.json() as { query?: { pages?: Record<string, { pageid: number; title: string; imageinfo?: Array<{ thumburl?: string; url?: string }> }> } }
  return Object.values(data.query?.pages ?? [])
    .filter((page) => page.imageinfo?.[0]?.thumburl ?? page.imageinfo?.[0]?.url)
    .map((page) => ({
      id: `commons-${page.pageid}`,
      title: page.title.replace(/^File:/, '').replace(/_/g, ' '),
      image: page.imageinfo?.[0]?.thumburl ?? page.imageinfo?.[0]?.url ?? '',
      fallbackImage: page.imageinfo?.[0]?.url ?? undefined,
      source: 'Wikimedia Commons',
    }))
}

async function searchWikipedia(query: string): Promise<ImageResult[]> {
  const articleUrl = new URL(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query.replace(/ /g, '_'))}`)
  const articleResponse = await fetch(articleUrl)
  if (articleResponse.ok) {
    const article = await articleResponse.json() as { pageid?: number; title?: string; thumbnail?: { source: string }; originalimage?: { source: string } }
    const image = article.originalimage?.source ?? article.thumbnail?.source
    if (image) {
      return [{
        id: `wikipedia-${article.pageid ?? article.title ?? query}`,
        title: article.title ?? query,
        image,
        source: 'Wikipedia',
      }]
    }
  }

  const url = new URL(WIKIPEDIA_API)
  url.searchParams.set('q', query)
  url.searchParams.set('limit', '10')
  const response = await fetch(url)
  if (!response.ok) throw new Error('A busca na Wikipedia não respondeu.')
  const data = await response.json() as { pages?: Array<{ id: number; title: string; thumbnail?: { url: string } }> }
  return (data.pages ?? [])
    .filter((page) => page.thumbnail?.url)
    .map((page) => ({
      id: `wikipedia-${page.id}`,
      title: page.title,
      image: `https:${page.thumbnail?.url?.replace(/\/\d+px-/, '/500px-') ?? ''}`,
      source: 'Wikipedia',
    }))
}

async function settleSearches(searches: Array<Promise<ImageResult[]>>): Promise<ImageResult[]> {
  const responses = await Promise.allSettled(searches)
  const images = responses.flatMap((response) => response.status === 'fulfilled' ? response.value : [])
  if (images.length > 0) return images

  if (responses.every((response) => response.status === 'rejected')) {
    throw new Error('Não foi possível acessar as fontes de imagens. Confira sua conexão e tente novamente.')
  }
  return []
}

export async function searchImages(
  query: string,
  kind: Kind,
  tmdbKey: string,
): Promise<ImageResult[]> {
  if (tmdbKey.trim() && kind !== 'game') {
    const posters = await searchTmdb(query, kind, tmdbKey.trim())
    if (posters.length > 0) return posters
  }

  const results = await settleSearches([
    searchWikipedia(query),
    searchOpenverse(query),
    searchOpenverse(`${query} poster`),
    searchOpenverse(`${query} cover`),
    searchCommons(query),
    searchCommons(`${query} poster`),
    searchTvMaze(query),
  ])
  const ranked: ScoredImage[] = results
    .map((image) => ({ ...image, score: scoreTitle(image.title, query) }))
    .sort((a, b) => b.score - a.score)
  const exact = new Map<string, ScoredImage>()
  for (const image of ranked) {
    if (image.score >= 120 && !exact.has(image.image)) exact.set(image.image, image)
  }
  if (exact.size > 0) {
    return [...exact.values()].slice(0, 20).map(({ score: _score, ...image }) => image)
  }

  const related = new Map<string, ScoredImage>()
  for (const image of ranked) {
    if (image.score >= 40 && !related.has(image.image)) related.set(image.image, { ...image, related: true })
  }
  return [...related.values()].slice(0, 12).map(({ score: _score, ...image }) => image)
}
