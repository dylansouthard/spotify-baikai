import asyncHandler from 'express-async-handler'
import qs from 'querystring'
import axios from 'axios'
import { throwError } from '../util/conveniences.js'
import { ERROR_TYPE } from '../constants/errorsType.js'
import { API_CONST, getBearerToken } from '../constants/apiConstants.js'
import { fetchTopItems, fetchSavedAlbums, fetchFollowedArtists } from '../services/tasteService.js'
import { breakDownTrack } from './trackController.js'
import { breakDownSavedAlbum, sampleItems, sampleArray } from '../util/conveniences.js'

export const getUserTasteProfile = asyncHandler(async (req, res) => {
    const header = getBearerToken(req)
    
    const {values:top_tracks, errors:topTrackErrors} = await getTopItems('tracks', header)
    const {values:top_artists, errors:topArtistErrors} = await getTopItems('artists', header)
    const {savedAlbums:saved_albums, errors:savedAlbumErrors} = await getSavedAlbums(header)
    const {artists:followed_artists, error:followedArtistsError} = await getFollowedArtists(header)
    
    const resData = {
        top_artists,
        top_tracks,
        saved_albums,
        followed_artists,
        errors:{
            ...topTrackErrors,
            ...topArtistErrors,
            ...(savedAlbumErrors.length > 0 && {saved_albums:savedAlbumErrors}),
            ...(followedArtistsError && {followed_artists:followedArtistsError})
        }
    }

    res.json(resData)
})


async function getTopItems(type, headers) {
  const timeRanges = ['long_term', 'short_term', 'medium_term']

  const results = await Promise.allSettled(
    timeRanges.map(timeRange =>
      fetchTopItems({ type, timeRange, headers })
    )
  )

  const resData = {
    values: {},
    errors: [],
  }

  results.forEach((result, index) => {
    const timeRange = timeRanges[index]

    if (result.status === 'fulfilled') {
      const items = result.value

      resData.values[timeRange] = type === 'artists'
          ? items.map(artist => artist.name)
          : items.map(breakDownTrack).reduce((acc, trk) => {
            if (!acc[trk.artist]) acc[trk.artist] = []
            acc[trk.artist].push(trk.title)
            return acc
          }, {})
    } else {
      const error = result.reason
      addError(resData.errors, error, `top ${type} ${timeRange}`)
    }
  })

  return resData
}

async function getSavedAlbums(headers, targetCount = 120, phases = 3, mostRecentLimit = 10) {
    const resData = {savedAlbums: {}, errors:[]}
    try {
        const firstRes = await fetchSavedAlbums({limit:mostRecentLimit, headers})
        const total = firstRes.total
        const albums = firstRes.albums
        resData.savedAlbums['most_recent'] = albums.map(breakDownSavedAlbum)
        const remainingTotal = total - albums.length
        if (remainingTotal < 1) return resData

        const requestParams = sampleItems(remainingTotal, mostRecentLimit, targetCount, phases, 50)
        
        const phaseResults = await Promise.all(
            Object.entries(requestParams).map(([phase, {requests, offset, total}]) => fetchAlbumPhase(phase, requests, offset, total, headers))
        )

        

        phaseResults.forEach(({phase, albums, errors, offset, total}) => {

            const albumByYear = albums.reduce((acc, alb) => {
                const year = alb.saved_at.getFullYear()
                if (!acc[year]) acc[year] = {}
                if (!acc[year][alb.artist]) acc[year][alb.artist] = []
                acc[year][alb.artist].push(alb.name)

                return acc
            }, {})

            resData.savedAlbums[phase] = {}
            resData.savedAlbums[phase]['position'] = `from ${offset} of ${total}`
            resData.savedAlbums[phase]['albums'] = albumByYear
            resData.errors.push(...errors)
        })

    } catch(e) {
        addError(resData.errors, e, 'saved albums')
    }
    return resData
}

async function getFollowedArtists(headers, totalReqLimit = 300, sampleLimit = 100) {
    const resData = {artists:[], error:null}
    try {
        const artists = await fetchFollowedArtists({headers, totalLimit:totalReqLimit, fetchNext:true})
        resData.artists = sampleArray(artists, sampleLimit)
    } catch (e) {
        resData['error'] = e?.response?.data?.error?.message
          ?? e?.message
          ?? 'Unknown error'
    }
    return resData
}

async function fetchAlbumPhase(phase, requests, offset, total, headers) {
  const results = await Promise.allSettled(
    requests.map(params => fetchSavedAlbums({ headers, ...params }))
  )

  const albums = []
  const errors = []

  results.forEach(result => {
    if (result.status === 'fulfilled') {
      albums.push(...result.value.albums.map(breakDownSavedAlbum))
    } else {
      addError(errors, result.reason, `saved_albums_${phase}`)
    }
  })

  return { phase, albums, errors, offset, total }
}



function addError(errors, error, field) {
    errors.push({
        field,
        message:
          error?.response?.data?.error?.message
          ?? error?.message
          ?? 'Unknown error',
      })
}

function divideResults(results) {
    return {
        fulfilled: results.filter(r => r.status === 'fulfilled').map(f => f.value),
        errors: results.filter(r => r.status !== 'fulfilled').map(r => r.reason?.response?.data?.error?.message ?? error?.message ?? 'Unknown error')
    }
}
