import {
  push,
  ref,
  set,
  update
} from "firebase/database";
import { getFirebaseDatabase } from "@/lib/firebase";
import type {
  AppNotification,
  AppUserProfile,
  ForumComment,
  PriceAlert,
  WatchItem
} from "@/lib/types";

function requireDb() {
  const db = getFirebaseDatabase();
  if (!db) {
    throw new Error("Firebase Database is only available in the browser.");
  }
  return db;
}

export function userProfileRef(uid: string) {
  return ref(requireDb(), `users/${uid}`);
}

export function watchlistRef(uid: string) {
  return ref(requireDb(), `watchlists/${uid}`);
}

export function alertsRef(uid: string) {
  return ref(requireDb(), `alerts/${uid}`);
}

export function notificationsRef(uid: string) {
  return ref(requireDb(), `notifications/${uid}`);
}

export function forumCommentsRef(stockId: string) {
  return ref(requireDb(), `forums/${stockId}/comments`);
}

export async function upsertUserProfile(profile: AppUserProfile) {
  await set(userProfileRef(profile.uid), profile);
}

export async function saveWatchItem(uid: string, item: WatchItem) {
  await set(ref(requireDb(), `watchlists/${uid}/${item.id}`), item);
}

export async function saveAlert(uid: string, alert: PriceAlert) {
  await set(ref(requireDb(), `alerts/${uid}/${alert.id}`), alert);
}

export async function patchAlert(uid: string, alertId: string, patch: Partial<PriceAlert>) {
  await update(ref(requireDb(), `alerts/${uid}/${alertId}`), patch);
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
  await update(ref(requireDb(), `notifications/${uid}/${notificationId}`), { read: true });
}

export async function createForumComment(
  stockId: string,
  payload: Omit<ForumComment, "id" | "stockId">
): Promise<ForumComment> {
  const listRef = forumCommentsRef(stockId);
  const itemRef = push(listRef);
  const fallbackId = `comment-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const comment: ForumComment = {
    id: itemRef.key ?? fallbackId,
    stockId,
    ...payload
  };

  await set(itemRef, comment);
  return comment;
}
