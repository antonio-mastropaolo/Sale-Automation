import Testing
import Foundation
@testable import ListBlitz

@Suite("Date Helper")
struct DateHelperTests {

    @Test func parseISO8601() {
        let date = DateHelper.parse("2026-03-20T09:30:00.000Z")
        #expect(date != nil)
    }

    @Test func parseInvalidReturnsNil() {
        let date = DateHelper.parse("not-a-date")
        #expect(date == nil)
    }

    @Test func timeAgoRecent() {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let now = formatter.string(from: Date())
        let result = DateHelper.timeAgo(from: now)
        #expect(!result.isEmpty)
    }

    @Test func timeAgoInvalidReturnsEmpty() {
        #expect(DateHelper.timeAgo(from: "invalid") == "")
    }

    @Test func shortTimeNotEmpty() {
        let result = DateHelper.shortTime(from: "2026-03-20T14:30:00.000Z")
        #expect(!result.isEmpty)
    }

    @Test func mediumDateNotEmpty() {
        let result = DateHelper.mediumDate(from: "2026-03-20T14:30:00.000Z")
        #expect(!result.isEmpty)
    }

    @Test func shortTimeInvalidReturnsEmpty() {
        #expect(DateHelper.shortTime(from: "invalid") == "")
    }
}
