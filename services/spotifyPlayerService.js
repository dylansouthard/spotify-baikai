import axios from 'axios'
import { API_CONST } from '../constants/apiConstants.js'


export const startPlayback = async ({deviceId, contextUri, uris, headers}) => {
    const response = await axios.put(`${API_CONST.SF_API_BASE}me/player/play`,
        {
            ...(uris && { uris }),
            ...(contextUri && { context_uri: contextUri }),
        },
        {
            headers,
            params: {...(deviceId && { device_id: deviceId })}
        }
    )
    return {status:response.status, message:'Playback started'}
}