const SpotifyApi = require('spotify-web-api-js')

const spotifyApi = new SpotifyApi()
import {differenceBy, chunk} from 'lodash'

export default {
  state: {
    playlist: [],
    // to be used on undo action
    previousPlaylist: null,
    // originalPlaylist is the one before save
    originalPlaylist: [],
    orderedBy: [],
    playlistName: 'My Playlist',
    playlistObject: {}
  },
  getters: {
    playlist: state => state.playlist,
    playlistName: state => state.playlistName,
    playlistIsEmpty: state => state.playlist.length === 0,
    totalDurationPlaylist: ({playlist}) => playlist.reduce((a, b) => a + b.duration_ms, 0),
    totalSongs: ({playlist}) => playlist.length,
    previousPlaylist: ({previousPlaylist}) => previousPlaylist
  },
  actions: {
    push ({commit}, {track}) {
      spotifyApi.getAudioFeaturesForTrack(track.id)
      .then(data => {
        console.log(data)
        track.features = data
        commit('PUSH', {track})
      })
    },
    remove ({commit}, {track}) {
      commit('REMOVE', {track})
    },
    replace ({commit}, {playlistTracks}) {
      commit('REPLACE_PLAYLIST', {playlistTracks})
    },
    setPlaylistObject ({commit}, {playlist}) {
      commit('SET_PLAYLIST_OBJ', {playlist})
    },
    setOriginalPlaylist ({commit}, {playlistTracks}) {
      commit('REPLACE_ORIGINAL_PLAYLIST', {playlistTracks})
    },
    changePlaylistName ({commit}, {name}) {
      commit('CHANGE_PLAYLIST_NAME', {name})
    },
    loadPlaylist ({commit, rootState}, {playlist}) {
      commit('SET_PLAYLIST_OBJ', {playlist})
      spotifyApi.setAccessToken(rootState.accessToken)
      spotifyApi.getPlaylistTracks(rootState.currentUser.id, playlist.id)
      .then((data) => {
        const playlistTracks = data.items.map(i => i.track)
        return playlistTracks
      })
      .then(playlistTracks => {
        const trackIds = playlistTracks.map(t => t.id)
        spotifyApi.getAudioFeaturesForTracks(trackIds)
        .then(({audio_features: features}) => {
          return playlistTracks.map((t, index) => {
            t.features = features[index]
            return t
          })
        })
        .then(tracksWithFeatures => {
          commit('REPLACE_PLAYLIST', {playlistTracks: tracksWithFeatures})
          commit('REPLACE_ORIGINAL_PLAYLIST', {playlistTracks: tracksWithFeatures})
        })
      })
      .then(() => {
        commit('CHANGE_PLAYLIST_NAME', {name: playlist.name})
      })
      .catch(e => {
        console.error(e)
        commit('CLEAN_ACCESS')
      })
    },
    addTracksToPlaylist ({state, commit, rootState, dispatch}) {
      if (!rootState.accessToken) {
        dispatch('cleanAccess')
        window.alert('Please login again')
        return
      }

      const newTracks = differenceBy(state.playlist, state.originalPlaylist, 'id').map(t => t.uri)

      if (newTracks.length > 0) {
        spotifyApi.setAccessToken(rootState.accessToken)
        spotifyApi.addTracksToPlaylist(rootState.currentUser.id, state.playlistObject.id, newTracks)
        .then((data) => {
          // only get a snapshot https://developer.spotify.com/web-api/add-tracks-to-playlist/
        })
        .catch(e => { console.error(e) })
      }
    },
    reorder ({state, commit}, {playlist}) {
      // save previousPlaylist
      commit('UPDATE_PREVIOUS_PLAYLIST', {playlist: state.playlist})
      // reordered playlist
      commit('REPLACE_PLAYLIST', {playlistTracks: playlist})
    },
    undo ({commit, state}) {
      // reordered playlist
      commit('REPLACE_PLAYLIST', {playlistTracks: state.previousPlaylist})
      commit('UPDATE_PREVIOUS_PLAYLIST', {playlist: null})
    },

    /**
     * SpotifyApi only accepts requests with a maximum of 100 tracks per requests
     * Since the creator can reorder the playlist, the easy way to save this is to replace 100 tracks and add
     * the rest in 100 batches using  addTracksToPlaylist after replaceTracksInPlaylist.
     * @param {any} {state, commit}
     * @param {Object} {playlist}
     */
    savePlaylist ({state, commit, rootState, dispatch}, {maximumPerRequest = 100}) {
      if (!rootState.accessToken) {
        dispatch('cleanAccess')
        window.alert('Please login again')
        return
      }
      spotifyApi.setAccessToken(rootState.accessToken)
      const userId = rootState.currentUser.id
      const playlistId = state.playlistObject.id
      const playlistURIs = state.playlist.map(track => track.uri)
      const chunks = chunk(playlistURIs, maximumPerRequest)
      chunks.forEach(async (chunk, i) => {
        if (i === 0) { // first
          await spotifyApi.replaceTracksInPlaylist(userId, playlistId, chunk)
        } else { // rest
          await spotifyApi.addTracksToPlaylist(userId, playlistId, chunk)
        }
      })
    }
  },
  mutations: {
    PUSH (state, {track}) {
      state.playlist = [...state.playlist, track]
    },
    REMOVE (state, {track}) {
      state.playlist = state.playlist.filter(t => t.id !== track.id)
    },
    CHANGE_PLAYLIST_NAME (state, {name}) {
      state.playlistName = `${name}`
    },
    REPLACE_PLAYLIST (state, {playlistTracks}) {
      state.playlist = playlistTracks
    },
    REPLACE_ORIGINAL_PLAYLIST (state, {playlistTracks}) {
      state.originalPlaylist = playlistTracks
    },
    SET_PLAYLIST_OBJ (state, {playlist}) {
      state.playlistObject = playlist
    },
    UPDATE_PREVIOUS_PLAYLIST (state, {playlist}) {
      state.previousPlaylist = playlist
    }
  }
}
