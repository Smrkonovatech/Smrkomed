/**
 * In-memory scoped booking session store with TTL auto-expiration.
 * Tracks active state machines per channel / contact phone.
 */

import type { BookingSession, BookingChannel, BookingState } from "./types";

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutes

class BookingSessionStore {
  private sessions = new Map<string, BookingSession>();

  /**
   * Generates a composite lookup key for phone + clinic.
   */
  private phoneKey(clinicId: string, phone: string): string {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    return `${clinicId}:phone:${cleanPhone}`;
  }

  public get(id: string): BookingSession | null {
    const session = this.sessions.get(id);
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      this.sessions.delete(id);
      return null;
    }
    return session;
  }

  public getActiveByPhone(clinicId: string, phone: string): BookingSession | null {
    const key = this.phoneKey(clinicId, phone);
    for (const session of this.sessions.values()) {
      if (
        session.clinicId === clinicId &&
        this.phoneKey(clinicId, session.contactPhone) === key &&
        session.status === "ACTIVE"
      ) {
        if (session.expiresAt.getTime() < Date.now()) {
          this.sessions.delete(session.id);
          continue;
        }
        return session;
      }
    }
    return null;
  }

  public create(params: {
    channel: BookingChannel;
    clinicId: string;
    organizationId: string;
    contactPhone: string;
    initialStep?: BookingState;
  }): BookingSession {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    const id = `bks_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const session: BookingSession = {
      id,
      channel: params.channel,
      clinicId: params.clinicId,
      organizationId: params.organizationId,
      contactPhone: params.contactPhone,
      isExistingPatient: false,
      registrationDraft: {},
      appointmentType: "Consultation",
      currentStep: params.initialStep || "IDENTIFY_PATIENT",
      stepHistory: [],
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
      expiresAt,
    };

    this.sessions.set(id, session);
    return session;
  }

  public save(session: BookingSession): BookingSession {
    session.updatedAt = new Date();
    session.expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    this.sessions.set(session.id, session);
    return session;
  }

  public delete(id: string): boolean {
    return this.sessions.delete(id);
  }

  public clear(): void {
    this.sessions.clear();
  }

  /**
   * Periodic purge of expired sessions.
   */
  public purgeExpired(): number {
    const now = Date.now();
    let count = 0;
    for (const [id, session] of this.sessions.entries()) {
      if (session.expiresAt.getTime() < now) {
        this.sessions.delete(id);
        count++;
      }
    }
    return count;
  }
}

export const bookingSessionStore = new BookingSessionStore();
