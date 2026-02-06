'use client'

import React from 'react'

interface SearchHighlightProps {
  text: string
  searchTerm: string
  className?: string
  highlightClassName?: string
}

/**
 * Highlights matching text within a string
 * UX improvement: Makes search results more visible
 * UX #136: Enhanced to highlight all occurrences, not just first
 */
export function SearchHighlight({ 
  text, 
  searchTerm, 
  className = '',
  highlightClassName = 'bg-yellow-200 text-yellow-900 rounded px-0.5'
}: SearchHighlightProps) {
  if (!searchTerm.trim()) {
    return <span className={className}>{text}</span>
  }

  // Normalize both strings for accent-insensitive matching
  const normalizedText = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const normalizedSearch = searchTerm.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  
  // UX #136: Find all occurrences
  const parts: { text: string; isMatch: boolean }[] = []
  let lastIndex = 0
  let index = normalizedText.indexOf(normalizedSearch)
  
  while (index !== -1) {
    // Add text before match
    if (index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, index), isMatch: false })
    }
    // Add the match (using original text casing)
    parts.push({ text: text.slice(index, index + normalizedSearch.length), isMatch: true })
    lastIndex = index + normalizedSearch.length
    index = normalizedText.indexOf(normalizedSearch, lastIndex)
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isMatch: false })
  }
  
  if (parts.length === 0) {
    return <span className={className}>{text}</span>
  }

  return (
    <span className={className}>
      {parts.map((part, i) => 
        part.isMatch ? (
          <mark key={i} className={highlightClassName}>{part.text}</mark>
        ) : (
          <React.Fragment key={i}>{part.text}</React.Fragment>
        )
      )}
    </span>
  )
}

interface PhoneHighlightProps {
  phone: string
  searchTerm: string
  className?: string
  highlightClassName?: string
}

/**
 * Highlights phone number matches
 * Handles formatted vs raw phone comparisons
 */
export function PhoneHighlight({
  phone,
  searchTerm,
  className = '',
  highlightClassName = 'bg-green-200 text-green-900 rounded px-0.5'
}: PhoneHighlightProps) {
  if (!searchTerm.trim()) {
    return <span className={className}>{phone}</span>
  }

  const searchDigits = searchTerm.replace(/\D/g, '')
  if (!searchDigits) {
    return <span className={className}>{phone}</span>
  }

  const phoneDigits = phone.replace(/\D/g, '')
  const matchIndex = phoneDigits.indexOf(searchDigits)
  
  if (matchIndex === -1) {
    return <span className={className}>{phone}</span>
  }

  // Find corresponding positions in formatted string
  let digitCount = 0
  let startPos = -1
  let endPos = -1
  
  for (let i = 0; i < phone.length; i++) {
    if (/\d/.test(phone[i])) {
      if (digitCount === matchIndex && startPos === -1) {
        startPos = i
      }
      if (digitCount === matchIndex + searchDigits.length - 1) {
        endPos = i + 1
        break
      }
      digitCount++
    }
  }

  if (startPos === -1 || endPos === -1) {
    return <span className={className}>{phone}</span>
  }

  const before = phone.slice(0, startPos)
  const match = phone.slice(startPos, endPos)
  const after = phone.slice(endPos)

  return (
    <span className={className}>
      {before}
      <mark className={highlightClassName}>{match}</mark>
      {after}
    </span>
  )
}
