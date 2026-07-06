import posthog from 'posthog-js'

// Fire-and-forget — a PostHog failure must never surface to the user
export function track(eventName, properties = {}) {
  try {
    posthog.capture(eventName, properties)
  } catch {}
}

export function identify(userId, traits = {}) {
  try {
    posthog.identify(userId, traits)
  } catch {}
}
