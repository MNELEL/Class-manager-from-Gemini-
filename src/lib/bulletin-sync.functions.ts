import { db } from "./firebase-admin";
import { generateEmbedding } from "./embeddings.server";

/**
 * Suggests resources for the current week based on bulletin study points
 */
export async function suggestResourcesForCurrentWeek(bulletinId: string, userId: string) {
    // 1. Get bulletin study points
    const bulletinSnap = await db.collection("weekly_bulletins").doc(bulletinId).get();
    if (!bulletinSnap.exists) throw new Error("Bulletin not found");
    
    const studyPoints = bulletinSnap.data()?.studyPoints || "";
    
    // 2. Generate embedding for study points
    const embedding = await generateEmbedding(studyPoints);
    
    // 3. Search for similar resources (using a simulated vector search if limited, 
    // but in Firebase, we might need a simpler query or a field for vector-distance emulation)
    // Assuming we have a 'vector' field in resources
    const resources = await db.collection("teaching_resources")
        .where("userId", "==", userId)
        // .orderBy("vector", ...) // Simplified: you need actual vector DB implementation
        .limit(5)
        .get();
        
    return resources.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Links a resource to a bulletin
 */
export async function linkResourceToBulletin(bulletinId: string, resourceId: string) {
    await db.collection("bulletin_resources").add({
        bulletinId,
        resourceId,
        createdAt: new Date().toISOString()
    });
}
