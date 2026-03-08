

# Smart Paste: One Box to Add Any Lead

The core idea: a single large textarea where you paste any unstructured text -- a WhatsApp message, a form submission, a note -- and the system instantly extracts and fills all fields automatically. Like how Google parses a search query into intent.

## How It Works

**User pastes something like:**
```
Rahul Sharma 9876543210 looking for 2BHK in Koramangala budget 15-20k rahul@gmail.com
```

**System instantly fills:**
- Name: Rahul Sharma
- Phone: 9876543210
- Email: rahul@gmail.com
- Location: Koramangala
- Budget: 15-20k
- Notes: looking for 2BHK

All done with client-side regex -- no API calls, instant, works offline.

## Parsing Logic (regex-based, no AI needed)

1. **Phone**: Match Indian mobile patterns (`+91`, `91`, 10-digit starting with 6-9), also international formats
2. **Email**: Standard email regex
3. **Budget**: Match `₹`, `rs`, `budget`, followed by numbers with `k`/`lakh`/`cr`/`L` suffixes, ranges like `15-20k`
4. **Location/Area**: Match text after keywords like `in`, `at`, `near`, `area`, `location`, or known city/area names
5. **Room type**: Match `1BHK`, `2BHK`, `3BHK`, `studio`, `penthouse`, `villa` patterns
6. **Name**: After removing all extracted tokens, the remaining capitalized words at the start become the name
7. **Everything unmatched** goes into Notes

## UX Design

### Redesigned QuickAddLead.tsx

Two modes with a toggle:

**Mode 1: Smart Paste (default)**
- Large textarea with placeholder: "Paste lead info here... name, phone, budget, location -- in any format"
- As user types/pastes, fields below auto-fill in real-time with a subtle highlight animation
- Parsed fields shown as editable chips/pills below the textarea
- One-click "Create Lead" button

**Mode 2: Manual Entry (current form)**
- Toggle link: "Or fill manually"
- Current form fields

### Visual feedback
- Each extracted field gets a colored tag showing what was detected: `📱 9876543210` `📧 rahul@gmail.com` `📍 Koramangala` `💰 15-20k`
- Fields the user can click to edit inline
- Unrecognized text shown in gray as "Notes"

## Files Changed

| File | Change |
|------|--------|
| `src/components/QuickAddLead.tsx` | Complete redesign: add smart-paste textarea as primary input, keep manual form as secondary, add real-time parsing |
| `src/components/AddLeadDialog.tsx` | Add same smart-paste textarea at top of the full dialog |
| `src/lib/parseLeadText.ts` | **New** -- pure function that takes raw text and returns `{ name, phone, email, budget, location, roomType, notes }` with all regex logic |

## `parseLeadText` Function Spec

```text
Input: "Rahul Sharma 9876543210 rahul@gmail.com 2BHK in Koramangala budget 15-20k needs parking"

Output: {
  name: "Rahul Sharma",
  phone: "9876543210", 
  email: "rahul@gmail.com",
  budget: "15-20k",
  preferred_location: "Koramangala",
  notes: "2BHK, needs parking",
  confidence: { name: 0.8, phone: 1.0, email: 1.0, budget: 0.9, location: 0.7 }
}
```

Confidence scores drive the UI -- high-confidence fields are pre-filled, low-confidence ones are highlighted yellow for review.

This solves the core problem: paste one message, get a lead. No filling 7 fields. No manual entry unless you want to correct something.

