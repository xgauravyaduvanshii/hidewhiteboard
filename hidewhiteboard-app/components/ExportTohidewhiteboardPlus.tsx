import React from "react";
import { uploadBytes, ref } from "firebase/storage";
import { nanoid } from "nanoid";

import { trackEvent } from "@hidewhiteboard/hidewhiteboard/analytics";
import { Card } from "@hidewhiteboard/hidewhiteboard/components/Card";
import { hidewhiteboardLogo as HidewhiteboardLogo } from "@hidewhiteboard/hidewhiteboard/components/hidewhiteboardLogo";
import { ToolButton } from "@hidewhiteboard/hidewhiteboard/components/ToolButton";
import { MIME_TYPES, getFrame } from "@hidewhiteboard/common";
import {
  encryptData,
  generateEncryptionKey,
} from "@hidewhiteboard/hidewhiteboard/data/encryption";
import { serializeAsJSON } from "@hidewhiteboard/hidewhiteboard/data/json";
import { isInitializedImageElement } from "@hidewhiteboard/element";
import { useI18n } from "@hidewhiteboard/hidewhiteboard/i18n";

import type {
  FileId,
  NonDeletedhidewhiteboardElement,
} from "@hidewhiteboard/element/types";
import type {
  AppState,
  BinaryFileData,
  BinaryFiles,
} from "@hidewhiteboard/hidewhiteboard/types";

import { FILE_UPLOAD_MAX_BYTES } from "../app_constants";
import { encodeFilesForUpload } from "../data/FileManager";
import { loadFirebaseStorage, saveFilesToFirebase } from "../data/firebase";

export const exportTohidewhiteboardPlus = async (
  elements: readonly NonDeletedhidewhiteboardElement[],
  appState: Partial<AppState>,
  files: BinaryFiles,
  name: string,
) => {
  const storage = await loadFirebaseStorage();

  const id = `${nanoid(12)}`;

  const encryptionKey = (await generateEncryptionKey())!;
  const encryptedData = await encryptData(
    encryptionKey,
    serializeAsJSON(elements, appState, files, "database"),
  );

  const blob = new Blob(
    [encryptedData.iv, new Uint8Array(encryptedData.encryptedBuffer)],
    {
      type: MIME_TYPES.binary,
    },
  );

  const storageRef = ref(storage, `/migrations/scenes/${id}`);
  await uploadBytes(storageRef, blob, {
    customMetadata: {
      data: JSON.stringify({ version: 2, name }),
      created: Date.now().toString(),
    },
  });

  const filesMap = new Map<FileId, BinaryFileData>();
  for (const element of elements) {
    if (isInitializedImageElement(element) && files[element.fileId]) {
      filesMap.set(element.fileId, files[element.fileId]);
    }
  }

  if (filesMap.size) {
    const filesToUpload = await encodeFilesForUpload({
      files: filesMap,
      encryptionKey,
      maxBytes: FILE_UPLOAD_MAX_BYTES,
    });

    await saveFilesToFirebase({
      prefix: `/migrations/files/scenes/${id}`,
      files: filesToUpload,
    });
  }

  window.open(
    `${
      import.meta.env.VITE_APP_PLUS_APP
    }/import?hidewhiteboard=${id},${encryptionKey}`,
  );
};

export const ExportTohidewhiteboardPlus: React.FC<{
  elements: readonly NonDeletedhidewhiteboardElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
  name: string;
  onError: (error: Error) => void;
  onSuccess: () => void;
}> = ({ elements, appState, files, name, onError, onSuccess }) => {
  const { t } = useI18n();
  return (
    <Card color="primary">
      <div className="Card-icon">
        <HidewhiteboardLogo
          style={{
            [`--color-logo-icon` as any]: "#fff",
            width: "2.8rem",
            height: "2.8rem",
          }}
        />
      </div>
      <h2>hidewhiteboard+</h2>
      <div className="Card-details">
        {t("exportDialog.hidewhiteboardplus_description")}
      </div>
      <ToolButton
        className="Card-button"
        type="button"
        title={t("exportDialog.hidewhiteboardplus_button")}
        aria-label={t("exportDialog.hidewhiteboardplus_button")}
        showAriaLabel={true}
        onClick={async () => {
          try {
            trackEvent("export", "eplus", `ui (${getFrame()})`);
            await exportTohidewhiteboardPlus(elements, appState, files, name);
            onSuccess();
          } catch (error: any) {
            console.error(error);
            if (error.name !== "AbortError") {
              onError(new Error(t("exportDialog.hidewhiteboardplus_exportError")));
            }
          }
        }}
      />
    </Card>
  );
};
