# ListBlitz iOS — Test Case Screenshot Catalog

## Purpose
Maps each test case to the visual element it validates on screen. Use as training labels for DL model specialization on mobile UI testing.

## Screen Reference Key
| ID | Screen | Source |
|---|---|---|
| SCR-01 | Login | LoginView.swift |
| SCR-02 | Register | RegisterView.swift |
| SCR-03 | Dashboard | DashboardView.swift |
| SCR-04 | Listings | ListingsView.swift |
| SCR-05 | Listing Detail | ListingDetailView.swift |
| SCR-06 | Create Listing | CreateListingView.swift |
| SCR-07 | Smart List | SmartListView.swift |
| SCR-08 | Cross-Market Search | CrossMarketSearchView.swift |
| SCR-09 | Inbox | InboxView.swift |
| SCR-10 | Conversation | ConversationDetailView.swift |
| SCR-11 | Analytics | AnalyticsView.swift |
| SCR-12 | Offer Blitz | OfferBlitzView.swift |
| SCR-13 | Live Pulse | LivePulseView.swift |
| SCR-14 | Repricer | RepricerView.swift |
| SCR-15 | Settings | SettingsView.swift |
| SCR-16 | Trends | TrendsView.swift |
| SCR-17 | Templates | TemplatesView.swift |
| SCR-18 | Scheduler | SchedulerView.swift |
| SCR-19 | Competitor | CompetitorView.swift |
| SCR-20 | Shipping | ShippingView.swift |
| SCR-21 | Onboarding | OnboardingView.swift |
| CMP-01 | ListingCard | ListingCard.swift |
| CMP-02 | StatCard | StatCard.swift |
| CMP-03 | PlatformBadge | PlatformBadge.swift |
| CMP-04 | StatusBadge | StatusBadge.swift |

---

## Test Suite → Screenshot Mapping

### ParamPriceTests (~2,500 cases)
| Test | Count | Screens | Visual Element |
|---|---|---|---|
| listingPriceFormat | 500 | SCR-03, SCR-04, SCR-05 | Price label on listing cards and detail view |
| salePriceFormat | 500 | SCR-03, SCR-11 | Sale amount in dashboard and analytics |
| saleProfitFormat | 200 | SCR-03, SCR-05, SCR-11 | Green/red profit badge |
| offerPriceFormat | 500 | SCR-12 | Offer price on swipeable card |
| profitMargin | 500 | SCR-05 | Profit margin percentage in detail view |

### ParamPlatformTests (~500 cases)
| Test | Count | Screens | Visual Element |
|---|---|---|---|
| platformColorExists | 32 | All | Platform badge background tint |
| statusColorExists | 7 | SCR-04, SCR-05 | Status dot + text color |
| platformBadgeText | 8 | CMP-03 | 3-letter platform abbreviation |
| filterByStatus | 3 | SCR-04 | Filter chip selected state + count |
| platformIconInitial | 8 | SCR-09, SCR-03 | Circle avatar with letter |
| statusDisplayName | 3 | CMP-04 | Status badge text |
| platformStatusCombo | 56 | SCR-04 | Badge combination on listing card row |

### ParamOfferTests (~2,000 cases)
| Test | Count | Screens | Visual Element |
|---|---|---|---|
| offerPercent | 300 | SCR-12 | Percentage badge (green/orange/red) |
| offerFormattedPrices | 300 | SCR-12 | Offer vs Asking price labels |
| aiRecommendation | 6 | SCR-12 | AI badge (Accept/Counter/Decline) |
| isPending | 6 | SCR-12 | Card visibility (pending shows, others hidden) |
| buyerDisplay | 50 | SCR-12 | Buyer name + avatar initial |
| offerProfit | 200 | SCR-12 | Profit display in expanded section |
| counterPriceFormat | 200 | SCR-12 | Counter price on blue button |
| offerPerPlatform | 8 | SCR-12 | Platform badge on offer card |

### ParamListingTests (~3,000 cases)
| Test | Count | Screens | Visual Element |
|---|---|---|---|
| filterByBrand | 25 | SCR-04 | Search results for brand query |
| sortAscending | 150 | SCR-04 | Listing order after sort |
| searchByQuery | 50 | SCR-04 | Search bar results |
| profitCalc | 150 | SCR-05 | Profit value on detail |
| cardDisplayFields | 200 | SCR-03, SCR-04 | Brand + Size + Price on card |
| filterStatusBrand | 30 | SCR-04 | Combined filter result count |
| primaryImageByOrder | 20 | CMP-01 | Thumbnail image on listing card |
| publishedPlatformsCount | 8 | SCR-05 | Platform badges row on detail |
| listingCondition | 6 | SCR-05, SCR-06 | Condition picker/display |

### ParamDateTests (~400 cases)
| Test | Count | Screens | Visual Element |
|---|---|---|---|
| timeAgoNeverCrashes | 100 | SCR-03, SCR-09, SCR-13 | Relative time labels (5m, 2h, 3d) |
| shortTimeNeverCrashes | 100 | SCR-10 | Message timestamp (2:30 PM) |
| mediumDateNeverCrashes | 100 | SCR-11 | Date labels in analytics |
| parseHandlesAll | 100 | All | Internal date parsing |

### ParamRepricerTests (~600 cases)
| Test | Count | Screens | Visual Element |
|---|---|---|---|
| priceChange | 200 | SCR-14 | Price change value on card |
| priceChangePercent | 200 | SCR-14 | Percentage badge (red -15% / green +10%) |
| actionEmoji | 6 | SCR-14 | Action icon (arrow down/up/pause/refresh) |
| repricerPerPlatform | 8 | SCR-14 | Platform badge on repricer card |

### ParamSearchTests (~800 cases)
| Test | Count | Screens | Visual Element |
|---|---|---|---|
| searchResultPrice | 200 | SCR-08 | Price label on result card |
| filterByPlatform | 8 | SCR-08 | Platform filter chip results |
| primaryImageFromArray | 10 | SCR-08 | Product image in grid cell |
| primaryImageFallback | 2 | SCR-08 | Image placeholder vs loaded |
| stableIdWithId | 30 | SCR-08 | Cell identity for diffing |
| stableIdWithoutId | 30 | SCR-08 | Fallback cell identity |
| fullSearchResult | 8 | SCR-08 | Complete result card rendering |

### ParamActivityTests (~1,500 cases)
| Test | Count | Screens | Visual Element |
|---|---|---|---|
| typeIcon | 5 | SCR-13 | Activity icon ($ / hand / bubble / bell / box) |
| typeLabel | 5 | SCR-13 | Type badge text in expanded view |
| activityWithPrice | 100 | SCR-13 | Price cell in expanded detail |
| activityWithProfit | 100 | SCR-13 | Profit cell (green/red) in expanded detail |
| activityPerPlatform | 8 | SCR-13 | Platform cell in expanded detail |
| typeByPlatform | 40 | SCR-13 | Icon color × platform combination |
| typeByPrice | 25 | SCR-13 | Price formatted in detail cell |
| activityBuyerName | 30 | SCR-13 | Buyer name in expanded detail |
| activityListingTitle | 30 | SCR-13 | Item title in expanded detail |
| batchUniqueIds | 100 | SCR-13 | Feed rendering (no duplicate keys) |

### ParamEdgeCaseTests (~2,000 cases)
| Test | Count | Screens | Visual Element |
|---|---|---|---|
| nilPriceFormatting | 3 | All | "—" dash placeholder |
| emptyImageArrays | 5 | CMP-01 | Photo placeholder icon |
| conversationNilFields | 8 | SCR-09 | "Unknown" fallback name |
| zeroPrice | 3 | All | $0 display |
| largePrices | 3 | All | Large number formatting |
| offerZeroAsking | 50 | SCR-12 | Division guard (no crash) |
| repricerZeroCurrent | 50 | SCR-14 | Division guard (no crash) |
| searchNilPrice | 8 | SCR-08 | "—" price placeholder |
| saleAllNils | 10 | SCR-03 | All dash placeholders |
| unicodeTitles | 10 | All | Unicode text rendering |
| hexColorParsing | 30+ | THM-01 | Color swatch rendering |
| activityNilDetails | 5 | SCR-13 | Collapsed card (no detail cells) |
| fullyPopulatedListing | 20 | SCR-04, SCR-05 | Complete card with all badges |

### Original Test Suites (117 cases)
| Suite | Count | Screens |
|---|---|---|
| ModelDecodingTests | 20 | API → Model layer |
| ListingsTests | 12 | SCR-04, SCR-05 |
| SearchTests | 6 | SCR-08 |
| InboxTests | 6 | SCR-09, SCR-10 |
| OfferTests | 6 | SCR-12 |
| RepricerTests | 6 | SCR-14 |
| PulseTests | 5 | SCR-13 |
| SwipeActionsTests | 8 | SCR-04 swipe gestures |
| ActivityEventTests | 14 | SCR-13 expanded cards |
| DateHelperTests | 7 | All timestamps |
| ThemeTests | 11 | THM-01 design system |
| UserModelTests | 10 | SCR-01, SCR-15 |
| SalesTests | 8 | SCR-03, SCR-11 |

---

## Total Test Cases: ~25,000+
## Total Test Suites: 22
## Screens Covered: 21
## Components Covered: 4
