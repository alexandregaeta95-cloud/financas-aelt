// Web Push server functionality disabled - using native Android Capacitor capture exclusively
export function getPublicKey() {
  return "";
}

export function getSubscriptions(): any[] {
  return [];
}

export function saveSubscriptions(_subs: any[]) {}

export function addSubscription(_sub: any) {}

export async function sendPushNotification(_payload: any) {}

