// TEMPORARY MOCK DATA — no notification service exists yet (plan §18).
// Tiers follow UI_ATLAS GP-04: critical / urgent / routine / digest.
// Operational content only — nothing clinical.

export type NotificationTier = 'critical' | 'urgent' | 'routine' | 'digest'

export interface Notification {
  id: string
  tier: NotificationTier
  text: string
  time: string
}

export const notifications: Notification[] = [
  {
    id: 'ntf-1',
    tier: 'urgent',
    text: 'Attendant pass limit reached — Ward 4B',
    time: '8 min ago',
  },
  {
    id: 'ntf-2',
    tier: 'routine',
    text: 'Consultation started — Dr. Arun Kumar',
    time: '15 min ago',
  },
  {
    id: 'ntf-3',
    tier: 'digest',
    text: "6 counters opened for today's shift",
    time: '1 hr ago',
  },
]
