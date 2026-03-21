import Foundation

enum DateHelper {
    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    private static let fallbackFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZ"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    private static let shortTimeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .none
        f.timeStyle = .short
        return f
    }()

    private static let mediumDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        f.timeStyle = .none
        return f
    }()

    static func parse(_ string: String) -> Date? {
        isoFormatter.date(from: string) ?? fallbackFormatter.date(from: string)
    }

    static func timeAgo(from string: String) -> String {
        guard let date = parse(string) else { return "" }
        let now = Date()
        let diff = now.timeIntervalSince(date)

        switch diff {
        case ..<60: return "now"
        case ..<3600: return "\(Int(diff / 60))m"
        case ..<86400: return "\(Int(diff / 3600))h"
        case ..<604800: return "\(Int(diff / 86400))d"
        default: return mediumDateFormatter.string(from: date)
        }
    }

    static func shortTime(from string: String) -> String {
        guard let date = parse(string) else { return "" }
        return shortTimeFormatter.string(from: date)
    }

    static func mediumDate(from string: String) -> String {
        guard let date = parse(string) else { return "" }
        return mediumDateFormatter.string(from: date)
    }
}
