import Testing
import Foundation
import SwiftUI
@testable import ListBlitz

// ═══════════════════════════════════════════════════════════════
// MASS PARAMETERIZED TESTS — Scale to 25K
// These test every boundary, combination, and edge case for
// all model computed properties and formatting functions.
// ═══════════════════════════════════════════════════════════════

// MARK: - Extended Price Data (2000 values)
private let extendedPrices: [Double] = {
    var p: [Double] = [0]
    p += stride(from: 0.01, through: 1.0, by: 0.01).map { $0 }     // 100 cent values
    p += stride(from: 1, through: 100, by: 1).map { Double($0) }    // 100 dollar values
    p += stride(from: 101, through: 500, by: 1).map { Double($0) }  // 400 values
    p += stride(from: 501, through: 1000, by: 1).map { Double($0) } // 500 values
    p += stride(from: 1001, through: 2000, by: 1).map { Double($0) }// 1000 values
    return p
}()

// MARK: - Extended Profit Data (1000 values)
private let extendedProfits: [Double] = {
    var p: [Double] = []
    p += stride(from: -500, through: 500, by: 1).map { Double($0) } // 1001 values
    return p
}()

// MARK: - All Platform × Brand Combos (400)
private let platformBrandCombos: [(String, String)] = {
    var combos: [(String, String)] = []
    for platform in TestData.platforms {
        for brand in TestData.brands {
            combos.append((platform, brand))
        }
    }
    return combos
}()

// MARK: - All Brand × Category Combos (750)
private let brandCategoryCombos: [(String, String)] = {
    var combos: [(String, String)] = []
    for brand in TestData.brands {
        for category in TestData.categories {
            combos.append((brand, category))
        }
    }
    return combos
}()

// ═══════════════════════════════════════════════════════════════
// SUITE 1: Mass Listing Price Tests (2000 cases)
// Screenshot: SCR-04 listing card price, SCR-05 detail price
// ═══════════════════════════════════════════════════════════════
@Suite("Mass Listing Prices")
struct MassListingPriceTests {
    @Test("Price formats correctly", arguments: extendedPrices)
    func priceFormat(price: Double) {
        let listing = Listing(
            id: "t", title: "Test", description: nil, category: nil,
            brand: nil, size: nil, condition: nil, price: price, costPrice: nil,
            status: .active, createdAt: nil, updatedAt: nil, images: nil, platformListings: nil
        )
        #expect(listing.formattedPrice.hasPrefix("$"))
        #expect(!listing.formattedPrice.contains(",")) // No thousands separator in format
    }
}

// ═══════════════════════════════════════════════════════════════
// SUITE 2: Mass Profit Calculations (1000 cases)
// Screenshot: SCR-05 profit label, SCR-03 dashboard profit stat
// ═══════════════════════════════════════════════════════════════
@Suite("Mass Profit Calculations")
struct MassProfitTests {
    @Test("Profit sign and format", arguments: extendedProfits)
    func profitFormat(profit: Double) {
        let sale = Sale(id: "t", listingId: nil, platform: nil, title: nil,
                       soldPrice: nil, costPrice: nil, shippingCost: nil,
                       platformFee: nil, profit: profit, buyerName: nil, soldAt: nil, notes: nil)
        let formatted = sale.formattedProfit
        #expect(formatted.contains("$"))
        if profit >= 0 {
            #expect(formatted.hasPrefix("+"))
        }
    }
}

// ═══════════════════════════════════════════════════════════════
// SUITE 3: Platform × Brand Matrix (400 cases)
// Screenshot: SCR-04 listing badge combos, SCR-09 inbox platform
// ═══════════════════════════════════════════════════════════════
@Suite("Platform × Brand Matrix")
struct PlatformBrandMatrixTests {
    @Test("Platform brand combo renders", arguments: platformBrandCombos)
    func platformBrandCombo(combo: (String, String)) {
        let (platform, brand) = combo
        let listing = Listing(
            id: "t-\(platform)-\(brand)", title: "\(brand) on \(platform)",
            description: nil, category: nil, brand: brand, size: "M", condition: "Good",
            price: 100, costPrice: 50, status: .active,
            createdAt: nil, updatedAt: nil, images: nil,
            platformListings: [PlatformListing(
                id: "pl", listingId: "t", platform: platform,
                optimizedTitle: nil, optimizedDescription: nil, hashtags: nil,
                suggestedPrice: nil, platformUrl: nil, status: "published", publishedAt: nil
            )]
        )
        #expect(listing.publishedPlatforms.contains(platform))
        #expect(listing.brand == brand)
        #expect(Theme.platformColor(platform) != .clear)
    }
}

// ═══════════════════════════════════════════════════════════════
// SUITE 4: Brand × Category Matrix (750 cases)
// Screenshot: SCR-04 listing metadata, SCR-06 create form
// ═══════════════════════════════════════════════════════════════
@Suite("Brand × Category Matrix")
struct BrandCategoryMatrixTests {
    @Test("Brand category combo", arguments: brandCategoryCombos)
    func brandCategoryCombo(combo: (String, String)) {
        let (brand, category) = combo
        let listing = Listing(
            id: "t", title: "\(brand) \(category)", description: nil,
            category: category, brand: brand, size: nil, condition: nil,
            price: 75, costPrice: 30, status: .draft,
            createdAt: nil, updatedAt: nil, images: nil, platformListings: nil
        )
        #expect(listing.profit == 45)
        #expect(listing.category == category)
        #expect(listing.brand == brand)
    }
}

// ═══════════════════════════════════════════════════════════════
// SUITE 5: Mass Offer Percentage (841 cases already in pairs)
// Additional: offer × platform × recommendation matrix
// Screenshot: SCR-12 offer card percentage badge
// ═══════════════════════════════════════════════════════════════
@Suite("Mass Offer Matrix")
struct MassOfferMatrixTests {
    private static let offerMatrix: [(String, String)] = {
        let recs = ["accept", "counter", "decline"]
        var combos: [(String, String)] = []
        for platform in TestData.platforms {
            for rec in recs {
                combos.append((platform, rec))
            }
        }
        return combos
    }()

    @Test("Offer platform × recommendation", arguments: offerMatrix)
    func offerPlatformRec(combo: (String, String)) {
        let (platform, rec) = combo
        let offer = Offer(
            id: "t", buyerName: nil, buyerUsername: "buyer",
            listingTitle: "Test Item", platform: platform,
            offerPrice: 70, askingPrice: 100,
            aiRecommendation: rec, aiCounterPrice: 80, profitIfAccept: 20,
            marketAvg: "$85", status: "pending", createdAt: nil
        )
        #expect(offer.platform == platform)
        #expect(offer.aiRecommendation == rec)
        #expect(offer.offerPercent == 70)
    }
}

// ═══════════════════════════════════════════════════════════════
// SUITE 6: Mass Activity Events (2000 cases)
// Screenshot: SCR-13 Live Pulse feed items
// ═══════════════════════════════════════════════════════════════
@Suite("Mass Activity Events")
struct MassActivityEventTests {
    @Test("Activity with price × type", arguments: TestData.activityTypes, extendedPrices.prefix(200))
    func activityPriceType(type: ActivityEvent.ActivityType, price: Double) {
        let event = ActivityEvent(
            type: type, title: "\(type.label) Event",
            description: "Amount: $\(Int(price))",
            timeAgo: "1m", price: price
        )
        #expect(event.formattedPrice == "$\(String(format: "%.0f", price))")
        #expect(event.type == type)
    }

    @Test("Activity with profit × type", arguments: TestData.activityTypes, extendedProfits.prefix(200))
    func activityProfitType(type: ActivityEvent.ActivityType, profit: Double) {
        let event = ActivityEvent(
            type: type, title: "Event",
            description: "Profit event",
            timeAgo: "1m", profit: profit
        )
        #expect(event.formattedProfit != nil)
        #expect(event.formattedProfit!.contains("$"))
    }
}

// ═══════════════════════════════════════════════════════════════
// SUITE 7: Mass Search Results (1600 cases)
// Screenshot: SCR-08 search result grid
// ═══════════════════════════════════════════════════════════════
@Suite("Mass Search Results")
struct MassSearchResultTests {
    @Test("Search result price × platform", arguments: TestData.platforms, extendedPrices.prefix(200))
    func searchPricePlatform(platform: String, price: Double) {
        let result = SearchResult(
            id: "r-\(platform)-\(price)", title: "Item $\(Int(price))",
            price: price, platform: platform,
            images: ["https://img.jpg"], image: nil, url: nil,
            listingUrl: nil, seller: "seller", condition: "Good",
            size: "M", brand: "Nike"
        )
        #expect(result.formattedPrice.hasPrefix("$"))
        #expect(result.primaryImage == "https://img.jpg")
    }
}

// ═══════════════════════════════════════════════════════════════
// SUITE 8: Mass User Display (1500 cases)
// Screenshot: SCR-01 login, SCR-03 greeting, SCR-15 settings
// ═══════════════════════════════════════════════════════════════
@Suite("Mass User Display")
struct MassUserDisplayTests {
    @Test("User display for names", arguments: TestData.userNames)
    func userDisplay(name: String) {
        let user = User(id: "t", email: "\(name)@test.com", username: name,
                       role: "user", onboarded: true, createdAt: nil)
        #expect(!user.displayName.isEmpty)
        #expect(user.initials.count <= 2)
        #expect(user.initials.count >= 1)
    }

    @Test("User admin detection", arguments: ["admin", "user", "moderator", nil, ""] as [String?])
    func adminDetection(role: String?) {
        let user = User(id: "t", email: "test@test.com", username: "testuser",
                       role: role, onboarded: nil, createdAt: nil)
        if role == "admin" {
            #expect(user.isAdmin == true)
        }
    }

    @Test("User display × brand sellers", arguments: TestData.brands)
    func brandSellers(brand: String) {
        let username = brand.lowercased().replacingOccurrences(of: " ", with: "_")
        let user = User(id: "t", email: "\(username)@seller.com", username: username,
                       role: "user", onboarded: true, createdAt: nil)
        #expect(user.displayName == username)
        #expect(!user.initials.isEmpty)
    }
}

// ═══════════════════════════════════════════════════════════════
// SUITE 9: Mass Repricer Scenarios (567 from pairs + extras)
// Screenshot: SCR-14 repricer cards
// ═══════════════════════════════════════════════════════════════
@Suite("Mass Repricer Scenarios")
struct MassRepricerTests {
    private static let actions = ["drop", "raise", "hold", "relist"]
    private static let urgencies = ["low", "medium", "high"]

    @Test("Repricer action × urgency", arguments: actions, urgencies)
    func actionUrgency(action: String, urgency: String) {
        let s = RepriceSuggestion(
            id: "t", title: "Test", currentPrice: 100, suggestedPrice: 85,
            action: action, reason: "Test reason", daysListed: 14, platform: "depop",
            views: 50, likes: 5, brand: "Nike", urgency: urgency, image: nil
        )
        #expect(!s.actionEmoji.isEmpty)
        #expect(s.urgency == urgency)
    }

    @Test("Repricer action × platform", arguments: actions, TestData.platforms)
    func actionPlatform(action: String, platform: String) {
        let s = RepriceSuggestion(
            id: "t", title: "Item on \(platform)", currentPrice: 200, suggestedPrice: 180,
            action: action, reason: nil, daysListed: 7, platform: platform,
            views: nil, likes: nil, brand: nil, urgency: nil, image: nil
        )
        #expect(s.platform == platform)
        #expect(s.priceChange == -20)
    }

    @Test("Repricer days × action", arguments: 0..<60, actions)
    func daysAction(days: Int, action: String) {
        let s = RepriceSuggestion(
            id: "t", title: "Test", currentPrice: 100, suggestedPrice: 90,
            action: action, reason: nil, daysListed: days, platform: nil,
            views: nil, likes: nil, brand: nil, urgency: nil, image: nil
        )
        #expect(s.daysListed == days)
        #expect(s.action == action)
    }
}

// ═══════════════════════════════════════════════════════════════
// SUITE 10: Mass Conversation Rendering (400 cases)
// Screenshot: SCR-09 inbox rows, SCR-10 message bubbles
// ═══════════════════════════════════════════════════════════════
@Suite("Mass Conversations")
struct MassConversationTests {
    @Test("Conversation per platform × unread", arguments: TestData.platforms, [true, false])
    func conversationPlatformUnread(platform: String, unread: Bool) {
        let conv = Conversation(
            id: "t-\(platform)", platform: platform,
            buyerName: "Buyer on \(platform)", buyerUsername: nil,
            buyerAvatar: nil, listingId: nil, listingTitle: "Test Item",
            status: "open", lastMessage: "Hi there", lastMessageAt: nil,
            unread: unread, createdAt: nil, messages: nil
        )
        #expect(conv.displayName == "Buyer on \(platform)")
        #expect(conv.unread == unread)
    }

    @Test("Message sender types", arguments: TestData.platforms, ["buyer", "seller"])
    func messageSender(platform: String, sender: String) {
        let msg = Message(
            id: "m-\(platform)-\(sender)", conversationId: "c",
            sender: sender, content: "Test message on \(platform)",
            platform: platform, read: false, createdAt: nil
        )
        #expect(msg.isSeller == (sender == "seller"))
    }

    @Test("Conversation display name fallbacks", arguments: TestData.userNames.prefix(30))
    func displayNameFallback(name: String) {
        let conv = Conversation(
            id: "t", platform: "depop",
            buyerName: name.isEmpty ? nil : name,
            buyerUsername: "fallback_user",
            buyerAvatar: nil, listingId: nil, listingTitle: nil,
            status: nil, lastMessage: nil, lastMessageAt: nil,
            unread: false, createdAt: nil, messages: nil
        )
        #expect(!conv.displayName.isEmpty)
        if name.isEmpty {
            #expect(conv.displayName == "fallback_user")
        } else {
            #expect(conv.displayName == name)
        }
    }
}
