/**
 *  Skylar Bolton - skylar.bolton@gmail.com
 *  Josh Bender   - jbendercode@gmail.com
 *  Last Updated  - 2021/04/11
 *  Updated for Clear Wisdom - 2024
 **/

const ideas = []
const quotes = []
const questions = []
let currently = 'ideas'
let options = ''
let search
let refresh
let ideasSelect
let quotesSelect
let questionsSelect
let quote
let author
let explanation
let hideCount

import { viewed } from './src/viewed.js'
import { check_favorite, is_favoriting } from './src/favorites.js'
import { getRandomFromArray, fadeIn, log, matchRuleShort } from './src/util.js'
import { parseMarkdown, markdownToPlainText } from './src/markdown.js'

$(() => {
  // Load all three files
  $.getJSON('/lib/ideas.json', (json) => {
    $(json).each((layer, value) => {
      ideas.push(value)
    })
  })
  $.getJSON('/lib/quotes.json', (json) => {
    $(json).each((layer, value) => {
      quotes.push(value)
    })
  })
  $.getJSON('/lib/questions.json', (json) => {
    $(json).each((layer, value) => {
      questions.push(value)
    })
    // Initialize after all files are loaded
    newTab()
  })
  loadClickListeners()
})

function loadClickListeners() {
  $('#search-icon').click(() => {
    $('#search-icon').hide()
    $('#search-and-exchange').slideDown(() => {
      $('#search-wisdom-quotes').focus()
      console.log('Search interface opened')
    })
  })

  $('#search-wisdom-quotes').keyup(() => {
    const search_text = $('#search-wisdom-quotes').val().trim().toLowerCase()
    if (search_text.length > 0) {
      search_for(search_text)
    } else {
      // If search is cleared, restore the current display
      refreshDisplay()
    }
  })

  // Also handle Enter key for better UX
  $('#search-wisdom-quotes').keypress((e) => {
    if (e.which === 13) {
      // Enter key
      const search_text = $('#search-wisdom-quotes').val().trim().toLowerCase()
      if (search_text.length > 0) {
        search_for(search_text)
      }
    }
  })
  $('#favorite').click(() => {
    is_favoriting(currently, quote.html(), !$('#favorite').hasClass('liked'))
  })
}

function search_for(search_text) {
  const result = []

  // Get quotes for the current mode
  let currentQuotes = getQuotesBySection(currently)

  console.log(
    `Searching for "${search_text}" in ${currently} mode. Found ${currentQuotes.length} quotes in this section.`
  )

  // Safety check - if no quotes found for current section, fall back to all quotes
  if (currentQuotes.length === 0) {
    console.warn(
      `No quotes found for section '${currently}', falling back to all quotes`
    )
    currentQuotes = [...ideas, ...quotes, ...questions]
  }

  // Search across multiple fields within the current mode
  for (const quote of currentQuotes) {
    try {
      const searchableText = [
        quote.intro ? quote.intro.toLowerCase() : '',
        quote.quote ? markdownToPlainText(quote.quote).toLowerCase() : '',
        quote.author ? quote.author.toLowerCase() : '',
        quote.explanation ? quote.explanation.toLowerCase() : '',
      ].join(' ')

      if (searchableText.includes(search_text)) {
        result.push(quote)
      }
    } catch (error) {
      console.warn('Error processing quote for search:', error, quote)
    }
  }

  if (result.length > 0) {
    console.log(`Found ${result.length} search results`)
    if (result.length > 1) {
      pushResults(result)
    } else if (result.length === 1) {
      displayQuote(result[0])
    }
  } else {
    console.log('No search results found')
    quote.html('No search matches, try different keywords')
    explanation.html('')
  }
}

function pushResults(results) {
  options = []
  $(results).each((index, value) => {
    options.push(`<a href='#' class='load-quote'>${value.intro}</a>`)
  })
  quote.html(options.join(''))
  author.html('')
  explanation.html('')
  loadQuoteListener()
}

function loadQuoteListener() {
  $('.load-quote').click((selected_search) => {
    const selectedIntro = $(selected_search.target).text()
    const result = [...ideas, ...quotes, ...questions].find(
      (quote) => quote.intro === selectedIntro
    )

    if (result) {
      displayQuote(result)
    }

    $('#search-icon').show()
    $('#search-and-exchange').hide()
    $('#search-wisdom-quotes').val('')
    console.log('Search interface closed')
  })
}

/**
 * Once a new tab is open initalize
 */
function newTab() {
  // Initialize refresh and footer element
  search = $('#search-wisdom-quotes')
  refresh = $('#refresh')
  quote = $('#quote')
  author = $('#author')
  explanation = $('#explanation')
  ideasSelect = $('#ideasSelect')
  quotesSelect = $('#quotesSelect')
  questionsSelect = $('#questionsSelect')

  chrome.storage.sync.get(['default', 'hideCount'], (item) => {
    if (item.default === 'quotes') {
      quotesSelect.toggleClass('selected-mode')
      setCurrently('quotes')
      setSearchPlaceholder()
    } else if (item.default === 'questions') {
      questionsSelect.toggleClass('selected-mode')
      setCurrently('questions')
      setSearchPlaceholder()
    } else {
      // Default to ideas
      ideasSelect.toggleClass('selected-mode')
      setCurrently('ideas')
      setSearchPlaceholder()
    }
    hideCount = item.hideCount || false
    if (hideCount) {
      $('#count').hide()
    }

    fadeIn(refresh)
    refreshDisplay()

    refresh.click(refreshDisplay)
    ideasSelect.click(() => {
      if (currently !== 'ideas') {
        setIdeas()
      }
    })
    quotesSelect.click(() => {
      if (currently !== 'quotes') {
        setQuotes()
      }
    })
    questionsSelect.click(() => {
      if (currently !== 'questions') {
        setQuestions()
      }
    })
  })
}

/**
 * Refresh content on page
 */
function refreshDisplay() {
  log('refreshDisplay')
  const filteredQuotes = getQuotesBySection(currently)
  if (filteredQuotes.length > 0) {
    displayQuote(getRandomFromArray(filteredQuotes))
  } else {
    // Fall back to all quotes if none found in current section
    const allQuotes = [...ideas, ...quotes, ...questions]
    if (allQuotes.length > 0) {
      displayQuote(getRandomFromArray(allQuotes))
    }
  }
  fadeIn(author)
  fadeIn(explanation)
}

function getQuotesBySection(section) {
  if (section === 'ideas') {
    return ideas.filter((q) => q.section === 'Ideas')
  }
  if (section === 'quotes') {
    return quotes.filter((q) => q.section === 'Quotes')
  }
  if (section === 'questions') {
    return questions.filter((q) => q.section === 'Questions')
  }
  return [...ideas, ...quotes, ...questions]
}

function setIdeas() {
  log('setIdeas')
  setCurrently('ideas')
  chrome.storage.sync.set({ default: 'ideas' })
  resetModeSelection()
  ideasSelect.toggleClass('selected-mode')
  refreshDisplay()
}

function setQuotes() {
  log('setQuotes')
  setCurrently('quotes')
  chrome.storage.sync.set({ default: 'quotes' })
  resetModeSelection()
  quotesSelect.toggleClass('selected-mode')
  refreshDisplay()
}

function setQuestions() {
  log('setQuestions')
  setCurrently('questions')
  chrome.storage.sync.set({ default: 'questions' })
  resetModeSelection()
  questionsSelect.toggleClass('selected-mode')
  refreshDisplay()
}

function resetModeSelection() {
  ideasSelect.removeClass('selected-mode')
  quotesSelect.removeClass('selected-mode')
  questionsSelect.removeClass('selected-mode')
}

function setCurrently(newCurrently) {
  currently = newCurrently
}

function setSearchPlaceholder() {
  const modeText =
    currently === 'ideas'
      ? 'ideas'
      : currently === 'quotes'
      ? 'quotes'
      : 'questions'
  $('#search-wisdom-quotes').attr('placeholder', `Search ${modeText}`)
}

function displayQuote(quoteData) {
  log('displayQuote')

  // Clear the quote container
  quote.html('')

  // Display the intro prominently
  quote.append(`<div class="quote-intro">${quoteData.intro}</div>`)

  // Only show explanation for Quotes section, positioned after intro
  if (quoteData.section === 'Quotes') {
    quote.append(
      `<div class="quote-explanation">${quoteData.explanation}</div>`
    )
  }

  // Display the main quote content with markdown parsing
  const formattedQuote = parseMarkdown(quoteData.quote)
  quote.append(`<div class="quote-content">${formattedQuote}</div>`)

  // Display author
  author.html(quoteData.author)

  // Display newsletter link with date on its own line
  if (quoteData.newsletter_link) {
    const [year, month, day] = quoteData.date.split('-')
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ]
    const date = `${monthNames[Number.parseInt(month) - 1]} ${Number.parseInt(
      day
    )}, ${year}`
    explanation.html(
      `<div class="newsletter-link"><a href="${quoteData.newsletter_link}" target="_blank">Newsletter • ${date}</a></div>`
    )
  } else {
    explanation.html('')
  }

  setSearchPlaceholder()
  viewed(currently, quoteData.id)
  check_favorite(currently, quoteData.id)
}
