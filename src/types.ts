export type Kind = 'movie' | 'series' | 'game'
export type Status = string

export interface MediaItem {
  id: string
  kind: Kind
  title: string
  year: string
  genre: string
  synopsis: string
  cover: string
  rating: string
  status: Status
  notes: string
  createdAt: string
  favorite: boolean
  director?: string
  watchedAt?: string
  seasons?: string
  episodes?: string
  currentSeason?: string
  currentEpisode?: string
  platform?: string
  developer?: string
  playedAt?: string
}

export const kindLabels: Record<Kind, string> = {
  movie: 'Filmes',
  series: 'Séries',
  game: 'Games',
}

export const statusOptions: Record<Kind, string[]> = {
  movie: ['Assistido', 'Quero assistir'],
  series: ['Assistindo', 'Finalizada', 'Quero assistir'],
  game: ['Zerado', 'Jogando', 'Abandonado', 'Quero jogar'],
}
