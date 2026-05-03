import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

initializeApp({
  projectId: config.projectId
});
const db = getFirestore(config.firestoreDatabaseId);

async function test() {
  try {
    await db.collection('test_admin').doc('ping').set({ timestamp: FieldValue.serverTimestamp() });
    const doc = await db.collection('test_admin').doc('ping').get();
    console.log("Success! Data:", doc.data());
  } catch(e) {
    console.error("Failed:", e);
  }
}

test();
