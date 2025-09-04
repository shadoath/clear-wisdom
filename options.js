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
      chrome.storage.sync.remove('ideas_fav_i')
      chrome.storage.sync.remove('quotes_fav_q')
      chrome.storage.sync.remove('questions_fav_q')
      $('.notice-text').html('Favorites cleared!')
    }
  })
  $('#clear-count').click(() => {
    if (
      confirm(
        'Are you sure you want to clear the count of times you have seen each quote?'
      )
    ) {
      chrome.storage.sync.remove('ideas_count_i')
      chrome.storage.sync.remove('quotes_count_q')
      chrome.storage.sync.remove('questions_count_q')
      $('.notice-text').html('Counts cleared!')
    }
  })
})
