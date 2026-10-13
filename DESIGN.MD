# Monieplans design system

Monieplans uses warm neutral surfaces and forest green for a calm, practical finance interface. The app is an operating surface: the user's balance, bucket, or transaction is the focus. Product identity stays in the serif wordmark; all controls, headings, and figures use Inter with a system sans fallback. Monetary figures use tabular numerals.

## Tokens and layout

Base #F2EEE5; lightest #FBF9F4; alternate #EDE8DD; primary text #171512; secondary #625E55; muted #6B655A; forest #3B4B34; warning/error #944626. Use restrained 1px borders, flat rows, and 10–16px radii. Ordinary cards have no elevation or hover movement. Do not hide merchant names behind action icons. Transaction actions live in details.

At phone sizes, Home/Plan/Activity/Review sit in a four-tab bottom bar, with safe-area padding and a persistent Add expense action above it. Profile/settings is in the top bar. Desktop uses a compact left navigation. Main content is at most 980px. Data rows adapt without horizontal page overflow. Touch targets are at least 44px; inputs are 46px minimum with 16px text.

## Behavior and accessibility

Use native, named modal dialogs for focused capture, editing, and confirmation tasks, with browser focus containment and focus restoration. Form labels contain their inputs/selects. Keyboard focus is visible. Maintain WCAG AA contrast. No essential action requires hover; reduced motion disables decorative animation. Month changes preserve device-local plan drafts; explicit discarding requires confirmation. Loading, empty, processing, failure, stale, and duplicate states say what happened and provide a recovery action.

Monthly-only and weekly-paced buckets share expense capture. Money movement previews display both resulting balances and revised weekly plans. Capture review shows receipt date/month, editable fields, duplicate/status acknowledgements, and evidence. Recommendations expose an explicit next-month plan preview before applying.
