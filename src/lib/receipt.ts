import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

const RECEIPTS_DIR = `${FileSystem.documentDirectory}receipts/`;

/**
 * Capture a receipt photo. Returns a (temporary) image URI, or null if
 * cancelled / denied. Pass `fromLibrary` to pick an existing photo instead.
 */
export async function captureReceipt(fromLibrary = false): Promise<string | null> {
  if (fromLibrary) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return null;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    return res.canceled ? null : res.assets[0].uri;
  }

  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) return null;
  const res = await ImagePicker.launchCameraAsync({ quality: 1 });
  return res.canceled ? null : res.assets[0].uri;
}

async function ensureDir() {
  const info = await FileSystem.getInfoAsync(RECEIPTS_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(RECEIPTS_DIR, { intermediates: true });
  }
}

/**
 * Compress + downscale a captured photo and copy it into the app's private
 * receipts folder as `<id>.jpg`. Returns the permanent URI (or the original
 * if anything fails). This is what we store on the transaction.
 */
export async function persistReceipt(uri: string, id: string): Promise<string> {
  await ensureDir();
  const manipulated = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1500 } }],
    { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG },
  );
  const dest = `${RECEIPTS_DIR}${id}.jpg`;
  await FileSystem.copyAsync({ from: manipulated.uri, to: dest });
  return dest;
}

/** Best-effort delete of a stored receipt (called when a transaction is removed). */
export async function deleteReceipt(uri?: string): Promise<void> {
  if (!uri || !uri.startsWith(RECEIPTS_DIR)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // ignore
  }
}
