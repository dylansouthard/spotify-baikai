export const throwError = (err, res, message = null) => {
  res.status(err.status)
  const error = {
    message: message ?? err.message,
    type: err.type,
  }
  throw error
}

export function joinArtists(artists) {
  return artists.map((a) => a.name).join(', ')
}

export function getFirstArtist(artists) {
  return artists?.length > 0 ? artists[0].name : ""
}

export function breakDownSavedAlbum(item) {
  return {
    name: item.album.name,
    artist: getFirstArtist(item.album.artists),
    saved_at: new Date(item.added_at)
  }
}

export function sampleItems(total, initialOffset, targetCount = 90, phases = 3, maxLimitPerReq = 50) {
    const requests = {}

    if (total <= targetCount) {
        let offset = initialOffset
        const allRequests = []
        while (offset < initialOffset + total) {
            allRequests.push({
                limit:maxLimitPerReq,
                offset
            })
            offset += maxLimitPerReq
        }
        requests['all'] = allRequests
    } else {
        const perPhase = Math.floor(targetCount / phases)
        const remainder = targetCount % phases
        let carry = 0
        for (let i = 0; i < phases; i++) {
            const currentPhaseRequests = []
            const phaseStart = Math.floor(total * i / phases)
            const phaseEnd = Math.floor(total * (i + 1) / phases)

            const available = phaseEnd - phaseStart
            const phaseTarget = perPhase + (i < remainder ? 1 : 0)

            const wanted = phaseTarget + carry
            const count = Math.min(wanted, available)
            carry = wanted - count
            if (count === 0) continue

            const minOffset = phaseStart
            const maxOffset = phaseEnd - count

            let offset = minOffset + Math.floor(Math.random() * (maxOffset - minOffset + 1)) + initialOffset
            requests[`phase_${i + 1}`] = {offset:`${offset}`, total}
            let limit = Math.min(count, maxLimitPerReq)
            currentPhaseRequests.push({
                offset,
                limit
            })

            let remaining = count - limit
            while (remaining > 0) {
              offset = offset + limit
              limit = Math.min(remaining, maxLimitPerReq)
              currentPhaseRequests.push({
                offset,
                limit
              })
              remaining -= limit
            }
            
            requests[`phase_${i + 1}`]['requests'] = currentPhaseRequests
        }
    }

    return requests
}

export function sampleArray(arr, max = 100) {
  if (arr.length <= max) return arr;

  const shuffled = [...arr];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, max);
}