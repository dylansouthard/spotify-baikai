import { createPlaylist, addTracksToPlaylist, getPlaylist } from "./spotifyPlaylistService.js";
import { startPlayback } from "./spotifyPlayerService.js";
import { formatMcpReturnError } from "../mcpServer/utilities.js";
import { getErrorMessage } from "../util/conveniences.js";
import { formatError } from "zod/v4/core";


export const createAndPlayPlaylist = async ({name, description, uris, deviceId, headers}) => {
    const res = {
        outcome: 'failed',
        failed_stage: 'create_playlist',
        verification_status: 'not_attempted',
        playlist_id: null,
        playlist_url: null,
        playlist_uri:null,
        num_tracks_added: 0,
        added_tracks:[],
        playback_started:false,
        message: ''
    }
    let playlist
    try {
        playlist = await createPlaylist({name, description, headers})
    } catch (e) {
        res.message = getErrorMessage(e, 'Failed to create playlist')
        return res
    }
    res.playlist_id = playlist.playlist_id
    res.playlist_url = playlist.url
    res.playlist_uri = `spotify:playlist:${playlist.playlist_id}`
    try {
        await addTracksToPlaylist({playlistId: playlist.playlist_id, uris, headers})
    } catch (e) {
        res.outcome = 'partial'
        res.message = `Playlist created but tracks not added. Error: ${formatError(e, 'no error message avaialble')}`
        res.failed_stage = 'add_tracks_to_playlist'
        return res
    }

    try {
        const fetchedPlaylist = await getPlaylist({playlistId:res.playlist_id, headers})
        const tracksAdded = fetchedPlaylist.tracks.length
        if (tracksAdded < fetchedPlaylist.total_items) {
            res.message = 'One or more tracks were not added to the playlist. The id(s) were likely incorrect/malformed and invisible null values have been added to the playlist. See the actual added_tracks list to determine which were added\n'
            res.outcome = 'warning'
        } else {
            res.verification_status = 'verified'
        }
            
        res.num_tracks_added = tracksAdded
        res.added_tracks = fetchedPlaylist.tracks
    } catch (e) {
        res.verification_status = 'unknown'
        res.message = 'Could not fetch playlist to check if all tracks were added successfully. There was no error in adding the tracks, so it might be OK. Might be fucked. Should probably inform the user that they have Schroddinger\'s playlist.\n'
    }

    try {
        await startPlayback({deviceId, contextUri:res.playlist_uri ?? res.playlist_url, headers})
        res.outcome = 'completed'
        res.failed_stage = null
        res.message += 'Successfully started playing. Tell your user to sit back and groove.'
        res.playback_started = true
        return res
    } catch (e) {
        res.outcome = 'partial'
        res.failed_stage = 'play_context'
        res.message += 'Playlist created. Tracks added. Playback failed.'
        return res
    }
}
