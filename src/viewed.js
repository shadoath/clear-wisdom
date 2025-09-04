import { log } from './util.js'

export function viewed(currently, id) {
  const key = `${currently}_count_${id[0].toLowerCase()}`
  log(key)
  chrome.storage.sync.get([key], (result) => {
    let views_hash = {}
    log(result)
    if (result[key] !== undefined) {
      views_hash = JSON.parse(result[key])
    }

    let count = views_hash[id]
    if (count === undefined) {
      count = 1
    } else {
      count++
    }

    // Only update count display if hideCount setting is not enabled
    chrome.storage.sync.get(['hideCount'], (result) => {
      if (!result.hideCount) {
        $('#count').html(count)
      }
    })
    views_hash[id] = count
    log(views_hash)

    //Now save it
    const new_count = {}
    new_count[key] = JSON.stringify(views_hash)
    chrome.storage.sync.set(new_count)
  })
}
