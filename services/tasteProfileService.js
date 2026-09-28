import { fetchSavedAlbums, fetchTopItems, getConsecutiveFollowedArtists } from './spotifyLibraryService.js'
import { getErrorMessage, sampleItems, breakDownTracksByArtist, sampleArray } from '../util/conveniences.js'


export const getTasteProfile = async ({headers}) => {
    const {savedAlbums:saved_albums, errors:savedAlbumErrors} = await getSavedAlbums({headers})
    const {data:followed_artists, errors:followedArtistErrors} = await getFollowedArtists(headers)
    const {values:top_tracks, errors:topTrackErrors} = await getTopItems('tracks', headers)
    const {values:top_artists, errors:topArtistErrors} = await getTopItems('artists', headers)

    return {
        top_tracks,
        top_artists,
        saved_albums,
        followed_artists,
        errors:[
            ...savedAlbumErrors,
            ...topArtistErrors,
            ...topTrackErrors,
            ...followedArtistErrors
        ]
    }
}


async function getSavedAlbums({headers, targetCount = 120, phases = 3, mostRecentLimit = 10}) {
    const resData = {savedAlbums: {total:0, most_recent:[], sampled_albums:{}}, errors:[]}
    try {
        const firstRes = await fetchSavedAlbums({limit:mostRecentLimit, headers})
        const total = firstRes.total
        resData.savedAlbums['total'] = total
        const albums = firstRes.albums
        resData.savedAlbums['most_recent'] = albums
        const remainingTotal = total - albums.length
        if (remainingTotal < 1) return resData

        const requestParams = sampleItems(remainingTotal, mostRecentLimit, targetCount, phases, 50)
        
        const phaseResults = await Promise.all(
            Object.entries(requestParams).map(([phase, {requests, offset, total}]) => fetchAlbumPhase(phase, requests, offset, total, headers))
        )

        

        phaseResults.forEach(({phase, albums, errors, offset}) => {

            const albumByYear = albums.reduce((acc, alb) => {
                const year = `${new Date(alb.added_at).getFullYear()}`
                if (!acc[year]) acc[year] = {}
                if (!acc[year][alb.artist]) acc[year][alb.artist] = []
                acc[year][alb.artist].push(alb.name)

                return acc
            }, {})

            resData.savedAlbums['sampled_albums'][phase] = {
              offset: Number(offset),
              albums: albumByYear

            }
            resData.errors.push(...errors)
        })

    } catch(e) {
        resData.errors.push({field: 'saved_albums', message:getErrorMessage(e)})
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
      albums.push(...result.value.albums)
    } else {
        errors.push({field: `saved_albums_${phase}`, message: getErrorMessage(result.reason, 'Unknown Error')})
    }
  })

  return { phase, albums, errors, offset, total }
}

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
          : breakDownTracksByArtist(items)
    } else {
      const error = result.reason
      resData.errors.push({field:`top_${type}_${timeRange}`, message: getErrorMessage(error, 'Request failed')})
    }
  })

  return resData
}

async function getFollowedArtists(headers, totalReqLimit = 300, sampleLimit = 100) {
    const resData = {data:{sample_size:0, total:0, artists:[]}, errors:[]}
    try {
        const {total, artists} = await getConsecutiveFollowedArtists({headers, totalLimit:totalReqLimit, fetchNext:true})
        resData.data = {
            sample_size:Math.min(sampleLimit, artists.length),
            total:total,
            artists: sampleArray(artists, sampleLimit),
        }
    } catch (e) {
        resData.errors.push({field:'followed_artists', message:getErrorMessage(e, 'Could not get followed artists')})
    }
    return resData
}