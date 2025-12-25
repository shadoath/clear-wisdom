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

// MiniSearch instance (loaded from /lib/minisearch.min.js)
let miniSearch = null
let searchDocsById = new Map()

// Search personalization state (loaded from chrome.storage)
let favoriteIds = new Set()
let viewCountsById = new Map()

// Debounced search function
let searchTimeout = null

// Content display elements
let introHeading
let dateDisplay
let explanationBox
let mainContent
let authorAttribution
let newsletterLink

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
    loadSearchSignals(() => {
      initializeMiniSearch()
    })
    newTab()
  })
  loadClickListeners()

  // Listen for storage changes to update count visibility
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.hideCount) {
      updateCountVisibility()
    }
    // Keep favorites-first ranking up to date when favorites change.
    if (namespace === 'sync') {
      const changedKeys = Object.keys(changes || {})
      if (changedKeys.some((k) => k.includes('_fav_'))) {
        loadSearchSignals(() => {
          const searchContainer = $('#search-container-top')
          const searchText = $('#search-wisdom-quotes').val().trim()
          if (searchContainer.hasClass('active') && searchText.length >= 3) {
            search_for(searchText)
          }
        })
      }
    }
  })
})

function loadSearchSignals(done) {
  // Load favorites + view counts once at startup, for ranking.
  chrome.storage.sync.get(null, (all) => {
    favoriteIds = new Set()
    viewCountsById = new Map()

    for (const [key, value] of Object.entries(all || {})) {
      if (key.includes('_fav_') && typeof value === 'string') {
        try {
          const obj = JSON.parse(value)
          for (const [id, liked] of Object.entries(obj)) {
            if (liked) favoriteIds.add(id)
          }
        } catch (_) {
          // ignore malformed
        }
      }
      if (key.includes('_count_') && typeof value === 'string') {
        try {
          const obj = JSON.parse(value)
          for (const [id, count] of Object.entries(obj)) {
            const num = Number.parseInt(count, 10)
            if (!Number.isNaN(num)) viewCountsById.set(id, num)
          }
        } catch (_) {
          // ignore malformed
        }
      }
    }

    done?.()
  })
}

// Load category filters from storage
function loadCategoryFilters() {
  chrome.storage.sync.get(['categoryFilters'], (result) => {
    if (result.categoryFilters) {
      activeFilters = { ...activeFilters, ...result.categoryFilters }
    }
    // Update UI to reflect loaded state
    updateFilterButtons()
    setSearchPlaceholder() // Update placeholder based on loaded filter state
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

// Update count visibility based on hideCount setting
function updateCountVisibility() {
  chrome.storage.sync.get(['hideCount'], (result) => {
    if (result.hideCount) {
      $('#count').hide()
    } else {
      $('#count').show()
    }
  })
}

function loadClickListeners() {
  // Search icon click handler
  $('#search-icon').click(() => {
    const searchContainer = $('#search-container-top')
    const searchInput = $('#search-wisdom-quotes')

    if (searchContainer.hasClass('active')) {
      // If search is already active, hide it
      searchContainer.removeClass('active')
      $('body').removeClass('search-mode')
      searchInput.val('')
      // Clear any search results and restore normal display
      refreshDisplay()
    } else {
      // Show search container and focus input
      searchContainer.addClass('active')
      $('body').addClass('search-mode')
      // Use setTimeout to ensure the transition completes before focusing
      setTimeout(() => {
        searchInput.focus()
      }, 150)
    }
  })

  $('#search-wisdom-quotes').keyup(() => {
    const search_text = $('#search-wisdom-quotes').val().trim()

    // Clear previous timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout)
    }

    if (search_text.length >= 3) {
      // Debounce search for better performance
      searchTimeout = setTimeout(() => {
        search_for(search_text)
      }, 300)
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
      const search_text = $('#search-wisdom-quotes').val().trim()
      if (search_text.length > 0) {
        search_for(search_text)
      }
    }
  })

  // Handle Escape key to close search and arrow keys for navigation
  $(document).keydown((e) => {
    // Slash focuses search (unless you are already typing in an input)
    if (e.key === '/' && !isTypingInInput(e)) {
      e.preventDefault()
      $('#search-container-top').addClass('active')
      $('body').addClass('search-mode')
      $('#search-wisdom-quotes').focus()
    }

    if (e.key === 'Escape') {
      const searchContainer = $('#search-container-top')
      if (searchContainer.hasClass('active')) {
        const searchInput = $('#search-wisdom-quotes')
        const current = searchInput.val().trim()
        if (current.length > 0) {
          // First Esc clears query but stays in full-page search mode.
          searchInput.val('')
          refreshDisplay()
        } else {
          // Second Esc exits search mode.
          searchContainer.removeClass('active')
          $('body').removeClass('search-mode')
          refreshDisplay()
        }
      }
    }

    // Arrow key navigation for search results
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const searchContainer = $('#search-container-top')
      if (
        searchContainer.hasClass('active') &&
        window.currentSearchResults?.length > 0
      ) {
        e.preventDefault()
        navigateSearchResults(e.key === 'ArrowDown' ? 1 : -1)
      }
    }

    // Enter key to select highlighted search result
    if (e.key === 'Enter' && window.currentSearchResults?.length > 0) {
      const highlightedResult = $('.search-result-item.highlighted')
      if (highlightedResult.length > 0) {
        e.preventDefault()
        highlightedResult.click()
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
    setSearchPlaceholder() // Update placeholder based on new filter state
    // Re-run search if there's active search text, otherwise refresh display
    const searchText = $('#search-wisdom-quotes').val().trim()
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
    setSearchPlaceholder() // Update placeholder based on new filter state
    // Re-run search if there's active search text, otherwise refresh display
    const searchText = $('#search-wisdom-quotes').val().trim()
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
    setSearchPlaceholder() // Update placeholder based on new filter state
    // Re-run search if there's active search text, otherwise refresh display
    const searchText = $('#search-wisdom-quotes').val().trim()
    if (searchText.length >= 3) {
      search_for(searchText)
    } else {
      refreshDisplay()
    }
  })
}

function initializeMiniSearch() {
  if (typeof window.MiniSearch !== 'function') {
    console.error('MiniSearch not available')
    return
  }

  const allItems = [...ideas, ...quotes, ...questions]

  const docs = allItems.map((item) => {
    return {
      id: item.id,
      quote: item.quote ? markdownToPlainText(item.quote) : '',
      intro: item.intro || '',
      explanation: item.explanation || '',
      author: item.author || '',
      date: item.date || '',
      section: item.section || '',
    }
  })

  searchDocsById = new Map()
  for (const d of docs) searchDocsById.set(d.id, d)

  miniSearch = new window.MiniSearch({
    idField: 'id',
    fields: ['quote', 'intro', 'explanation', 'author', 'section', 'date'],
    storeFields: [
      'id',
      'section',
      'date',
      'intro',
      'quote',
      'author',
      'explanation',
    ],
  })
  miniSearch.addAll(docs)
}

function hasActiveFilters() {
  return activeFilters.ideas || activeFilters.quotes || activeFilters.questions
}

function search_for(search_text) {
  // Check if any filters are active
  if (!hasActiveFilters()) {
    // No filters active, show message
    displayNoFiltersMessage()
    return
  }

  if (!miniSearch) {
    initializeMiniSearch()
  }

  if (!miniSearch) {
    console.error('MiniSearch not initialized')
    return
  }

  // Search index (returns [{ id, score, storedFields }...])
  const rawResults = miniSearch.search(search_text, { limit: 80 })

  const mapped = rawResults
    .map((r) => {
      const doc = searchDocsById.get(r.id)
      if (!doc) return null
      return {
        ...doc,
        _score: r.score || 0,
        _isFavorite: favoriteIds.has(doc.id),
        _viewCount: viewCountsById.get(doc.id) || 0,
      }
    })
    .filter(Boolean)

  // Apply category filters
  const filtered = mapped.filter((item) => {
    if (item.section === 'Ideas') return activeFilters.ideas
    if (item.section === 'Quotes') return activeFilters.quotes
    if (item.section === 'Questions') return activeFilters.questions
    return true
  })

  // Favorites-first ranking, then textual relevance, then recency.
  const favorites = filtered.filter((x) => x._isFavorite)
  const nonFavorites = filtered.filter((x) => !x._isFavorite)

  const byScoreThenDate = (a, b) => {
    if (b._score !== a._score) return b._score - a._score
    if (b.date !== a.date) return String(b.date).localeCompare(String(a.date))
    return 0
  }

  favorites.sort(byScoreThenDate)
  nonFavorites.sort(byScoreThenDate)

  const result = [...favorites, ...nonFavorites].slice(0, 50)

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

  const favoritesCount = results.filter((r) => r._isFavorite).length
  if (favoritesCount > 0) {
    resultsHtml += `<div class="search-results-section-title">Favorites</div>`
  }

  results.forEach((item, index) => {
    if (favoritesCount > 0 && index === favoritesCount) {
      resultsHtml += `<div class="search-results-section-title">All results</div>`
    }
    const category = getCategoryLabel(item)
    const searchTerm = $('#search-wisdom-quotes').val().trim()
    const previewText = getSearchPreviewText(item, searchTerm)

    const favoriteBadge = item._isFavorite
      ? `<div class="search-result-favorite">★ Favorite</div>`
      : ''

    // Highlight search terms in preview text
    const highlightedPreview = highlightSearchTerms(previewText, searchTerm)

    // Format newsletter date as YYYY-MM-DD
    const formattedDate = item.date?.trim() || ''

    resultsHtml += `
      <div class="search-result-item" data-index="${index}" data-item-id="${
      item.id || ''
    }" data-item-section="${item.section || ''}">
        <div class="search-result-header">
          <div class="search-result-category">${category}</div>
          ${
            formattedDate
              ? `<div class="search-result-date">${formattedDate}</div>`
              : ''
          }
        </div>
        <div class="search-result-content">
          <div class="search-result-intro">${item.intro || ''}</div>
          <div class="search-result-preview">${highlightedPreview}</div>
          ${favoriteBadge}
        </div>
      </div>
    `
  })

  resultsHtml += '</div>'

  mainContent.html(resultsHtml)

  // Store results in a global variable for click handlers to access
  window.currentSearchResults = results

  // Add click listeners to search result items with improved error handling
  $('.search-result-item').click(function (e) {
    // Prevent event bubbling to avoid triggering the "click outside" handler
    e.stopPropagation()

    const index = Number.parseInt($(this).data('index'))
    const itemId = $(this).data('item-id')
    const itemSection = $(this).data('item-section')

    // First try to get from global variable
    if (window.currentSearchResults?.[index]) {
      const selectedItem = window.currentSearchResults[index]

      if (selectedItem?.id) {
        displayContent(selectedItem)
        $('#search-container-top').removeClass('active')
        $('body').removeClass('search-mode')
        $('#search-wisdom-quotes').val('')
        return
      }
    }

    // Fallback: find by ID in original arrays
    if (itemId) {
      const foundItem = findItemById(itemId)
      if (foundItem) {
        displayContent(foundItem)
        $('#search-container-top').removeClass('active')
        $('body').removeClass('search-mode')
        $('#search-wisdom-quotes').val('')
        return
      }
    }
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

function getSearchPreviewText(item, searchTerm) {
  const haystack =
    item.quote?.trim() ||
    item.explanation?.trim() ||
    item.intro?.trim() ||
    ''
  if (!haystack) return 'No preview available'

  const q = (searchTerm || '').trim().toLowerCase()
  if (!q) return getPreviewText(item)

  const idx = haystack.toLowerCase().indexOf(q)
  if (idx === -1) return getPreviewText(item)

  const windowSize = 140
  const start = Math.max(0, idx - Math.floor(windowSize / 3))
  const end = Math.min(haystack.length, start + windowSize)
  const prefix = start > 0 ? '…' : ''
  const suffix = end < haystack.length ? '…' : ''
  return `${prefix}${haystack.substring(start, end)}${suffix}`
}

function highlightSearchTerms(text, searchTerm) {
  if (!searchTerm || !text) return text

  // Create a case-insensitive regex to match search terms
  const regex = new RegExp(
    `(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`,
    'gi'
  )

  // Replace matches with highlighted version
  return text.replace(regex, '<mark class="search-highlight">$1</mark>')
}

function highlightFuzzyMatches(text, searchTerm, matches) {
  if (!searchTerm || !text || !matches) return text

  // For now, just use the regular highlighting
  // In the future, we could use index match info to highlight fuzzy matches
  return highlightSearchTerms(text, searchTerm)
}

function navigateSearchResults(direction) {
  const currentHighlighted = $('.search-result-item.highlighted')
  const allResults = $('.search-result-item')

  if (allResults.length === 0) return

  let nextIndex = 0

  if (currentHighlighted.length > 0) {
    const currentIndex = allResults.index(currentHighlighted)
    nextIndex =
      (currentIndex + direction + allResults.length) % allResults.length
  }

  // Remove current highlight and add to new item
  currentHighlighted.removeClass('highlighted')
  allResults.eq(nextIndex).addClass('highlighted')

  // Scroll to highlighted item
  const highlightedItem = allResults.eq(nextIndex)
  const container = $('.search-results')
  const itemTop = highlightedItem.position().top
  const containerHeight = container.height()

  container.scrollTop(container.scrollTop() + itemTop - containerHeight / 2)
}

function findItemById(itemId) {
  // Search through all content arrays to find the item by ID
  const allItems = [...ideas, ...quotes, ...questions]
  return allItems.find((item) => item.id === itemId)
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
  chrome.storage.sync.get(['default', 'hideCount'], (result) => {
    // Note: default preference is no longer used since we use category filters

    setSearchPlaceholder()
    hideCount = result.hideCount || false
    updateCountVisibility()

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

  // In full-page search mode, refresh drives search UI (not random content).
  const searchContainer = $('#search-container-top')
  const searchText = $('#search-wisdom-quotes').val().trim()
  if (searchContainer.hasClass('active')) {
    if (searchText.length >= 3) {
      search_for(searchText)
    } else if (searchText.length === 0) {
      showSearchHint(0)
    } else {
      showSearchHint(searchText.length)
    }
    return
  }

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
}

// Removed getQuotesBySection function - now using active filters directly

// Removed old mode switching functions - now using category filters

// Removed setCurrently function - no longer needed

function setSearchPlaceholder() {
  // Build placeholder text based on active filters
  const activeCategories = []
  if (activeFilters.ideas) activeCategories.push('ideas')
  if (activeFilters.quotes) activeCategories.push('quotes')
  if (activeFilters.questions) activeCategories.push('questions')

  let placeholder = 'Search '
  if (activeCategories.length === 0) {
    placeholder += 'all wisdom content'
  } else if (activeCategories.length === 3) {
    placeholder += 'all wisdom content'
  } else if (activeCategories.length === 1) {
    placeholder += activeCategories[0]
  } else {
    placeholder += activeCategories.join(' and ')
  }

  $('#search-wisdom-quotes').attr('placeholder', placeholder)
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

  // Display intro heading with newsletter link if available
  if (contentData.intro?.trim()) {
    let introContent = contentData.intro

    // Make the entire intro text a link if newsletter link is available
    if (contentData.newsletter_link?.trim()) {
      // Get the first three words of the quote for text fragment directive
      let textFragment = ''
      if (contentData.quote?.trim()) {
        // Convert markdown to plain text first
        const plainTextQuote = markdownToPlainText(contentData.quote)
        const words = plainTextQuote.trim().split(/\s+/)
        const firstThreeWords = words.slice(0, 3).join(' ')
        if (firstThreeWords) {
          // Use URL Fragment Text Directives: #:~:text=text_to_highlight
          textFragment = `#:~:text=${encodeURIComponent(firstThreeWords)}`
        }
      }

      introContent = `<a href="${contentData.newsletter_link}${textFragment}" target="_blank" class="newsletter-link-inline">${introContent}</a>`
    }

    introHeading.html(introContent)

    // Add event handler for newsletter links to prevent bubbling
    if (contentData.newsletter_link?.trim()) {
      introHeading.find('.newsletter-link-inline').click((e) => {
        e.stopPropagation()
      })
    }
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

    // Make date link to newsletter if newsletter link exists
    if (contentData.newsletter_link?.trim()) {
      dateDisplay.html(
        `<a href="${contentData.newsletter_link}" target="_blank" class="newsletter-link-inline">${formattedDate}</a>`
      )
    } else {
      dateDisplay.html(formattedDate)
    }
  }

  // Display explanation for all content types
  if (contentData.explanation?.trim()) {
    explanationBox.html(contentData.explanation)
  }

  // Display main content with markdown parsing
  if (contentData.quote?.trim()) {
    const formattedContent = parseMarkdown(contentData.quote)
    mainContent.html(formattedContent)

    // Check if content is scrollable after rendering
    setTimeout(() => {
      checkContentScrollable()
    }, 100)
  }

  // Display author only for Quotes section (compact version), but hide if author is James Clear
  if (
    contentData.section === 'Quotes' &&
    contentData.author?.trim() &&
    contentData.author !== 'James Clear'
  ) {
    authorAttribution.html(`— ${contentData.author}`)
    authorAttribution.show()
  } else {
    authorAttribution.hide()
  }

  // Hide newsletter link since it's now in the intro heading
  newsletterLink.hide()

  setSearchPlaceholder()
  // Determine category from content section for favorites and viewed tracking
  const category = contentData.section?.toLowerCase() || 'ideas'
  viewed(category, contentData.id)
  check_favorite(category, contentData.id)
}

function getCurrentContentCategory() {
  return mainContent.attr('data-content-category') || 'ideas'
}

function checkContentScrollable() {
  const contentElement = mainContent[0]
  if (contentElement) {
    const isScrollable =
      contentElement.scrollHeight > contentElement.clientHeight
    if (isScrollable) {
      mainContent.addClass('scrollable')
    } else {
      mainContent.removeClass('scrollable')
    }
  }
}

function showSearchHint(charCount) {
  // Clear current display
  clearContentDisplay()

  // Hide elements that aren't needed for search hints
  explanationBox.hide()
  authorAttribution.hide()
  newsletterLink.hide()

  // Show helpful message with search suggestions
  introHeading.html('Type to search')

  const suggestions = [
    'habits',
    'goals',
    'productivity',
    'mindset',
    'success',
    'motivation',
    'learning',
    'growth',
    'focus',
    'discipline',
  ]

  const suggestionsHtml = suggestions
    .slice(0, 5)
    .map((suggestion) => `<span class="search-suggestion">${suggestion}</span>`)
    .join('')

  mainContent.html(`
    <div class="search-hint">
      <p>Please type at least 3 characters to search through wisdom content.</p>
      <p class="search-progress">${Math.min(charCount, 3)}/3 characters</p>
      <div class="search-suggestions">
        <p>Try searching for:</p>
        <div class="suggestion-tags">${suggestionsHtml}</div>
      </div>
    </div>
  `)

  // Add click handlers to suggestions
  $('.search-suggestion').click(function (e) {
    // Prevent event bubbling
    e.stopPropagation()

    const suggestion = $(this).text()
    $('#search-wisdom-quotes').val(suggestion)
    search_for(suggestion)
  })
}

function isTypingInInput(e) {
  const target = e?.target
  if (!target) return false
  const tag = (target.tagName || '').toLowerCase()
  return tag === 'input' || tag === 'textarea' || target.isContentEditable
}
