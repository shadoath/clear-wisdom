const boolean_buttons = ['hideCount']
$(() => {
  $.each(boolean_buttons, (i, boolean_button) => {
    window[boolean_button] = false
    chrome.storage.sync.get([boolean_button], (data) => {
      if (typeof data[boolean_button] !== 'undefined') {
        window[boolean_button] = data[boolean_button]
      }
      $(`#${boolean_button}`).prop('checked', window[boolean_button])
      $(`#${boolean_button}`).click((event) => {
        const chrome_key_value = {}
        chrome_key_value[boolean_button] = $(`#${boolean_button}`).prop(
          'checked'
        )
        chrome.storage.sync.set(chrome_key_value, () => {
          console.log('Saved!', chrome_key_value)
        })
        $('.notice-text').html('Setting saved!')
      })
    })
  })
  $('#clear-favorites').click(() => {
    if (confirm('Are you sure you want to clear your favorites?')) {
      chrome.storage.sync.get(null, (all) => {
        const keysToRemove = Object.keys(all || {}).filter(
          (k) =>
            k.startsWith('ideas_fav_') ||
            k.startsWith('quotes_fav_') ||
            k.startsWith('questions_fav_')
        )
        if (keysToRemove.length === 0) {
          $('.notice-text').html('No favorites to clear.')
          return
        }
        chrome.storage.sync.remove(keysToRemove, () => {
          $('.notice-text').html('Favorites cleared!')
        })
      })
    }
  })
  $('#clear-count').click(() => {
    if (
      confirm(
        'Are you sure you want to clear the count of times you have seen each quote?'
      )
    ) {
      chrome.storage.sync.get(null, (all) => {
        const keysToRemove = Object.keys(all || {}).filter(
          (k) =>
            k.startsWith('ideas_count_') ||
            k.startsWith('quotes_count_') ||
            k.startsWith('questions_count_')
        )
        if (keysToRemove.length === 0) {
          $('.notice-text').html('No counts to clear.')
          return
        }
        chrome.storage.sync.remove(keysToRemove, () => {
          $('.notice-text').html('Counts cleared!')
        })
      })
    }
  })
})
