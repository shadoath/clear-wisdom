import { log } from './util.js'

export function check_favorite(currently, id) {
  const key = currently + '_fav_' + id[0].toLowerCase()
  log(key)
  chrome.storage.sync.get([key], (result) => {
    var favs_hash = {}
    if (result[key] !== undefined) {
      favs_hash = JSON.parse(result[key])
      log(favs_hash)
      if (favs_hash[id] === 1) {
        $('#favorite').toggleClass('liked', true)
        return true
      }
    }
    $('#favorite').toggleClass('liked', false)
    return false
  })
}

export function is_favoriting(currently, id, liking) {
  const key = currently + '_fav_' + id[0].toLowerCase()

  chrome.storage.sync.get([key], (result) => {
    var favs_hash = {}
    if (result[key] !== undefined) {
      favs_hash = JSON.parse(result[key])
    }
    log(favs_hash)
    $('#favorite').toggleClass('liked', liking)
    favs_hash[id] = liking

    //Now save it
    var new_likes = {}
    new_likes[key] = JSON.stringify(favs_hash)
    chrome.storage.sync.set(new_likes)
  })
}
