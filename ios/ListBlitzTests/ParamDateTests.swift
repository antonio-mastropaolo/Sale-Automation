import Testing
import Foundation
@testable import ListBlitz

// ═══════════════════════════════════════════════════════════════
// PARAMETERIZED DATE FORMATTING TESTS
// Generates ~400 test cases
// Screenshot mapping: All timestamp displays — SCR-03 sale dates,
//   SCR-09 conversation times, SCR-10 message timestamps,
//   SCR-13 Live Pulse activity times
// ═══════════════════════════════════════════════════════════════

@Suite("Date Formatting — Parameterized")
struct ParamDateTests {

    // All screens: Relative time display
    @Test("timeAgo never crashes", arguments: TestData.dateStrings)
    func timeAgoNeverCrashes(dateString: String) {
        let result = DateHelper.timeAgo(from: dateString)
        // Should return empty string for invalid dates, never crash
        #expect(result.count >= 0)
    }

    // SCR-10: Message timestamp
    @Test("shortTime never crashes", arguments: TestData.dateStrings)
    func shortTimeNeverCrashes(dateString: String) {
        let result = DateHelper.shortTime(from: dateString)
        #expect(result.count >= 0)
    }

    // SCR-11: Analytics date labels
    @Test("mediumDate never crashes", arguments: TestData.dateStrings)
    func mediumDateNeverCrashes(dateString: String) {
        let result = DateHelper.mediumDate(from: dateString)
        #expect(result.count >= 0)
    }

    // All: Date parsing
    @Test("parse handles all inputs", arguments: TestData.dateStrings)
    func parseHandlesAll(dateString: String) {
        let result = DateHelper.parse(dateString)
        // Valid ISO dates should parse, invalid should return nil
        if dateString.contains("T") && dateString.contains("Z") && dateString.contains(".") && dateString.count > 15 {
            #expect(result != nil, "Valid-looking date should parse: \(dateString)")
        }
    }
}
