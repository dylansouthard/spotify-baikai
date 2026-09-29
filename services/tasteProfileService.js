import { fetchTopItems, getConsecutiveFollowedArtists, fetchSavedItems } from './spotifyLibraryService.js'
import { getErrorMessage, sampleItems, breakDownTracksByArtist, sampleArray } from '../util/conveniences.js'


export const getTasteProfile = async ({headers}) => {
    const {savedItems:saved_albums, errors:savedAlbumErrors} = await getSavedItems({type:'album', headers})
    const {savedItems:saved_tracks, errors:savedTrackErrors} = await getSavedItems({type:'track', headers})
    const {data:followed_artists, errors:followedArtistErrors} = await getFollowedArtists(headers)
    const {values:top_tracks, errors:topTrackErrors} = await getTopItems('tracks', headers)
    const {values:top_artists, errors:topArtistErrors} = await getTopItems('artists', headers)

    return {
        top_tracks,
        top_artists,
        saved_albums,
        saved_tracks,
        followed_artists,
        errors:[
            ...savedAlbumErrors,
            ...topArtistErrors,
            ...topTrackErrors,
            ...followedArtistErrors,
            ...savedTrackErrors
        ]
    }
}


async function getSavedItems({type='track', headers, targetCount = 120, phases = 3, mostRecentLimit = 10}) {
    const resData = {savedItems: {total:0, most_recent:[], sampled_items:{}}, errors:[]}
    try {
        const {total, items:most_recent } = await fetchSavedItems({type, limit:mostRecentLimit, headers})

        resData.savedItems = {
            total,
            most_recent,
            sampled_items: {}
        }

        const remainingTotal = total - most_recent.length
        if (remainingTotal < 1) return resData

        const requestParams = sampleItems(remainingTotal, mostRecentLimit, targetCount, phases, 50)
        
        const phaseResults = await Promise.all(
            Object.entries(requestParams).map(([phase, {requests, offset, total}]) => fetchItemPhase(phase, requests, offset, total, headers, type))
        )

        phaseResults.forEach(({phase, items, errors, offset}) => {

            const itemsByYear = items.reduce((acc, itm) => {
                const year = `${new Date(itm.added_at).getFullYear()}`
                if (!acc[year]) acc[year] = {}
                if (!acc[year][itm.artist]) acc[year][itm.artist] = []
                acc[year][itm.artist].push(itm.name)

                return acc
            }, {})

            resData.savedItems['sampled_items'][phase] = {
              offset: Number(offset),
              items: itemsByYear

            }
            resData.errors.push(...errors)
        })

    } catch(e) {
        resData.errors.push({field: `saved_${type}s`, message:getErrorMessage(e)})
    }
    return resData
}

async function fetchItemPhase(phase, requests, offset, total, headers, type = 'track') {
  const results = await Promise.allSettled(
    requests.map(params => fetchSavedItems({ headers, type, ...params }))
  )

  const items = []
  const errors = []

  results.forEach(result => {
    if (result.status === 'fulfilled') {
      items.push(...result.value.items)
    } else {
        errors.push({field: `saved_${type}s_${phase}`, message: getErrorMessage(result.reason, 'Unknown Error')})
    }
  })

  return { phase, items, errors, offset, total }
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