/**
 * Mock auth helper for the CV Assistant feature.
 */

export const MOCK_USER_ID = 'mock-user-cv-assistant'

export async function getCurrentUserId() {
  return MOCK_USER_ID
}
