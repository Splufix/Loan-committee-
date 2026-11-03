# CoopSave Repayments prototype

## Product context

**CoopSave: Cooperative savings and loans** is for a staff or market cooperative that manages savings, loans, and repayments with clear statements. Cooperatives and thrift groups are how many Nigerians save and borrow; clear records help prevent fraud and build trust.

The product serves **Members, Treasurer, Loan committee, and Admin**.

## Feature scope

This feature is **Repayments**: repayment schedules, repayment recording, and overdue tracking. The assigned accessibility and mobile reviewer role also applies: repayment tasks and records must remain clear and usable on small screens and with assistive technology.

## Browser prototype

A responsive front-end prototype with empty initial state. Record changes persist in this browser's local storage; no database or payment provider is connected, and no real payment is processed.

### Preview

Open `index.html` in a modern browser. The repayment schedule, overdue tracking, recent activity, and summary totals show empty states until approved schedule data is connected. The repayment form supports partial payments and blocks overpayments when an unpaid instalment is available. **Restore records** clears records stored in this browser.

### Accessibility and mobile notes

- Semantic page regions, heading structure, labeled controls, keyboard-visible focus, skip link, dialog-based form, live status feedback, and text labels for all repayment states.
- Responsive layout includes a compact mobile navigation and stacked repayment rows.
- Forest green and sage follow the supplied style guide. Status uses the guide's success, warning and danger palettes with explicit text labels.
- Money is stored in whole kobo and displayed in naira with two decimal places. Dates are displayed for Africa/Lagos.

### Integration boundary

This is a front-end prototype with browser-local records. Before merging into the group repository, align loan/member identifiers, repayment schedule model, authorization rules, shared component conventions, and payment integration with the team lead. Use payment-provider test mode only.
