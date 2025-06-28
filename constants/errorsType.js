export const ERROR_TYPE = {
  ADD_TRACKS: {
    type: 'ADD_TRACKS',
    message: 'Failed to add tracks',
    status: 400,
  },
  AUTH_TOKEN: {
    type: 'AUTH_TOKEN',
    message: 'Token exchange failed',
    status: 400,
  },
  CREATE_PLAYLIST: {
    type: 'CREATE_PLAYLIST',
    message: 'Failed to create playlist',
    status: 400,
  },
  SEARCH: {
    type: 'SEARCH',
    message: 'Failed to search',
    status: 500,
  },
  TOKEN_REFRESH: {
    type: 'TOKEN_REFRESH',
    message: 'Token refresh failed',
    status: 400,
  },
}
