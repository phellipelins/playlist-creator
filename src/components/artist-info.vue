<template>
<div class="artist-info" v-if="selectedArtist.id">
  <div class="current-artist vertical-space">
    <div class="column text">
      {{selectedArtist.name}}
      <img class="image" :src="selectedArtist.images[0].url" :alt="selectedArtist.name">
    </div>
  </div>
  <div class="vertical-space text">
    Related with {{selectedArtist.name}}
  </div>
  <!-- Could be reused on album-browser  -->
  <div class="related-artists media-wrapper column">

    <div
      v-for="artist in relatedArtists"
      class="artist media clickable"
      @click="selectArtist(artist)">
      <img class="image" :src="artist.images[0].url" :alt="artist.name">
      {{artist.name}}
    </div>
  </div>
</div>
</template>

<script>
export default {
  name: 'artist-info',
  props: {
    selectedArtist: {
      type: Object
    },
    relatedArtists: {
      type: Array
    }
  },
  data () {
    return {

    }
  },
  methods: {
    selectArtist (artist) {
      this.$emit('select-artist', artist)
    }
  }
}
</script>

<style lang="sass">
.related-artists
  display: flex
  flex-wrap: wrap
</style>