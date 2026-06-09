import { db } from "./firebase-admin";

export interface TeacherStyleProfile {
    userId: string;
    preferredSubjects: Record<string, number>;
    preferredResourceTypes: Record<string, number>;
    toneKeywords: string[];
    lastUpdatedAt: string;
}

export async function getStyleProfile(userId: string): Promise<TeacherStyleProfile | null> {
    const doc = await db.collection("teacher_style_profile").doc(userId).get();
    return doc.exists ? (doc.data() as TeacherStyleProfile) : null;
}

/**
 * Recomputes style based on recent activity, asynchronously
 */
export async function recomputeStyleProfile(userId: string) {
    // Fetch recent resources
    const recentResources = await db.collection("teaching_resources")
        .where("userId", "==", userId)
        .orderBy("createdAt", "desc")
        .limit(20)
        .get();

    // Logic to aggregate data: subjects, resource types, keywords...
    const newProfile: Partial<TeacherStyleProfile> = {
        userId,
        lastUpdatedAt: new Date().toISOString()
        // ... aggregation logic
    };

    await db.collection("teacher_style_profile").doc(userId).set(newProfile, { merge: true });
}

export async function getPersonalRecommendations(userId: string) {
    // Logic to query based on embeddings...
}
