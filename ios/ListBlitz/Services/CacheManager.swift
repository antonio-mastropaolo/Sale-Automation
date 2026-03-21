import Foundation

final class CacheManager: @unchecked Sendable {
    static let shared = CacheManager()

    private let cache = NSCache<NSString, CacheEntry>()
    private let queue = DispatchQueue(label: "io.listblitz.cache", attributes: .concurrent)

    private init() {
        cache.countLimit = 200
        cache.totalCostLimit = 50 * 1024 * 1024 // 50MB
    }

    func get<T: Codable>(_ key: String) -> T? {
        queue.sync {
            guard let entry = cache.object(forKey: key as NSString) else { return nil }
            if entry.isExpired {
                cache.removeObject(forKey: key as NSString)
                return nil
            }
            return try? JSONDecoder().decode(T.self, from: entry.data)
        }
    }

    func set<T: Codable>(_ key: String, value: T, ttl: TimeInterval = 300) {
        guard let data = try? JSONEncoder().encode(value) else { return }
        let entry = CacheEntry(data: data, expiresAt: Date().addingTimeInterval(ttl))
        queue.async(flags: .barrier) {
            self.cache.setObject(entry, forKey: key as NSString, cost: data.count)
        }
    }

    func remove(_ key: String) {
        queue.async(flags: .barrier) {
            self.cache.removeObject(forKey: key as NSString)
        }
    }

    func clearAll() {
        queue.async(flags: .barrier) {
            self.cache.removeAllObjects()
        }
    }
}

final class CacheEntry: NSObject {
    let data: Data
    let expiresAt: Date

    var isExpired: Bool { Date() > expiresAt }

    init(data: Data, expiresAt: Date) {
        self.data = data
        self.expiresAt = expiresAt
    }
}
