const debug = false

export function getRandomFromArray(arrayToChooseFrom) {
  const randomIndx = Math.floor(Math.random() * arrayToChooseFrom.length)
  return arrayToChooseFrom[randomIndx]
}

export function fadeIn(element) {
  log('fadeIn: ' + element.selector)
  element.css('opacity', 0)
  element.fadeTo('slow', 1)
}

export function log(object) {
  if (debug) {
    console.debug(object)
  }
}

//https://stackoverflow.com/questions/26246601/wildcard-string-comparison-in-javascript
export function matchRuleShort(str, rule) {
  return new RegExp('^' + rule.replace('*', '.+?') + '$').test(str)
}
