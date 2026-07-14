const ONBOARDING_KEY = 'sacp_onboarding_dismissed';

export function isOnboardingVisible() {
  return typeof localStorage !== 'undefined' && !localStorage.getItem(ONBOARDING_KEY);
}

export function dismissOnboardingGuide() {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(ONBOARDING_KEY, '1');
  }
}

export { ONBOARDING_KEY };
