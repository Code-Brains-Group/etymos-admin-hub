

# Etymos Admin Portal — Build Plan

## Brand & Theme Setup
- Configure custom color palette (black/white brutalist-minimal theme) in Tailwind config and CSS variables
- Import Google Fonts: **Playfair Display** (display), **Instrument Sans** (body), **DM Mono** (data/badges)
- Set sharp corners globally (no border-radius), thin hairline borders, high-contrast typography

## Layout
- **Fixed sidebar** (240px, black `#0A0A0A`): "ETYMOS" wordmark in Playfair Display, navigation links with icons, admin info + logout at bottom
- **Main content area**: dynamic page title top bar with admin avatar, scrollable content below
- Active nav item highlighted with white left border accent

## Pages (all with mock/placeholder data)

### 1. Login Page
- Full-screen centered card, no sidebar. ETYMOS branding, email/password fields, black "Sign In" button, inline error display.

### 2. Dashboard
- 7 stat cards in a grid (Total Users, Active Today, Quizzes Completed, Words Searched, New Users This Week, Active Competitions, Top Category)
- Recent Activity feed (left) + Quick Actions panel (right) below stats

### 3. Users Page
- Search bar, data table (Name, Email, Status badge, Admin badge, Joined Date, Actions)
- View modal (user detail), Ban/Unban and Make Admin confirmation dialogs
- Pagination controls

### 4. Categories Page
- Card grid (3 columns) with category image, title, description, word count badge, edit/delete
- Create/Edit modal (Title, Description, Image URL)
- Word management panel with tag chips, add/remove words

### 5. Special Quizzes Page
- Table with Title, Category, Questions count, Status badge, Actions
- Create/Edit modal with category dropdown, active toggle

### 6. Awards Page
- Card grid with award icon, title, description, points badge, edit/delete
- Create/Edit modal + Grant Award modal (enter User ID)

### 7. Competitions Page
- Table with Title, Start/End dates, auto-derived Status badge (Active/Ended/Upcoming), Actions
- Create/Edit modal with datetime pickers, prize details
- Announce Winners button on ended competitions

### 8. Leaderboard Page
- Filter bar: time range toggle (All Time/Weekly/Monthly), category dropdown, sort selector
- Ranked table with top 3 highlighted, pagination

### 9. Settings
- Gear icon in sidebar bottom, opens drawer/modal with API Base URL input field + Save

## Shared Components
- Reusable **Modal** (ESC + backdrop close), **Data Table** (zebra rows, hover, sortable headers), **Badge** (green/red/black/gray variants), **Stat Card**, **Toast notifications** (sonner), **Confirmation Dialog**, **Pagination**, **Empty State**, **Loading Skeletons**

## Routing & Auth Flow
- App starts on Login page → successful login routes to Dashboard
- Auth token held in React state, passed to future API calls
- All forms have basic validation (required fields, email format)
- Configurable `BASE_URL` variable for future API integration

