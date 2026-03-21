import SwiftUI

// MARK: - iOS-Native OLED Design System v2

enum Theme {
    // MARK: - Accent
    static let accent = Color(hex: "34D399")         // Electric Mint
    static let accentSoft = Color(hex: "059669")      // Muted mint

    // MARK: - Backgrounds (OLED-optimized)
    static let backgroundPrimary = Color.black        // Pure OLED black
    static let backgroundSecondary = Color(hex: "1C1C1E") // iOS systemGray6
    static let backgroundCard = Color(hex: "1C1C1E")
    static let backgroundElevated = Color(hex: "2C2C2E")  // iOS systemGray5
    static let backgroundTertiary = Color(hex: "3A3A3C")   // iOS systemGray4

    // MARK: - iOS System Colors
    static let iosBlue = Color(hex: "0A84FF")
    static let iosGreen = Color(hex: "30D158")
    static let iosOrange = Color(hex: "FF9F0A")
    static let iosRed = Color(hex: "FF453A")
    static let iosYellow = Color(hex: "FFD60A")
    static let iosPurple = Color(hex: "BF5AF2")
    static let iosPink = Color(hex: "FF375F")
    static let iosTeal = Color(hex: "64D2FF")
    static let iosIndigo = Color(hex: "5E5CE6")

    // MARK: - Text (iOS standard)
    static let textPrimary = Color.white
    static let textSecondary = Color.white.opacity(0.8)
    static let textTertiary = Color.white.opacity(0.3)

    // MARK: - Semantic
    static let success = Color(hex: "30D158")
    static let warning = Color(hex: "FF9F0A")
    static let error = Color(hex: "FF453A")
    static let info = Color(hex: "0A84FF")
    static let gold = Color(hex: "FFD60A")

    // MARK: - Platform Colors
    static func platformColor(_ platform: String) -> Color {
        switch platform.lowercased() {
        case "depop": Color(hex: "FF2300")
        case "grailed": Color(hex: "8B8B8B")
        case "poshmark": Color(hex: "C13584")
        case "mercari": Color(hex: "4DC8F1")
        case "ebay": Color(hex: "E53238")
        case "vinted": Color(hex: "09B1BA")
        case "facebook", "facebook marketplace": Color(hex: "1877F2")
        case "vestiaire", "vestiaire collective": Color(hex: "D4A843")
        default: .gray
        }
    }

    static func statusColor(_ status: String) -> Color {
        switch status.lowercased() {
        case "draft": iosYellow
        case "active", "published": iosGreen
        case "sold": iosTeal
        case "failed": iosRed
        default: .gray
        }
    }

    // MARK: - Gradients
    static let accentGradient = LinearGradient(
        colors: [accent, accentSoft],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    static let heroGradient = LinearGradient(
        colors: [accent, .white],
        startPoint: .bottomLeading,
        endPoint: .topTrailing
    )

    // MARK: - Spacing
    static let paddingSmall: CGFloat = 8
    static let paddingMedium: CGFloat = 16
    static let paddingLarge: CGFloat = 24

    // MARK: - Corner Radius (iOS 18 scale)
    static let radiusSmall: CGFloat = 8
    static let radiusMedium: CGFloat = 12
    static let radiusLarge: CGFloat = 16
    static let radiusXL: CGFloat = 20
    static let radiusCard: CGFloat = 16
}

// MARK: - Color Hex Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default: (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255, opacity: Double(a) / 255)
    }
}

// MARK: - View Modifiers

struct CardStyle: ViewModifier {
    var padding: CGFloat = Theme.paddingMedium
    func body(content: Content) -> some View {
        content
            .padding(padding)
            .background(Theme.backgroundCard)
            .clipShape(RoundedRectangle(cornerRadius: Theme.radiusCard, style: .continuous))
    }
}

struct GlassCard: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(Theme.paddingMedium)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: Theme.radiusCard, style: .continuous))
    }
}

extension View {
    func cardStyle(padding: CGFloat = Theme.paddingMedium) -> some View {
        modifier(CardStyle(padding: padding))
    }
    func glassCard() -> some View {
        modifier(GlassCard())
    }
}
