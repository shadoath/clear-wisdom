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

// Fuse.js search instance
let fuseInstance = null

// Debounced search function
let searchTimeout = null

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
    initializeFuseSearch()
    newTab()
  })
  loadClickListeners()

  // Listen for storage changes to update count visibility
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.hideCount) {
      updateCountVisibility()
    }
  })
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
      // Only refresh display if we were showing search results
      if (window.currentSearchResults) {
        refreshDisplay()
      }
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
    if (e.key === 'Escape') {
      const searchContainer = $('#search-container-top')
      if (searchContainer.hasClass('active')) {
        searchContainer.removeClass('active')
        $('#search-wisdom-quotes').val('')
        refreshDisplay()
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
    // Reinitialize Fuse.js with new filter state
    fuseInstance = null
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
    // Reinitialize Fuse.js with new filter state
    fuseInstance = null
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
    // Reinitialize Fuse.js with new filter state
    fuseInstance = null
    // Re-run search if there's active search text, otherwise refresh display
    const searchText = $('#search-wisdom-quotes').val().trim()
    if (searchText.length >= 3) {
      search_for(searchText)
    } else {
      refreshDisplay()
    }
  })
}

function initializeFuseSearch() {
  // Build content array based on active filters
  const allContent = []
  if (activeFilters.ideas) allContent.push(...ideas)
  if (activeFilters.quotes) allContent.push(...quotes)
  if (activeFilters.questions) allContent.push(...questions)

  // Create a clean version of content for search (with markdown stripped from quotes)
  const searchContent = allContent.map((item) => {
    const cleanItem = { ...item }
    if (cleanItem.quote) {
      // Strip markdown from quote content for better search
      cleanItem.quote = markdownToPlainText(cleanItem.quote)
    }
    return cleanItem
  })

  // Configure Fuse.js options for better search
  const fuseOptions = {
    keys: [
      { name: 'quote', weight: 0.5 },
      { name: 'author', weight: 0.4 },
      { name: 'intro', weight: 0.3 },
      { name: 'explanation', weight: 0.2 },
    ],
    threshold: 0.3, // Slightly more lenient to catch more matches
    distance: 200, // Allow more distance between characters for longer content
    includeScore: true, // Include relevance scores
    includeMatches: true, // Include match information for highlighting
    minMatchCharLength: 3, // Lower minimum to catch shorter words
    shouldSort: true, // Sort by relevance
    findAllMatches: true, // Find all matches, not just the first one
    location: 0, // Start searching from the beginning
    ignoreLocation: true, // Don't prioritize matches at the beginning
  }

  // Initialize Fuse.js instance with clean content
  fuseInstance = new Fuse(searchContent, fuseOptions)
  console.log(
    'Fuse.js initialized with',
    searchContent.length,
    'items (markdown stripped from quotes)'
  )
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

  // Initialize Fuse.js if not already done
  if (!fuseInstance) {
    initializeFuseSearch()
  }

  if (!fuseInstance) {
    console.error('Fuse.js not initialized')
    return
  }

  console.log(`Searching for "${search_text}" using Fuse.js`)

  // Perform fuzzy search
  const searchResults = fuseInstance.search(search_text, {
    limit: 20, // Limit results for better performance
  })

  console.log('Fuse.js search results:', searchResults)

  // Extract the actual items from Fuse.js results and add match info
  const result = searchResults.map((item) => {
    const resultItem = { ...item.item }
    resultItem._fuseMatches = item.matches // Store match information
    resultItem._fuseScore = item.score // Store relevance score
    return resultItem
  })

  console.log('Extracted items:', result)

  // Debug: Show what content is being searched
  result.forEach((item, index) => {
    console.log(`Result ${index + 1}:`, {
      id: item.id,
      intro: item.intro,
      quote: item.quote?.substring(0, 100) + '...',
      explanation: item.explanation?.substring(0, 100) + '...',
      author: item.author,
      matches: item._fuseMatches,
      score: item._fuseScore,
    })
  })

  if (result.length > 0) {
    console.log(`Found ${result.length} results with Fuse.js`)
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
    const searchTerm = $('#search-wisdom-quotes').val().trim()

    // Debug: Show where matches occurred and relevance score
    let matchInfo = ''
    if (item._fuseMatches) {
      const matchFields = item._fuseMatches.map((match) => match.key).join(', ')
      const score = item._fuseScore ? (1 - item._fuseScore).toFixed(2) : 'N/A'
      matchInfo = `
        <div class="search-match-info">
          <span class="match-fields">Matched in: ${matchFields}</span>
          <span class="relevance-score">Relevance: ${score}</span>
        </div>
      `
    }

    // Highlight search terms in preview text
    const highlightedPreview = highlightSearchTerms(previewText, searchTerm)

    resultsHtml += `
      <div class="search-result-item" data-index="${index}" data-item-id="${
      item.id || ''
    }" data-item-section="${item.section || ''}">
        <div class="search-result-category">${category}</div>
        <div class="search-result-content">
          <div class="search-result-intro">${item.intro || ''}</div>
          <div class="search-result-preview">${highlightedPreview}</div>
          ${matchInfo}
        </div>
      </div>
    `
  })

  resultsHtml += '</div>'

  mainContent.html(resultsHtml)

  // Store results in a global variable for click handlers to access
  window.currentSearchResults = results
  console.log('Stored search results:', window.currentSearchResults)

  // Add click listeners to search result items with improved error handling
  $('.search-result-item').click(function (e) {
    // Prevent event bubbling to avoid triggering the "click outside" handler
    e.stopPropagation()

    const index = Number.parseInt($(this).data('index'))
    const itemId = $(this).data('item-id')
    const itemSection = $(this).data('item-section')

    console.log('Search result clicked:', { index, itemId, itemSection })

    // First try to get from global variable
    if (window.currentSearchResults?.[index]) {
      const selectedItem = window.currentSearchResults[index]
      console.log('Selected item from global:', selectedItem)

      if (selectedItem?.id) {
        displayContent(selectedItem)
        $('#search-container-top').removeClass('active')
        $('#search-wisdom-quotes').val('')
        return
      }
    }

    // Fallback: find by ID in original arrays
    if (itemId) {
      const foundItem = findItemById(itemId)
      if (foundItem) {
        console.log('Found item by ID:', foundItem)
        displayContent(foundItem)
        $('#search-container-top').removeClass('active')
        $('#search-wisdom-quotes').val('')
        return
      }
    }

    // Last resort: find by section and index
    console.error('Could not find item by any method:', {
      index,
      itemId,
      itemSection,
    })
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
  // In the future, we could use the Fuse.js match information to highlight fuzzy matches
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
  $('#search-wisdom-quotes').attr('placeholder', 'Search all wisdom content')
}

function displayContent(contentData) {
  log('displayContent')
  console.log('Displaying content:', contentData)

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

    // Check if content is scrollable after rendering
    setTimeout(() => {
      checkContentScrollable()
    }, 100)
  }

  // Display author only for Quotes section (compact version)
  if (contentData.section === 'Quotes' && contentData.author?.trim()) {
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
      <p class="search-progress">${charCount}/3 characters</p>
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
