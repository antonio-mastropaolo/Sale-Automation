import SwiftUI

struct PlatformBadge: View {
    let platform: String
    var compact: Bool = false

    var body: some View {
        Text(compact ? platformAbbrev : platform.capitalized)
            .font(compact ? .system(size: 10, weight: .bold) : .caption2.bold())
            .foregroundStyle(Theme.platformColor(platform))
            .padding(.horizontal, compact ? 6 : 8)
            .padding(.vertical, compact ? 2 : 4)
            .background(Theme.platformColor(platform).opacity(0.15))
            .clipShape(Capsule())
    }

    private var platformAbbrev: String {
        switch platform.lowercased() {
        case "depop": "DEP"
        case "grailed": "GRL"
        case "poshmark": "PSH"
        case "mercari": "MRC"
        case "ebay": "BAY"
        case "vinted": "VNT"
        case "facebook", "facebook marketplace": "FB"
        case "vestiaire", "vestiaire collective": "VST"
        default: String(platform.prefix(3)).uppercased()
        }
    }
}

struct PlatformIcon: View {
    let platform: String
    var size: CGFloat = 28

    var body: some View {
        ZStack {
            Circle()
                .fill(Theme.platformColor(platform).opacity(0.15))
                .frame(width: size, height: size)

            Text(String(platform.prefix(1)).uppercased())
                .font(.system(size: size * 0.4, weight: .black, design: .rounded))
                .foregroundStyle(Theme.platformColor(platform))
        }
    }
}

#Preview {
    HStack(spacing: 8) {
        PlatformBadge(platform: "depop")
        PlatformBadge(platform: "grailed")
        PlatformBadge(platform: "poshmark")
        PlatformBadge(platform: "mercari", compact: true)
        PlatformBadge(platform: "ebay", compact: true)
    }
    .padding()
    .background(Theme.backgroundPrimary)
}
