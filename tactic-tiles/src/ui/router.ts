import { useEffect, useState } from 'react'
import type { Difficulty } from '../engine/random'

export type Route =
  | { screen: 'home' }
  | { screen: 'level'; id: number; proof?: string }
  | { screen: 'daily' }
  | { screen: 'random'; difficulty: Difficulty; seed: string }
  | { screen: 'custom'; data: string; proof?: string }
  | { screen: 'workshop'; data?: string }

const difficulties: Difficulty[] = ['easy', 'medium', 'hard']

export function parseRoute(hash: string): Route {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  const parts = path.split('/').filter(Boolean)
  const proof = new URLSearchParams(query).get('proof') ?? undefined

  switch (parts[0]) {
    case 'level': {
      const id = Number(parts[1])
      return Number.isSafeInteger(id) && id > 0 ? { screen: 'level', id, ...(proof ? { proof } : {}) } : { screen: 'home' }
    }
    case 'daily':
      return { screen: 'daily' }
    case 'random': {
      const difficulty = difficulties.includes(parts[1] as Difficulty) ? (parts[1] as Difficulty) : 'medium'
      return { screen: 'random', difficulty, seed: parts[2] ?? 'start' }
    }
    case 'custom':
      return parts[1] ? { screen: 'custom', data: parts[1], ...(proof ? { proof } : {}) } : { screen: 'workshop' }
    case 'workshop':
      return { screen: 'workshop', ...(parts[1] ? { data: parts[1] } : {}) }
    default:
      return { screen: 'home' }
  }
}

export function routeHref(route: Route): string {
  switch (route.screen) {
    case 'home':
      return '#/'
    case 'level':
      return `#/level/${route.id}${route.proof ? `?proof=${route.proof}` : ''}`
    case 'daily':
      return '#/daily'
    case 'random':
      return `#/random/${route.difficulty}/${route.seed}`
    case 'custom':
      return `#/custom/${route.data}${route.proof ? `?proof=${route.proof}` : ''}`
    case 'workshop':
      return route.data ? `#/workshop/${route.data}` : '#/workshop'
  }
}

export function navigate(route: Route) {
  window.location.hash = routeHref(route)
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    typeof window === 'undefined' ? { screen: 'home' } : parseRoute(window.location.hash),
  )

  useEffect(() => {
    const update = () => {
      setRoute(parseRoute(window.location.hash))
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  return route
}
