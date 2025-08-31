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
let search
let refresh
let ideasSelect
let quotesSelect
let questionsSelect

// Category filter state
const activeFilters = {
  ideas: true,
  quotes: true,
  questions: true,
}

// Content display elements
let introHeading
let dateDisplay
let explanationBox
let mainContent
let authorAttribution
let newsletterLink

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
  $('#search-wisdom-quotes').keyup(() => {
    const search_text = $('#search-wisdom-quotes').val().trim().toLowerCase()
    if (search_text.length >= 3) {
      search_for(search_text)
    } else if (search_text.length === 0) {
      // If search is cleared, restore the current display
      $('#search-category-filters').hide()
      refreshDisplay()
    } else if (search_text.length === 1 || search_text.length === 2) {
      // Show helpful message for 1-2 characters
      $('#search-category-filters').hide()
      showSearchHint(search_text.length)
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
    is_favoriting(
      currently,
      mainContent.html(),
      !$('#favorite').hasClass('liked')
    )
  })

  // Category filter button handlers
  $('#filter-ideas').click(() => {
    activeFilters.ideas = !activeFilters.ideas
    $('#filter-ideas').toggleClass('active', activeFilters.ideas)
    // Re-run search if there's active search text
    const searchText = $('#search-wisdom-quotes').val().trim().toLowerCase()
    if (searchText.length >= 3) {
      search_for(searchText)
    }
  })

  $('#filter-quotes').click(() => {
    activeFilters.quotes = !activeFilters.quotes
    $('#filter-quotes').toggleClass('active', activeFilters.quotes)
    // Re-run search if there's active search text
    const searchText = $('#search-wisdom-quotes').val().trim().toLowerCase()
    if (searchText.length >= 3) {
      search_for(searchText)
    }
  })

  $('#filter-questions').click(() => {
    activeFilters.questions = !activeFilters.questions
    $('#filter-questions').toggleClass('active', activeFilters.questions)
    // Re-run search if there's active search text
    const searchText = $('#search-wisdom-quotes').val().trim().toLowerCase()
    if (searchText.length >= 3) {
      search_for(searchText)
    }
  })
}

function hasActiveFilters() {
  return activeFilters.ideas || activeFilters.quotes || activeFilters.questions
}

function search_for(search_text) {
  const result = []

  // Check if any filters are active
  if (!hasActiveFilters()) {
    // No filters active, show message
    displayNoFiltersMessage()
    return
  }

  // Build content array based on active filters
  const allContent = []
  if (activeFilters.ideas) allContent.push(...ideas)
  if (activeFilters.quotes) allContent.push(...quotes)
  if (activeFilters.questions) allContent.push(...questions)

  console.log(
    `Searching for "${search_text}" in active categories. Found ${allContent.length} total items.`
  )

  // Search through filtered content
  for (const item of allContent) {
    const searchableText = [
      item.intro?.toLowerCase() || '',
      item.quote?.toLowerCase() || '',
      item.explanation?.toLowerCase() || '',
      item.author?.toLowerCase() || '',
    ].join(' ')

    if (searchableText.includes(search_text)) {
      result.push(item)
    }
  }

  if (result.length > 0) {
    // Display search results
    displaySearchResults(result)
  } else {
    // No results found
    displayNoResults(search_text)
  }
}

function displaySearchResults(results) {
  // Clear current display
  clearContentDisplay()

  // Show category filters when there are results
  $('#search-category-filters').show()

  // Hide elements that aren't needed for search results
  explanationBox.hide()
  authorAttribution.hide()
  newsletterLink.hide()

  // Show search results header
  introHeading.html(
    `Found ${results.length} result${results.length > 1 ? 's' : ''} for "${$(
      '#search-wisdom-quotes'
    )
      .val()
      .trim()}"`
  )

  // Display all results in a list format with category labels
  let resultsHtml = '<div class="search-results">'

  results.forEach((item, index) => {
    const category = getCategoryLabel(item)
    const previewText = getPreviewText(item)

    resultsHtml += `
      <div class="search-result-item" data-index="${index}">
        <div class="search-result-category">${category}</div>
        <div class="search-result-content">
          <div class="search-result-intro">${item.intro || ''}</div>
          <div class="search-result-preview">${previewText}</div>
        </div>
      </div>
    `
  })

  resultsHtml += '</div>'

  mainContent.html(resultsHtml)

  // Add click listeners to search result items
  $('.search-result-item').click(function () {
    const index = Number.parseInt($(this).data('index'))
    const selectedItem = results[index]
    displayContent(selectedItem)
  })
}

function getCategoryLabel(item) {
  if (item.section === 'Ideas') return 'Idea'
  if (item.section === 'Quotes') return 'Quote'
  if (item.section === 'Questions') return 'Question'
  return 'Content'
}

function getPreviewText(item) {
  // Get a preview of the main content
  if (item.quote) {
    return item.quote.length > 100
      ? `${item.quote.substring(0, 100)}...`
      : item.quote
  }
  if (item.explanation) {
    return item.explanation.length > 100
      ? `${item.explanation.substring(0, 100)}...`
      : item.explanation
  }
  return item.intro || 'No preview available'
}

function displayNoFiltersMessage() {
  // Clear current display
  clearContentDisplay()

  // Hide elements that aren't needed for this message
  explanationBox.hide()
  authorAttribution.hide()
  newsletterLink.hide()

  // Show message
  introHeading.html('No categories selected')
  mainContent.html(`
    <div class="search-hint">
      <p>Please enable at least one category filter to search.</p>
    </div>
  `)
}

function displayNoResults(searchText) {
  // Clear current display
  clearContentDisplay()

  introHeading.html(`No matches found for "${searchText}"`)
  mainContent.html('Try adjusting your search terms or browse all content.')
}

function clearContentDisplay() {
  introHeading.html('')
  dateDisplay.html('')
  explanationBox.html('')
  mainContent.html('')
  authorAttribution.html('')
  newsletterLink.html('')
}

function newTab() {
  // Initialize DOM element references
  search = $('#search-wisdom-quotes')
  refresh = $('#refresh')
  ideasSelect = $('#ideasSelect')
  quotesSelect = $('#quotesSelect')
  questionsSelect = $('#questionsSelect')

  // Initialize content display elements
  introHeading = $('#intro-heading')
  dateDisplay = $('#date-display')
  explanationBox = $('#explanation-box')
  mainContent = $('#main-content')
  authorAttribution = $('#author-attribution')
  newsletterLink = $('#newsletter-link')

  // Load saved preferences
  chrome.storage.sync.get(['default'], (result) => {
    if (result.default) {
      currently = result.default
    }

    // Set initial mode selection
    if (currently === 'ideas') {
      ideasSelect.addClass('selected-mode')
    } else if (currently === 'quotes') {
      quotesSelect.addClass('selected-mode')
    } else if (currently === 'questions') {
      questionsSelect.addClass('selected-mode')
    }

    setSearchPlaceholder()
    hideCount = false
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
    displayContent(getRandomFromArray(filteredQuotes))
  } else {
    // Fall back to all quotes if none found in current section
    const allQuotes = [...ideas, ...quotes, ...questions]
    if (allQuotes.length > 0) {
      displayContent(getRandomFromArray(allQuotes))
    }
  }

  // Fade in content elements (author will be shown/hidden by displayContent)
  fadeIn(introHeading)
  fadeIn(dateDisplay)
  fadeIn(explanationBox)
  fadeIn(mainContent)
  fadeIn(newsletterLink)
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
  $('#search-wisdom-quotes').attr('placeholder', 'Search all wisdom content')
}

function displayContent(contentData) {
  log('displayContent')

  // Clear all content elements
  clearContentDisplay()

  // Show elements that might have been hidden during search
  explanationBox.show()
  authorAttribution.show()
  newsletterLink.show()

  // Display intro heading
  if (contentData.intro?.trim()) {
    introHeading.html(contentData.intro)
  }

  // Display date
  if (contentData.date?.trim()) {
    const [year, month, day] = contentData.date.split('-')
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
    const formattedDate = `${
      monthNames[Number.parseInt(month) - 1]
    } ${Number.parseInt(day)}, ${year}`
    dateDisplay.html(formattedDate)
  }

  // Display explanation for all content types
  if (contentData.explanation?.trim()) {
    explanationBox.html(contentData.explanation)
  }

  // Display main content with markdown parsing
  if (contentData.quote?.trim()) {
    const formattedContent = parseMarkdown(contentData.quote)
    mainContent.html(formattedContent)
  }

  // Display author only for Quotes section
  if (contentData.section === 'Quotes' && contentData.author?.trim()) {
    authorAttribution.html(contentData.author)
    authorAttribution.show()
  } else {
    authorAttribution.hide()
  }

  // Display newsletter link
  if (contentData.newsletter_link?.trim()) {
    newsletterLink.html(
      `<a href="${contentData.newsletter_link}" target="_blank">Read Full Newsletter →</a>`
    )
  }

  setSearchPlaceholder()
  viewed(currently, contentData.id)
  check_favorite(currently, contentData.id)
}

function showSearchHint(charCount) {
  // Clear current display
  clearContentDisplay()

  // Hide elements that aren't needed for search hints
  explanationBox.hide()
  authorAttribution.hide()
  newsletterLink.hide()

  // Show helpful message
  introHeading.html('Type to search')
  mainContent.html(`
    <div class="search-hint">
      <p>Please type at least 3 characters to search through wisdom content.</p>
      <p class="search-progress">${charCount}/3 characters</p>
    </div>
  `)
}
