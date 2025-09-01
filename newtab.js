/**
 *  Skylar Bolton - skylar.bolton@gmail.com
 *  Josh Bender   - jbendercode@gmail.com
 *  Last Updated  - 2021/04/11
 *  Updated for Clear Wisdom - 2024
 **/

const ideas = []
const quotes = []
const questions = []
// Removed currently variable - now using active filters
let search
let refresh
// Removed old mode switching elements - now using category filters

// Category filter state - will be loaded from storage
let activeFilters = {
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

// Load category filters from storage
function loadCategoryFilters() {
  chrome.storage.sync.get(['categoryFilters'], (result) => {
    if (result.categoryFilters) {
      activeFilters = { ...activeFilters, ...result.categoryFilters }
    }
    // Update UI to reflect loaded state
    updateFilterButtons()
  })
}

// Save category filters to storage
function saveCategoryFilters() {
  chrome.storage.sync.set({ categoryFilters: activeFilters })
}

// Update filter button UI to match current state
function updateFilterButtons() {
  $('#filter-ideas').toggleClass('active', activeFilters.ideas)
  $('#filter-quotes').toggleClass('active', activeFilters.quotes)
  $('#filter-questions').toggleClass('active', activeFilters.questions)
}

function loadClickListeners() {
  // Search icon click handler
  $('#search-icon').click(() => {
    const searchContainer = $('#search-container-top')
    const searchInput = $('#search-wisdom-quotes')

    if (searchContainer.hasClass('active')) {
      // If search is already active, hide it
      searchContainer.removeClass('active')
      searchInput.val('')
      // Clear any search results and restore normal display
      refreshDisplay()
    } else {
      // Show search container and focus input
      searchContainer.addClass('active')
      // Use setTimeout to ensure the transition completes before focusing
      setTimeout(() => {
        searchInput.focus()
      }, 150)
    }
  })

  // Close search when clicking outside
  $(document).click((e) => {
    const searchContainer = $('#search-container-top')

    if (
      !searchContainer.is(e.target) &&
      searchContainer.has(e.target).length === 0
    ) {
      searchContainer.removeClass('active')
      $('#search-wisdom-quotes').val('')
      refreshDisplay()
    }
  })

  $('#search-wisdom-quotes').keyup(() => {
    const search_text = $('#search-wisdom-quotes').val().trim().toLowerCase()
    if (search_text.length >= 3) {
      search_for(search_text)
    } else if (search_text.length === 0) {
      // If search is cleared, restore the current display
      refreshDisplay()
    } else if (search_text.length === 1 || search_text.length === 2) {
      // Show helpful message for 1-2 characters
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

  // Handle Escape key to close search
  $(document).keydown((e) => {
    if (e.key === 'Escape') {
      const searchContainer = $('#search-container-top')
      if (searchContainer.hasClass('active')) {
        searchContainer.removeClass('active')
        $('#search-wisdom-quotes').val('')
        refreshDisplay()
      }
    }
  })

  $('#favorite').click(() => {
    // Get the current content ID from the displayed content
    const currentContentId = mainContent.attr('data-content-id') || ''
    if (currentContentId) {
      // Determine category from the current content
      const category = getCurrentContentCategory()
      is_favoriting(
        category,
        currentContentId,
        !$('#favorite').hasClass('liked')
      )
    }
  })

  // Category filter button handlers
  $('#filter-ideas').click(() => {
    activeFilters.ideas = !activeFilters.ideas
    $('#filter-ideas').toggleClass('active', activeFilters.ideas)
    saveCategoryFilters() // Save state to storage
    // Re-run search if there's active search text, otherwise refresh display
    const searchText = $('#search-wisdom-quotes').val().trim().toLowerCase()
    if (searchText.length >= 3) {
      search_for(searchText)
    } else {
      refreshDisplay()
    }
  })

  $('#filter-quotes').click(() => {
    activeFilters.quotes = !activeFilters.quotes
    $('#filter-quotes').toggleClass('active', activeFilters.quotes)
    saveCategoryFilters() // Save state to storage
    // Re-run search if there's active search text, otherwise refresh display
    const searchText = $('#search-wisdom-quotes').val().trim().toLowerCase()
    if (searchText.length >= 3) {
      search_for(searchText)
    } else {
      refreshDisplay()
    }
  })

  $('#filter-questions').click(() => {
    activeFilters.questions = !activeFilters.questions
    $('#filter-questions').toggleClass('active', activeFilters.questions)
    saveCategoryFilters() // Save state to storage
    // Re-run search if there's active search text, otherwise refresh display
    const searchText = $('#search-wisdom-quotes').val().trim().toLowerCase()
    if (searchText.length >= 3) {
      search_for(searchText)
    } else {
      refreshDisplay()
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
  // Removed old mode switching element references

  // Initialize content display elements
  introHeading = $('#intro-heading')
  dateDisplay = $('#date-display')
  explanationBox = $('#explanation-box')
  mainContent = $('#main-content')
  authorAttribution = $('#author-attribution')
  newsletterLink = $('#newsletter-link')

  // Load saved preferences and category filters
  chrome.storage.sync.get(['default'], (result) => {
    // Note: default preference is no longer used since we use category filters

    setSearchPlaceholder()
    hideCount = false
    if (hideCount) {
      $('#count').hide()
    }

    // Load category filters from storage
    loadCategoryFilters()

    fadeIn(refresh)
    refreshDisplay()

    refresh.click(refreshDisplay)
  })
}

/**
 * Refresh content on page
 */
function refreshDisplay() {
  log('refreshDisplay')

  // Build content array based on active filters
  const allContent = []
  if (activeFilters.ideas) allContent.push(...ideas)
  if (activeFilters.quotes) allContent.push(...quotes)
  if (activeFilters.questions) allContent.push(...questions)

  if (allContent.length > 0) {
    displayContent(getRandomFromArray(allContent))
  } else {
    // Fall back to all content if no filters are active
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

// Removed getQuotesBySection function - now using active filters directly

// Removed old mode switching functions - now using category filters

// Removed setCurrently function - no longer needed

function setSearchPlaceholder() {
  $('#search-wisdom-quotes').attr('placeholder', 'Search all wisdom content')
}

function displayContent(contentData) {
  log('displayContent')

  // Clear all content elements
  clearContentDisplay()

  // Store content ID and category for favorites functionality
  mainContent.attr('data-content-id', contentData.id)
  mainContent.attr(
    'data-content-category',
    contentData.section?.toLowerCase() || 'ideas'
  )

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
    // Get the first three words of the quote for text fragment directive
    let textFragment = ''
    if (contentData.quote?.trim()) {
      const words = contentData.quote.trim().split(/\s+/)
      const firstThreeWords = words.slice(0, 3).join(' ')
      if (firstThreeWords) {
        // Use URL Fragment Text Directives: #:~:text=text_to_highlight
        textFragment = `#:~:text=${encodeURIComponent(firstThreeWords)}`
      }
    }

    newsletterLink.html(
      `<a href="${contentData.newsletter_link}${textFragment}" target="_blank">Read Full Newsletter →</a>`
    )
  }

  setSearchPlaceholder()
  // Determine category from content section for favorites and viewed tracking
  const category = contentData.section?.toLowerCase() || 'ideas'
  viewed(category, contentData.id)
  check_favorite(category, contentData.id)
}

function getCurrentContentCategory() {
  return mainContent.attr('data-content-category') || 'ideas'
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
