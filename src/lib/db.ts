import {
  push,
  ref,
  set,
  update
} from "firebase/database";
import { db } from "@/lib/firebase";
import type { AppNotification, AppUserProfile, PriceAlert, WatchItem } from "@/lib/types";

export function userProfileRef(uid: string) {
  return ref(db, `users/${uid}`);
}

export function watchlistRef(uid: string) {
  return ref(db, `watchlists/${uid}`);
}

export function alertsRef(uid: string) {
  return ref(db, `alerts/${uid}`);
}

export function notificationsRef(uid: string) {
  return ref(db, `notifications/${uid}`);
}

export async function upsertUserProfile(profile: AppUserProfile) {
  await set(userProfileRef(profile.uid), profile);
}

export async function saveWatchItem(uid: string, item: WatchItem) {
  await set(ref(db, `watchlists/${uid}/${item.id}`), item);
}

export async function saveAlert(uid: string, alert: PriceAlert) {
  await set(ref(db, `alerts/${uid}/${alert.id}`), alert);
}

export async function patchAlert(uid: string, alertId: string, patch: Partial<PriceAlert>) {
  await update(ref(db, `alerts/${uid}/${alertId}`), patch);
}

export async function createNotification(
  uid: string,
  payload: Omit<AppNotification, "id">
): Promise<AppNotification> {
  const listRef = notificationsRef(uid);
  const itemRef = push(listRef);
  const fallbackId = `notif-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const item: AppNotification = {
    id: itemRef.key ?? fallbackId,
    ...payload
  };

  await set(itemRef, item);
  return item;
}

export async function markNotificationRead(uid: string, notificationId: string) {
  await update(ref(db, `notifications/${uid}/${notificationId}`), { read: true });
}
