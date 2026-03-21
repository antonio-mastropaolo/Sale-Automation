# ListBlitz iOS App — Complete UI/UX Design Specification

## Design Language

### Visual Identity
- **App Name:** ListBlitz
- **Tagline:** "List once, sell everywhere"
- **Logo:** Lightning bolt icon (SF Symbol: bolt.fill) in accent green
- **Style:** Premium dark-mode native iOS app. Glassmorphism cards, subtle gradients, generous spacing. Feels like a Bloomberg terminal meets Instagram — data-dense but beautiful.

### Color Palette
| Token | Hex | Usage |
|-------|-----|-------|
| Background Primary | #0A0F0D | Main screen background |
| Background Secondary | #111916 | Slightly elevated surfaces |
| Background Card | #161F1B | Card surfaces, input fields |
| Background Elevated | #1C2721 | Modals, sheets, floating elements |
| Accent Green | #52B788 | Primary actions, active states, brand |
| Forest Green | #2D6A4F | Gradient endpoint, pressed states |
| Gold | #D4A843 | Warnings, premium indicators, revenue |
| Terracotta | #C4593A | Errors, destructive actions, price drops |
| Text Primary | #FFFFFF | Headlines, important values |
| Text Secondary | #FFFFFF (70%) | Body text, descriptions |
| Text Tertiary | #FFFFFF (45%) | Labels, timestamps, hints |

### Platform Badge Colors
| Platform | Color | Hex |
|----------|-------|-----|
| Depop | Orange | #F97316 |
| Grailed | Slate | #64748B |
| Poshmark | Pink | #EC4899 |
| Mercari | Blue | #3B82F6 |
| eBay | Yellow | #E5B638 |
| Vinted | Teal | #14B8A6 |
| Facebook | Blue | #1877F2 |
| Vestiaire | Amber | #F59E0B |

### Typography
- **Headlines:** SF Pro Rounded, Bold/Black
- **Body:** SF Pro Text, Regular/Medium
- **Numbers/Prices:** SF Pro Rounded, Bold (monospaced digits)
- **Captions:** SF Pro Text, size 11-12pt

### Spacing System
- XS: 4pt, S: 8pt, M: 16pt, L: 24pt, XL: 32pt

### Corner Radii
- Small: 8pt (badges, small inputs)
- Medium: 12pt (cards, buttons)
- Large: 16pt (sheets, modals)
- XL: 20pt (image containers)
- Full: capsule (pills, filter chips)

### Haptic Feedback
- **Light:** Tab switches, filter selections, toggle changes
- **Medium:** Button presses, action triggers
- **Heavy:** Destructive actions confirmed
- **Success:** Login, listing created, sale recorded, publish success
- **Error:** Failed operations, validation errors
- **Selection:** Scrolling through picker values

---

## Tab Bar

5 tabs at bottom, standard iOS tab bar with custom tint (Accent Green):

| Tab | Icon (SF Symbol) | Label |
|-----|-----------------|-------|
| 1 | square.grid.2x2.fill | Dashboard |
| 2 | tag.fill | Listings |
| 3 | magnifyingglass | Search |
| 4 | bubble.left.and.bubble.right.fill | Inbox |
| 5 | chart.bar.fill | Analytics |

- Inbox tab shows unread badge count (red circle with white number)
- Active tab icon is Accent Green, inactive is Text Tertiary

---

## SCREEN 1: LOGIN

### Layout
Full-screen dark background (#0A0F0D). Content centered vertically with ScrollView for keyboard avoidance.

### Elements (top to bottom)
1. **Logo Block** (centered)
   - Lightning bolt icon, 52pt, Accent Green, with subtle pulse animation
   - "ListBlitz" text, 40pt, SF Pro Rounded Black, white
   - "List once, sell everywhere" subtitle, 14pt, Text Tertiary

2. **Spacer** (32pt)

3. **Email Field**
   - Height: 50pt
   - Left icon: envelope.fill (Text Tertiary)
   - Placeholder: "Email"
   - Background: Background Card
   - Border: 1pt Accent Green at 15% opacity
   - Corner radius: 12pt
   - Keyboard type: email, autocapitalization: none
   - Content type: emailAddress

4. **Password Field** (16pt below)
   - Same style as email
   - Left icon: lock.fill
   - Placeholder: "Password"
   - SecureField (dots)
   - Content type: password

5. **Error Message** (if present)
   - Text in Terracotta (#C4593A), 12pt
   - Animated slide-in from top with fade

6. **Sign In Button** (16pt below)
   - Full width, height: 50pt
   - Background: Accent Green (or 30% opacity when disabled)
   - Text: "Sign In", 17pt bold, white
   - Corner radius: 12pt
   - Shows ProgressView (spinner) when loading
   - Disabled when email or password empty

7. **Register Link** (16pt below)
   - "Don't have an account?" in Text Tertiary
   - "Sign Up" in Accent Green, semibold
   - Tapping opens Register sheet

### States
- **Default:** Empty fields, button disabled (30% opacity)
- **Valid:** Fields filled, button fully green
- **Loading:** Button shows white spinner, fields disabled
- **Error:** Red error text appears below fields with slide animation
- **Success:** Screen transitions to Dashboard with opacity fade

---

## SCREEN 2: REGISTER (Sheet)

### Layout
Presented as modal sheet over Login. NavigationStack with inline title.

### Elements
1. **Header**
   - Lightning bolt icon, 36pt, Accent Green
   - "Create Account" text, 28pt bold
   - "Start selling across every platform" subtitle

2. **Form Fields** (14pt spacing between)
   - Email (envelope.fill icon)
   - Username (person.fill icon)
   - Password (lock.fill icon, secure)
   - Confirm Password (lock.shield.fill icon, secure)

3. **Error Message** (same style as Login)

4. **Create Account Button** (same style as Sign In)

5. **Cancel button** in navigation bar (top-left)

### Validation
- Password minimum 6 characters
- Passwords must match
- All fields required

---

## SCREEN 3: DASHBOARD

### Navigation
- Large title: "Dashboard"
- Right bar button: User avatar circle (34pt, Accent Green at 20% background, initials in Accent Green). Tapping shows menu with "Sign Out".

### Content (ScrollView, vertical LazyVStack, 20pt spacing)

#### Section 1: Welcome Header
- "Welcome back," in 14pt Text Tertiary
- Username in 28pt SF Pro Rounded Bold, white
- Full width, left-aligned

#### Section 2: Stats Grid (2x2 LazyVGrid, 12pt spacing)
Each stat card:
- Background: Background Card (#161F1B)
- Corner radius: 12pt
- Padding: 16pt
- Top row: icon (caption size, colored) + title (caption, Text Tertiary) + optional trend badge (right-aligned)
- Main value: 24pt SF Pro Rounded Bold, white, with numericText content transition
- Optional subtitle: caption2, Text Tertiary

**Cards:**
| Title | Icon | Value Example | Color |
|-------|------|--------------|-------|
| Revenue | dollarsign.circle | $12,450 | Accent Green |
| Active Listings | tag.fill | 48 | Blue |
| Total Sales | cart.fill | 23 | Gold |
| Avg Profit | chart.line.uptrend.xyaxis | $34 | Accent Green |

**Trend Badge** (when present):
- Capsule shape, tiny (6pt horizontal padding, 3pt vertical)
- Arrow icon (arrow.up.right or arrow.down.right) 9pt bold
- Percentage text 10pt bold
- Green for positive, Terracotta for negative
- Background: matching color at 12% opacity

#### Section 3: Quick Actions (Horizontal ScrollView)
- Section title: "Quick Actions", headline weight, white
- 4 action buttons in horizontal scroll (12pt spacing, no indicators)

Each Quick Action:
- Size: 85pt wide × 80pt tall
- Corner radius: 12pt
- Background: color at 10% opacity
- Icon: title2 size, colored
- Label: caption bold, Text Secondary
- Haptic: light on tap

**Actions:**
| Icon | Label | Color | Tab Target |
|------|-------|-------|-----------|
| camera.fill | Smart List | Accent Green | Listings |
| plus.circle.fill | New Listing | Blue | Listings |
| magnifyingglass | Search | Purple | Search |
| dollarsign.arrow.trianglehead.counterclockwise.rotate.90 | Reprice | Gold | Listings |

#### Section 4: Recent Listings
- Header row: "Recent Listings" (headline, white) + "See All" button (caption bold, Accent Green, right-aligned)
- Shows 5 most recent listings as ListingCards (described below)
- Each card is a NavigationLink to ListingDetailView
- **Loading state:** 3 SkeletonListingCards with shimmer
- **Empty state:** EmptyStateView with tag.slash icon

#### Section 5: Recent Sales
- Title: "Recent Sales" (headline, white)
- Shows 5 most recent sales as SaleRows

**SaleRow:**
- Background: Background Card, corner radius 12pt, padding 12pt
- Left: PlatformIcon (28pt circle with platform initial)
- Center: Title (subheadline medium, white, 1 line) + platform name + time ago (caption, Tertiary)
- Right: Sold price (subheadline bold, white) + profit (+$X or -$X, caption bold, green/red)

### Pull-to-Refresh
- Standard iOS refreshable modifier
- Reloads all data concurrently (listings + sales)

---

## SCREEN 4: LISTINGS

### Navigation
- Large title: "Listings"
- Search bar (navigationBarDrawer, always displayed): "Search listings..."
- Right bar buttons:
  1. Plus circle (plus.circle.fill, title3, Accent Green) — Menu with "Smart List (AI)" and "Manual Listing"
  2. Sort button (arrow.up.arrow.down.circle, Text Secondary) — Menu with sort options

### Sort Options
- Newest (default)
- Oldest
- Price ↓ (high to low)
- Price ↑ (low to high)
- Checkmark next to active sort

### Filter Bar (Horizontal ScrollView below nav)
- Padding: 10pt vertical, 16pt horizontal
- Filter chips with 8pt spacing

**FilterChip:**
- Capsule shape
- Text: caption bold
- Padding: 14pt horizontal, 8pt vertical
- **Selected:** Background Accent Green, white text
- **Unselected:** Background Card, Text Secondary
- Optional count badge: tiny rounded pill inside chip

**Chips:** All, Draft (with count), Active (with count), Sold (with count)

### Content

#### Listing Cards (LazyVStack, 8pt spacing, 16pt horizontal padding)

**ListingCard:**
- Background: Background Card (#161F1B)
- Corner radius: 12pt
- Padding: 12pt
- Height: ~96pt

Layout (HStack, 12pt spacing):
1. **Product Image** (72×72pt)
   - Corner radius: 8pt
   - AsyncImage from listing's primary image path
   - Placeholder: Background Elevated with photo icon (title3, Tertiary)
   - Fill mode: aspectRatio fill, clipped

2. **Info Column** (VStack, left-aligned, 4pt spacing)
   - Title: subheadline semibold, white, 1 line truncated
   - Brand + Size: caption, Text Secondary, separated by "·"
   - Status + Platform badges row (HStack, 6pt spacing):
     - StatusBadge (described below)
     - Up to 3 PlatformBadges (compact mode)

3. **Price Column** (VStack, right-aligned, 4pt spacing)
   - Price: body bold SF Rounded, Accent Green (e.g., "$85")
   - Profit: caption2 bold, green "+$30" or red "-$10"

**StatusBadge:**
- HStack: 6pt colored dot + status text (caption2 bold)
- Capsule background at 12% opacity
- Padding: 8pt horizontal, 4pt vertical
- Colors: Draft=Amber, Active=Emerald, Sold=Teal

**PlatformBadge (compact):**
- 3-letter abbreviation (DEP, GRL, PSH, MRC, BAY, VNT, FB, VST)
- Font: system 10pt bold
- Platform color text
- Platform color at 15% background
- Capsule shape, padding: 6pt horizontal, 2pt vertical

#### Loading State
- 8 SkeletonListingCards
- Skeleton = same layout as ListingCard but with gray rectangles + shimmer animation

#### Empty State
- Centered: tag.slash icon (48pt, Tertiary, pulse animation)
- "No Listings" / "No [Status] Listings" (headline, Secondary)
- "Create your first listing to get started" (subheadline, Tertiary)
- "Create Listing" button (capsule, Accent Green)

### Interactions
- Tap card → NavigationLink to ListingDetailView
- Pull-to-refresh → reload listings
- Search filters locally by title, brand, category (case-insensitive)

---

## SCREEN 5: LISTING DETAIL

### Navigation
- Inline title (no large title)
- Back button (auto from NavigationStack)

### Content (ScrollView, LazyVStack, 20pt spacing)

#### Section 1: Image Gallery
- TabView with page style (dots at bottom)
- Full-width, height: 350pt
- Each page: AsyncImage, aspectRatio fill, clipped
- If no images: gray background with photo icon (48pt)

#### Section 2: Title & Price (16pt horizontal padding)
- HStack: StatusBadge (left) + Price (right, 28pt SF Rounded Bold, Accent Green)
- Title: title2 bold, white

#### Section 3: Details Card (16pt horizontal padding)
- Background: Background Card, corner radius 12pt, padding 16pt
- Detail rows (HStack each):
  - Label (subheadline, Tertiary) + Spacer + Value (subheadline medium, white)
  - Rows: Brand, Category, Size, Condition, Cost ($X), Profit ($X, colored)
- Description (if exists):
  - "Description" label (caption, Tertiary)
  - Description text (subheadline, Secondary)

#### Section 4: Platforms
- Title: "Platforms" (headline, white, 16pt horizontal padding)
- For each PlatformListing:
  - HStack in card (Background Card, 12pt corner radius, 12pt padding)
  - PlatformIcon (36pt circle) + platform name (subheadline medium) + optimized title (caption, Tertiary, 1 line)
  - Right: StatusBadge (published/draft/failed)
- If no platforms: centered text "Not published to any platform yet"

#### Section 5: Action Buttons (16pt horizontal padding, 10pt spacing)

**Optimize with AI Button:**
- Full width, height: 46pt
- Background: linear gradient Accent Green → Forest Green
- White text: sparkles icon + "Optimize with AI" (subheadline bold)
- Loading: "Optimizing..."
- Tapping calls AI optimize endpoint, opens OptimizeSheet on success

**Publish to Platforms Button:**
- Full width, height: 46pt
- Background: Background Card
- Border: 1pt Accent Green at 30% opacity
- Accent Green text: paperplane.fill icon + "Publish to Platforms"
- Only shown for draft/active listings

**Delete Listing Button** (only if not sold):
- Full width, height: 46pt
- Background: Terracotta at 10%
- Terracotta text: trash icon + "Delete Listing"
- Shows confirmation alert before deleting

### Optimize Sheet (Modal)
- NavigationStack with inline title "AI Optimizations"
- Done button (top-right, Accent Green)
- ScrollView of optimization cards per platform:
  - PlatformIcon (32pt) + platform name (headline) + suggested price (headline bold, Accent Green)
  - Title section (caption label + subheadline text)
  - Description section (caption label + caption text, 5 line limit)
  - Hashtags: FlowLayout of capsule pills (#tag, caption2, Accent Green text, Accent Green 10% background)

---

## SCREEN 6: CREATE LISTING (Sheet)

### Navigation
- NavigationStack, inline title: "New Listing"
- Cancel button (top-left, Text Secondary)
- Create button (top-right, Accent Green bold) — disabled when title empty, shows spinner when loading

### Content (Form with sections)

#### Section: Photos
- Horizontal ScrollView of selected images (80×80pt, corner radius 8pt)
- Each image has X button overlay (top-right) to remove
- PhotosPicker button at end: plus.circle.fill icon + "Add" text, 80×80pt, Accent Green 10% background

#### Section: Item Details
- TextField: Title
- TextField: Brand
- TextField: Category
- TextField: Size
- Picker: Condition (New with Tags, New without Tags, Like New, Good, Fair, Poor)

#### Section: Pricing
- HStack: "$" + TextField for Listing Price (decimal pad)
- HStack: "$" + TextField for Cost Price (decimal pad)
- If both prices > 0: Profit row showing calculated profit (colored green/red, bold)

#### Section: Description
- TextEditor, minimum height 100pt

#### Section: Platforms
- 8 toggles, each with PlatformIcon (24pt) + platform name
- Tint: Accent Green
- Platforms: Depop, Grailed, Poshmark, Mercari, eBay, Vinted, Facebook, Vestiaire

#### Error Section (if present)
- Error text in Terracotta

---

## SCREEN 7: SMART LIST (Sheet)

### Phase 1: Capture View
Full-screen dark background, content centered.

1. **Camera viewfinder icon** (64pt, Accent Green)
2. **Title:** "AI-Powered Listing" (title2 bold, white)
3. **Description:** "Take a photo or choose from library.\nAI will generate title, description, pricing & more." (subheadline, Tertiary, centered)
4. **Choose from Library button:** Full width (minus 64pt margins), height 50pt, gradient background (Accent Green → Forest Green), white text with photo.on.rectangle icon
5. **Take Photo button:** Full width, height 50pt, Background Card, Accent Green text/border, camera.fill icon
6. Error text below if present

### Phase 2: Analyzing View
1. **Preview image** (max height 280pt, corner radius 16pt, centered, 32pt horizontal padding)
2. **Spinner** (large, Accent Green)
3. **"AI is analyzing your item..."** (headline, white)
4. **"Generating title, description, pricing, and category"** (caption, Tertiary)

### Phase 3: Result View (ScrollView)
1. **Preview image** (max height 200pt, centered)
2. **AI Generated label:** sparkles icon + "AI Generated" (caption bold, Accent Green)
3. **Generated title** (title3 bold, white)
4. **Details Grid** (2×3 LazyVGrid, 8pt spacing)
   - Each cell: label (10pt, Tertiary) + value (subheadline medium, white)
   - Background Card, corner radius 8pt, padding 10pt
   - Fields: Brand, Category, Size, Condition, Price, Color
5. **Description card** (if exists)
6. **Hashtags** (FlowLayout of pills)
7. **"Create Listing" button** (full width, gradient, plus.circle.fill icon)
8. **"Try Another Photo" link** (subheadline, Text Secondary, centered)

---

## SCREEN 8: CROSS-MARKET SEARCH

### Navigation
- Large title: "Search"
- Search bar (always displayed): "Search across marketplaces..."
- Submit triggers search

### Platform Filter Bar (Horizontal ScrollView)
- FilterChips: All, Depop, Grailed, Poshmark, Mercari, eBay, Vinted
- 8pt spacing, 8pt vertical padding, 16pt horizontal padding

### States

#### Default (No Search Yet)
Centered content:
1. **Globe icon** (globe.americas.fill, 56pt, Accent Green 50%)
2. **"Cross-Market Search"** (title3 bold, white)
3. **Description** (subheadline, Tertiary, centered, multi-line)
4. **Popular Searches section:**
   - "Popular Searches" label (caption bold, Tertiary)
   - FlowLayout of tappable query pills
   - Pills: caption text, Text Secondary, Background Card, capsule, 12pt horizontal / 6pt vertical padding
   - Suggestions: "Vintage Nike", "Y2K", "Archive Raf", "Carhartt WIP", "Stussy", "Jordan 1"
   - Tapping fills search and auto-searches

#### Loading
- Centered: spinner (large, Accent Green)
- "Searching across platforms..." (subheadline, Tertiary)

#### Results Grid (2-column LazyVGrid, 10pt spacing)

**SearchResultCard:**
- Background: Background Card, corner radius 12pt
- VStack, no spacing between image and info

**Image area:**
- Height: 160pt, full width, clipped
- AsyncImage from result.image URL
- Placeholder: Background Elevated + photo icon
- Loading: Background Elevated + small spinner

**Info area (8pt padding):**
- Title: caption medium, white, 2 lines max
- HStack: Price (subheadline bold, Accent Green) + Spacer + PlatformBadge (compact)
- Size line (if present): "Size: X" (10pt, Tertiary)

#### Empty Results
- EmptyStateView: magnifyingglass icon, "No Results", "Try a different search term or platform"

---

## SCREEN 9: INBOX

### Navigation
- Large title: "Inbox"

### Platform Filter Bar
Same pattern as Search — FilterChips for All + each platform with conversations

### Conversation List (List with plain style)

**ConversationRow:**
- HStack, 12pt spacing, 4pt vertical padding
- **Avatar** (44pt circle):
  - Fill: platform color at 20% opacity
  - Text: first letter of buyer name, 16pt SF Rounded Bold, platform color
- **Info column** (VStack, 3pt spacing):
  - Top row (HStack): Buyer name (subheadline, bold if unread, medium if read, white) + Spacer + time ago (caption2, Tertiary)
  - Middle row (HStack): PlatformBadge (compact) + listing title (caption, Tertiary, 1 line)
  - Bottom: last message preview (caption, white if unread / Tertiary if read, 1 line)
- **Unread dot** (if unread): 8pt circle, Accent Green, right side

### Tapping Conversation → ConversationDetailView

---

## SCREEN 10: CONVERSATION DETAIL

### Navigation
- Inline title: buyer name (subheadline bold) + platform name below (caption2, Tertiary)
- Right bar button: sparkles icon (Accent Green) — loads AI reply suggestions

### Message List (ScrollView with ScrollViewReader)

**MessageBubble:**
- **Seller messages (right-aligned):**
  - Spacer (min 60pt) on left
  - Background: Accent Green
  - Text: subheadline, white
  - Corner radius: 18pt continuous
  - Padding: 14pt horizontal, 10pt vertical
  - Timestamp below: 10pt, Tertiary, right-aligned

- **Buyer messages (left-aligned):**
  - Spacer (min 60pt) on right
  - Background: Background Card
  - Text: subheadline, white
  - Same corner radius and padding
  - Timestamp below: 10pt, Tertiary, left-aligned

- Auto-scrolls to bottom on new message

### AI Suggestion Banner (when loaded)
- HStack in Background Card
- sparkles icon (caption, Accent Green) + suggestion text (caption, Secondary, 2 lines) + "Use" button (caption bold, Accent Green) + X dismiss button
- Animated slide-in from bottom
- Tapping "Use" fills input field

### Input Bar (bottom, Background Secondary)
- HStack, 10pt spacing, 8pt vertical / 16pt horizontal padding
- TextField: "Type a message...", vertical axis, 1-5 lines
  - Background Card, corner radius 20pt, padding 10pt
- Send button: arrow.up.circle.fill (title2)
  - Accent Green when text present, Tertiary when empty
  - Disabled when empty or sending

---

## SCREEN 11: ANALYTICS

### Navigation
- Large title: "Analytics"

### Content (ScrollView)

#### Period Selector
- Segmented Picker: 7D, 30D, 90D, All
- Standard iOS segmented control style

#### Metrics Grid (2x2, 12pt spacing)
Same StatCard pattern as Dashboard:
| Title | Icon | Color |
|-------|------|-------|
| Total Revenue | dollarsign.circle | Accent Green |
| Net Profit | chart.line.uptrend.xyaxis | Success Green |
| Items Sold | cart.fill | Gold |
| Avg Sale Price | tag.fill | Blue |

#### Revenue Trend Card
- Title: "Revenue Trend" (headline, white)
- MiniBarChart: 7 bars (one per day of last week)
  - Bars: Accent Green gradient, rounded top (3pt)
  - Labels below: 3-letter day abbreviation (8pt, Tertiary)
  - Height scales relative to max value
  - Total chart height: 140pt
- Empty state: "No sales data yet" centered text

#### Sales by Platform Card
- Title: "Sales by Platform" (headline, white)
- List of platforms sorted by sale count:
  - PlatformIcon (32pt) + platform name (subheadline medium, white) + sale count (caption, Tertiary)
  - Right: revenue total (subheadline bold, Accent Green)

#### Top Sellers Section
- Title: "Top Sellers" (headline, white)
- Top 5 sales by price as SaleRow cards

#### Inventory Summary Card
- Title: "Inventory Summary" (headline, white)
- 4 metrics in HStack:
  - Total (Text Secondary), Draft (Amber), Active (Emerald), Sold (Teal)
  - Each: value (20pt SF Rounded Bold) + label (caption2, Tertiary)
- Progress bar below (8pt height):
  - Segmented: Amber (draft) + Emerald (active) + Teal (sold)
  - Width proportional to counts
  - Capsule shape, 2pt gaps between segments

---

## SCREEN 12: SMART REPRICER (Accessible from Settings)

### Navigation
- Large title: "Smart Repricer"

### Action Filter Bar
FilterChips: All, Drop (count), Raise (count), Hold (count), Relist (count)

### Summary Stats (4-column HStack, 12pt spacing)
**MiniStat:**
- VStack centered
- Value: 18pt SF Rounded Bold, colored
- Label: 10pt medium, Tertiary
- Background: matching color at 8%
- Corner radius: 10pt, padding: 10pt vertical

| Label | Color |
|-------|-------|
| Drop | Terracotta |
| Raise | Success Green |
| Hold | Info Blue |
| Relist | Gold |

### Suggestion Cards (LazyVStack, 10pt spacing)

**RepriceSuggestionCard:**
- Background: Background Card, corner radius 12pt
- Border: 1pt action color at 15%
- Padding: 14pt

**Header row (HStack):**
- Action icon (title3, colored by action type):
  - Drop: arrow.down.circle.fill (Terracotta)
  - Raise: arrow.up.circle.fill (Success Green)
  - Hold: pause.circle.fill (Info Blue)
  - Relist: arrow.clockwise.circle.fill (Gold)
- Info column:
  - Title (subheadline semibold, white, 1 line)
  - Metadata (caption, Tertiary): days listed + views + likes
- Price column (right-aligned):
  - Current price (caption, Tertiary, strikethrough)
  - Suggested price (headline bold, action color)
  - Change percentage (caption2 bold, green/red)

**Reason text:** caption, Text Secondary, 2 lines max

**Bottom row (HStack):**
- Action badge: action name uppercased (10pt heavy, action color, capsule, 8pt horizontal / 3pt vertical padding, action color 12% background)
- PlatformBadge (compact, if platform present)

---

## SCREEN 13: SETTINGS

### Navigation
- Large title: "Settings"

### Content (List, insetGrouped style, hidden scroll background, Background Primary)

#### Section: Account
- HStack: Avatar circle (50pt, Accent Green 20%, initials 18pt bold) + username (headline, white) + email (caption, Tertiary)
- Row background: Background Card

#### Section: Connected Platforms
- Loading: spinner + "Loading platforms..."
- Empty: "No platforms connected"
- Each platform: PlatformIcon (32pt) + name (subheadline, white) + checkmark.circle.fill (Success Green, right)
- Row backgrounds: Background Card

#### Section: App
- Version: "1.0.0" (LabeledContent)
- Build: "1" (LabeledContent)
- NavigationLink to Smart Repricer
- Row backgrounds: Background Card

#### Section: Sign Out
- Centered destructive button
- Label: rectangle.portrait.and.arrow.right icon + "Sign Out" (subheadline bold)
- Row background: Background Card

---

## SHARED COMPONENTS REFERENCE

### ListingCard
72×72 image + title/brand/size + status/platforms + price/profit. Described in Listings screen.

### StatCard
Icon + title + value + optional trend + optional subtitle. Described in Dashboard.

### FilterChip
Capsule with text + optional count. Selected = Accent Green bg + white text. Unselected = Background Card + Secondary text.

### PlatformBadge
Full: platform name capitalized. Compact: 3-letter abbreviation. Platform-colored text + 15% background capsule.

### PlatformIcon
Circle (28-36pt) with platform color at 15% background + first letter bold in platform color.

### StatusBadge
6pt colored dot + status text in capsule. Color by status.

### EmptyStateView
Centered: large icon (48pt, Tertiary, pulse) + title (headline, Secondary) + message (subheadline, Tertiary, centered) + optional action button (capsule, Accent Green).

### ErrorView
Centered: exclamationmark.triangle.fill (40pt, Gold) + "Something went wrong" + error description + Retry button.

### LoadingView
Centered: large ProgressView (Accent Green) + message text (subheadline, Tertiary).

### SkeletonCard
Same layout as target card but all elements replaced with Background Elevated rectangles + shimmer animation (white 10% gradient sweeping left to right, 1.5s loop).

### SaleRow
Platform icon + title/platform/time + price/profit. Described in Dashboard.

---

## ANIMATIONS & TRANSITIONS

| Context | Animation |
|---------|-----------|
| Tab switch | Default iOS tab transition |
| Auth → Dashboard | Opacity fade, 0.3s smooth |
| Error text appear | Move from top + opacity, smooth |
| Card press | Default button highlight |
| Pull-to-refresh | Standard iOS refresh control |
| Skeleton shimmer | Linear gradient sweep, 1.5s repeat |
| Empty state icon | symbolEffect pulse, slow repeat |
| Numeric values | contentTransition numericText |
| Sheet present | Default iOS sheet |
| AI suggestion | Move from bottom + opacity |
| Message sent | Scroll to bottom with animation |
| Filter selection | Instant with haptic |
| Launch screen | Progress bar ease-in-out, step text crossfade |

---

## GESTURE & INTERACTION PATTERNS

- **Pull-to-refresh:** All scrollable data screens
- **Swipe back:** Standard iOS NavigationStack back gesture
- **Keyboard dismiss:** scrollDismissesKeyboard(.interactively)
- **Search:** onSubmit for cross-market search, local filtering for listings
- **Long press:** None currently (future: quick actions on listing cards)
- **Tap:** All interactive elements with appropriate haptic feedback

---

## DATA LOADING PATTERNS

Every screen follows this pattern:
1. Show skeleton/shimmer placeholders immediately
2. Fetch data with async/await
3. On success: replace skeletons with real content (no animation needed)
4. On error: show ErrorView with retry button
5. On empty: show EmptyStateView with contextual message + CTA
6. Pull-to-refresh: fetch with skipCache=true, don't show skeleton (data already visible)

---

## ACCESSIBILITY

- All images have accessibility labels
- All buttons have accessibility hints
- Dynamic Type supported (prefer relative font sizes)
- Minimum tap target: 44×44pt
- Color contrast ratios meet WCAG AA on dark backgrounds
- VoiceOver: logical reading order follows visual layout
