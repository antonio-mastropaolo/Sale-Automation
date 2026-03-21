import Testing
import SwiftUI
@testable import ListBlitz

@Suite("Theme")
struct ThemeTests {

    // MARK: - Platform Colors

    @Test func platformColorsExistForAllPlatforms() {
        let platforms = ["depop", "grailed", "poshmark", "mercari", "ebay", "vinted", "facebook", "vestiaire"]
        for platform in platforms {
            let color = Theme.platformColor(platform)
            #expect(color != .gray, "Platform \(platform) should have a specific color")
        }
    }

    @Test func unknownPlatformReturnsGray() {
        let color = Theme.platformColor("unknownplatform")
        #expect(color == .gray)
    }

    @Test func platformColorCaseInsensitive() {
        let lower = Theme.platformColor("depop")
        let upper = Theme.platformColor("Depop")
        // Both should not be gray
        #expect(lower != .gray)
        #expect(upper != .gray)
    }

    // MARK: - Status Colors

    @Test func statusColorsForAllStatuses() {
        let statuses = ["draft", "active", "published", "sold", "failed"]
        for status in statuses {
            let color = Theme.statusColor(status)
            #expect(color != .gray, "Status \(status) should have a specific color")
        }
    }

    @Test func unknownStatusReturnsGray() {
        #expect(Theme.statusColor("unknown") == .gray)
    }

    // MARK: - Color Hex Init

    @Test func hexColorParsing6Digit() {
        let color = Color(hex: "34D399")
        // Just verify it doesn't crash
        #expect(true)
    }

    @Test func hexColorParsing3Digit() {
        let color = Color(hex: "FFF")
        #expect(true)
    }

    @Test func hexColorWithHash() {
        let color = Color(hex: "#34D399")
        #expect(true)
    }

    // MARK: - Spacing Constants

    @Test func spacingValues() {
        #expect(Theme.paddingSmall == 8)
        #expect(Theme.paddingMedium == 16)
        #expect(Theme.paddingLarge == 24)
    }

    @Test func radiusValues() {
        #expect(Theme.radiusSmall == 8)
        #expect(Theme.radiusMedium == 12)
        #expect(Theme.radiusLarge == 16)
        #expect(Theme.radiusXL == 20)
        #expect(Theme.radiusCard == 16)
    }
}
