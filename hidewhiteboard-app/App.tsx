import {
  Hidewhiteboard,
  TTDDialogTrigger,
  CaptureUpdateAction,
  reconcileElements,
  useEditorInterface,
} from "@hidewhiteboard/hidewhiteboard";
import { trackEvent } from "@hidewhiteboard/hidewhiteboard/analytics";
import { getDefaultAppState } from "@hidewhiteboard/hidewhiteboard/appState";
import {
  CommandPalette,
  DEFAULT_CATEGORIES,
} from "@hidewhiteboard/hidewhiteboard/components/CommandPalette/CommandPalette";
import { ErrorDialog } from "@hidewhiteboard/hidewhiteboard/components/ErrorDialog";
import { OverwriteConfirmDialog } from "@hidewhiteboard/hidewhiteboard/components/OverwriteConfirm/OverwriteConfirm";
import { openConfirmModal } from "@hidewhiteboard/hidewhiteboard/components/OverwriteConfirm/OverwriteConfirmState";
import { ShareableLinkDialog } from "@hidewhiteboard/hidewhiteboard/components/ShareableLinkDialog";
import Trans from "@hidewhiteboard/hidewhiteboard/components/Trans";
import {
  APP_NAME,
  EVENT,
  THEME,
  VERSION_TIMEOUT,
  debounce,
  getVersion,
  getFrame,
  isTestEnv,
  preventUnload,
  resolvablePromise,
  isRunningInIframe,
  isDevEnv,
} from "@hidewhiteboard/common";
import polyfill from "@hidewhiteboard/hidewhiteboard/polyfill";
import { useCallback, useEffect, useRef, useState } from "react";
import { loadFromBlob } from "@hidewhiteboard/hidewhiteboard/data/blob";
import { useCallbackRefState } from "@hidewhiteboard/hidewhiteboard/hooks/useCallbackRefState";
import { t } from "@hidewhiteboard/hidewhiteboard/i18n";

import {
  usersIcon,
  exportToPlus,
  share,
} from "@hidewhiteboard/hidewhiteboard/components/icons";
import { isElementLink } from "@hidewhiteboard/element";
import {
  bumpElementVersions,
  restoreAppState,
  restoreElements,
} from "@hidewhiteboard/hidewhiteboard/data/restore";
import { newElementWith } from "@hidewhiteboard/element";
import { isInitializedImageElement } from "@hidewhiteboard/element";
import clsx from "clsx";
import {
  parseLibraryTokensFromUrl,
  useHandleLibrary,
} from "@hidewhiteboard/hidewhiteboard/data/library";

import type { RemotehidewhiteboardElement } from "@hidewhiteboard/hidewhiteboard/data/reconcile";
import type { RestoredDataState } from "@hidewhiteboard/hidewhiteboard/data/restore";
import type {
  FileId,
  NonDeletedhidewhiteboardElement,
  OrderedhidewhiteboardElement,
} from "@hidewhiteboard/element/types";
import type {
  AppState,
  hidewhiteboardImperativeAPI,
  BinaryFiles,
  hidewhiteboardInitialDataState,
  UIAppState,
} from "@hidewhiteboard/hidewhiteboard/types";
import type { ResolutionType } from "@hidewhiteboard/common/utility-types";
import type { ResolvablePromise } from "@hidewhiteboard/common/utils";

import CustomStats from "./CustomStats";
import {
  Provider,
  useAtom,
  useSetAtom,
  useAtomValue,
  useAtomWithInitialValue,
  appJotaiStore,
} from "./app-jotai";
import {
  FIREBASE_STORAGE_PREFIXES,
  STORAGE_KEYS,
  SYNC_BROWSER_TABS_TIMEOUT,
} from "./app_constants";
import Collab, {
  collabAPIAtom,
  isCollaboratingAtom,
  isOfflineAtom,
} from "./collab/Collab";
import { AppFooter } from "./components/AppFooter";
import { HelpCenterDialog } from "./components/HelpCenterDialog";
import { LLMSettingsDialog } from "./components/LLMSettingsDialog";
import { AppMainMenu } from "./components/AppMainMenu";
import {
  ExportTohidewhiteboardPlus,
  exportTohidewhiteboardPlus,
} from "./components/ExportTohidewhiteboardPlus";
import { TopErrorBoundary } from "./components/TopErrorBoundary";

import {
  exportToBackend,
  getCollaborationLinkData,
  importFromBackend,
  isCollaborationLink,
} from "./data";

import { updateStaleImageStatuses } from "./data/FileManager";
import {
  importFromLocalStorage,
  importUsernameFromLocalStorage,
} from "./data/localStorage";

import { loadFilesFromFirebase } from "./data/firebase";
import {
  LibraryIndexedDBAdapter,
  LibraryLocalStorageMigrationAdapter,
  LocalData,
  localStorageQuotaExceededAtom,
} from "./data/LocalData";
import { isBrowserStorageStateNewer } from "./data/tabSync";
import { ShareDialog, shareDialogStateAtom } from "./share/ShareDialog";
import CollabError, { collabErrorIndicatorAtom } from "./collab/CollabError";
import { useHandleAppTheme } from "./useHandleAppTheme";
import { getPreferredLanguage } from "./app-language/language-detector";
import { useAppLangCode } from "./app-language/language-state";
import DebugCanvas, {
  debugRenderer,
  isVisualDebuggerEnabled,
  loadSavedDebugState,
} from "./components/DebugCanvas";
import { AIComponents } from "./components/AI";
import { HidewhiteboardPlusIframeExport } from "./hidewhiteboardPlusIframeExport";

import "./index.scss";

import { AppSidebar } from "./components/AppSidebar";
import { AIFloatingComposer } from "./components/AIFloatingComposer";
import { AIAgentPanel } from "./components/AIAgentPanel";
import { aiAgenthidewhiteboardAPIAtom } from "./components/aiAgentState";

import type { CollabAPI } from "./collab/Collab";

polyfill();

window.HIDEWHITEBOARD_THROTTLE_RENDER = true;

declare global {
  interface BeforeInstallPromptEventChoiceResult {
    outcome: "accepted" | "dismissed";
  }

  interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<BeforeInstallPromptEventChoiceResult>;
  }

  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

let pwaEvent: BeforeInstallPromptEvent | null = null;
type ToolbarSide = "top" | "bottom" | "left" | "right";

// Adding a listener outside of the component as it may (?) need to be
// subscribed early to catch the event.
//
// Also note that it will fire only if certain heuristics are met (user has
// used the app for some time, etc.)
window.addEventListener(
  "beforeinstallprompt",
  (event: BeforeInstallPromptEvent) => {
    // prevent Chrome <= 67 from automatically showing the prompt
    event.preventDefault();
    // cache for later use
    pwaEvent = event;
  },
);

let isSelfEmbedding = false;

if (window.self !== window.top) {
  try {
    const parentUrl = new URL(document.referrer);
    const currentUrl = new URL(window.location.href);
    if (parentUrl.origin === currentUrl.origin) {
      isSelfEmbedding = true;
    }
  } catch (error) {
    // ignore
  }
}

const shareableLinkConfirmDialog = {
  title: t("overwriteConfirm.modal.shareableLink.title"),
  description: (
    <Trans
      i18nKey="overwriteConfirm.modal.shareableLink.description"
      bold={(text) => <strong>{text}</strong>}
      br={() => <br />}
    />
  ),
  actionLabel: t("overwriteConfirm.modal.shareableLink.button"),
  color: "danger",
} as const;

const initializeScene = async (opts: {
  collabAPI: CollabAPI | null;
  hidewhiteboardAPI: hidewhiteboardImperativeAPI;
}): Promise<
  { scene: hidewhiteboardInitialDataState | null } & (
    | { isExternalScene: true; id: string; key: string }
    | { isExternalScene: false; id?: null; key?: null }
  )
> => {
  const searchParams = new URLSearchParams(window.location.search);
  const id = searchParams.get("id");
  const jsonBackendMatch = window.location.hash.match(
    /^#json=([a-zA-Z0-9_-]+),([a-zA-Z0-9_-]+)$/,
  );
  const externalUrlMatch = window.location.hash.match(/^#url=(.*)$/);

  const localDataState = importFromLocalStorage();

  let scene: Omit<
    RestoredDataState,
    // we're not storing files in the scene database/localStorage, and instead
    // fetch them async from a different store
    "files"
  > & {
    scrollToContent?: boolean;
  } = {
    elements: restoreElements(localDataState?.elements, null, {
      repairBindings: true,
      deleteInvisibleElements: true,
    }),
    appState: restoreAppState(localDataState?.appState, null),
  };

  let roomLinkData = getCollaborationLinkData(window.location.href);
  const isExternalScene = !!(id || jsonBackendMatch || roomLinkData);
  if (isExternalScene) {
    if (
      // don't prompt if scene is empty
      !scene.elements.length ||
      // don't prompt for collab scenes because we don't override local storage
      roomLinkData ||
      // otherwise, prompt whether user wants to override current scene
      (await openConfirmModal(shareableLinkConfirmDialog))
    ) {
      if (jsonBackendMatch) {
        const imported = await importFromBackend(
          jsonBackendMatch[1],
          jsonBackendMatch[2],
        );

        scene = {
          elements: bumpElementVersions(
            restoreElements(imported.elements, null, {
              repairBindings: true,
              deleteInvisibleElements: true,
            }),
            localDataState?.elements,
          ),
          appState: restoreAppState(
            imported.appState,
            // local appState when importing from backend to ensure we restore
            // localStorage user settings which we do not persist on server.
            localDataState?.appState,
          ),
        };
      }
      scene.scrollToContent = true;
      if (!roomLinkData) {
        window.history.replaceState({}, APP_NAME, window.location.origin);
      }
    } else {
      // issue reference kept generic for custom fork
      if (document.hidden) {
        return new Promise((resolve, reject) => {
          window.addEventListener(
            "focus",
            () => initializeScene(opts).then(resolve).catch(reject),
            {
              once: true,
            },
          );
        });
      }

      roomLinkData = null;
      window.history.replaceState({}, APP_NAME, window.location.origin);
    }
  } else if (externalUrlMatch) {
    window.history.replaceState({}, APP_NAME, window.location.origin);

    const url = externalUrlMatch[1];
    try {
      const request = await fetch(window.decodeURIComponent(url));
      const data = await loadFromBlob(await request.blob(), null, null);
      if (
        !scene.elements.length ||
        (await openConfirmModal(shareableLinkConfirmDialog))
      ) {
        return { scene: data, isExternalScene };
      }
    } catch (error: any) {
      return {
        scene: {
          appState: {
            errorMessage: t("alerts.invalidSceneUrl"),
          },
        },
        isExternalScene,
      };
    }
  }

  if (roomLinkData && opts.collabAPI) {
    const { hidewhiteboardAPI } = opts;

    const scene = await opts.collabAPI.startCollaboration(roomLinkData);

    return {
      // when collaborating, the state may have already been updated at this
      // point (we may have received updates from other clients), so reconcile
      // elements and appState with existing state
      scene: {
        ...scene,
        appState: {
          ...restoreAppState(
            {
              ...scene?.appState,
              theme: localDataState?.appState?.theme || scene?.appState?.theme,
            },
            hidewhiteboardAPI.getAppState(),
          ),
          // necessary if we're invoking from a hashchange handler which doesn't
          // go through App.initializeScene() that resets this flag
          isLoading: false,
        },
        elements: reconcileElements(
          scene?.elements || [],
          hidewhiteboardAPI.getSceneElementsIncludingDeleted() as RemotehidewhiteboardElement[],
          hidewhiteboardAPI.getAppState(),
        ),
      },
      isExternalScene: true,
      id: roomLinkData.roomId,
      key: roomLinkData.roomKey,
    };
  } else if (scene) {
    return isExternalScene && jsonBackendMatch
      ? {
          scene,
          isExternalScene,
          id: jsonBackendMatch[1],
          key: jsonBackendMatch[2],
        }
      : { scene, isExternalScene: false };
  }
  return { scene: null, isExternalScene: false };
};

const HidewhiteboardWrapper = () => {
  const [errorMessage, setErrorMessage] = useState("");
  const isCollabDisabled = isRunningInIframe();

  const { editorTheme, appTheme, setAppTheme } = useHandleAppTheme();

  const [langCode, setLangCode] = useAppLangCode();

  const editorInterface = useEditorInterface();
  const [toolbarSide, setToolbarSide] = useState<ToolbarSide>(() => {
    const savedToolbarSide = localStorage.getItem(
      STORAGE_KEYS.LOCAL_STORAGE_TOOLBAR_SIDE,
    );

    if (
      savedToolbarSide === "top" ||
      savedToolbarSide === "bottom" ||
      savedToolbarSide === "left" ||
      savedToolbarSide === "right"
    ) {
      return savedToolbarSide;
    }

    return "bottom";
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LOCAL_STORAGE_TOOLBAR_SIDE, toolbarSide);
  }, [toolbarSide]);

  // initial state
  // ---------------------------------------------------------------------------

  const initialStatePromiseRef = useRef<{
    promise: ResolvablePromise<hidewhiteboardInitialDataState | null>;
  }>({ promise: null! });
  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise =
      resolvablePromise<hidewhiteboardInitialDataState | null>();
  }

  const debugCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    trackEvent("load", "frame", getFrame());
    // Delayed so that the app has a time to load the latest SW
    setTimeout(() => {
      trackEvent("load", "version", getVersion());
    }, VERSION_TIMEOUT);
  }, []);

  const [hidewhiteboardAPI, hidewhiteboardRefCallback] =
    useCallbackRefState<hidewhiteboardImperativeAPI>();
  const setAiAgenthidewhiteboardAPI = useSetAtom(aiAgenthidewhiteboardAPIAtom);

  useEffect(() => {
    setAiAgenthidewhiteboardAPI(hidewhiteboardAPI ?? null);
  }, [hidewhiteboardAPI, setAiAgenthidewhiteboardAPI]);

  const [, setShareDialogState] = useAtom(shareDialogStateAtom);
  const [collabAPI] = useAtom(collabAPIAtom);
  const [isCollaborating] = useAtomWithInitialValue(isCollaboratingAtom, () => {
    return isCollaborationLink(window.location.href);
  });
  const collabError = useAtomValue(collabErrorIndicatorAtom);

  useHandleLibrary({
    hidewhiteboardAPI,
    adapter: LibraryIndexedDBAdapter,
    // TODO maybe remove this in several months (shipped: 24-03-11)
    migrationAdapter: LibraryLocalStorageMigrationAdapter,
  });

  const [, forceRefresh] = useState(false);

  useEffect(() => {
    if (isDevEnv()) {
      const debugState = loadSavedDebugState();

      if (debugState.enabled && !window.visualDebug) {
        window.visualDebug = {
          data: [],
        };
      } else {
        delete window.visualDebug;
      }
      forceRefresh((prev) => !prev);
    }
  }, [hidewhiteboardAPI]);

  useEffect(() => {
    if (!hidewhiteboardAPI || (!isCollabDisabled && !collabAPI)) {
      return;
    }

    const loadImages = (
      data: ResolutionType<typeof initializeScene>,
      isInitialLoad = false,
    ) => {
      if (!data.scene) {
        return;
      }
      if (collabAPI?.isCollaborating()) {
        if (data.scene.elements) {
          collabAPI
            .fetchImageFilesFromFirebase({
              elements: data.scene.elements,
              forceFetchFiles: true,
            })
            .then(({ loadedFiles, erroredFiles }) => {
              hidewhiteboardAPI.addFiles(loadedFiles);
              updateStaleImageStatuses({
                hidewhiteboardAPI,
                erroredFiles,
                elements: hidewhiteboardAPI.getSceneElementsIncludingDeleted(),
              });
            });
        }
      } else {
        const fileIds =
          data.scene.elements?.reduce((acc, element) => {
            if (isInitializedImageElement(element)) {
              return acc.concat(element.fileId);
            }
            return acc;
          }, [] as FileId[]) || [];

        if (data.isExternalScene) {
          loadFilesFromFirebase(
            `${FIREBASE_STORAGE_PREFIXES.shareLinkFiles}/${data.id}`,
            data.key,
            fileIds,
          ).then(({ loadedFiles, erroredFiles }) => {
            hidewhiteboardAPI.addFiles(loadedFiles);
            updateStaleImageStatuses({
              hidewhiteboardAPI,
              erroredFiles,
              elements: hidewhiteboardAPI.getSceneElementsIncludingDeleted(),
            });
          });
        } else if (isInitialLoad) {
          if (fileIds.length) {
            LocalData.fileStorage
              .getFiles(fileIds)
              .then(({ loadedFiles, erroredFiles }) => {
                if (loadedFiles.length) {
                  hidewhiteboardAPI.addFiles(loadedFiles);
                }
                updateStaleImageStatuses({
                  hidewhiteboardAPI,
                  erroredFiles,
                  elements: hidewhiteboardAPI.getSceneElementsIncludingDeleted(),
                });
              });
          }
          // on fresh load, clear unused files from IDB (from previous
          // session)
          LocalData.fileStorage.clearObsoleteFiles({ currentFileIds: fileIds });
        }
      }
    };

    initializeScene({ collabAPI, hidewhiteboardAPI }).then(async (data) => {
      loadImages(data, /* isInitialLoad */ true);
      initialStatePromiseRef.current.promise.resolve(data.scene);
    });

    const onHashChange = async (event: HashChangeEvent) => {
      event.preventDefault();
      const libraryUrlTokens = parseLibraryTokensFromUrl();
      if (!libraryUrlTokens) {
        if (
          collabAPI?.isCollaborating() &&
          !isCollaborationLink(window.location.href)
        ) {
          collabAPI.stopCollaboration(false);
        }
        hidewhiteboardAPI.updateScene({ appState: { isLoading: true } });

        initializeScene({ collabAPI, hidewhiteboardAPI }).then((data) => {
          loadImages(data);
          if (data.scene) {
            hidewhiteboardAPI.updateScene({
              elements: restoreElements(data.scene.elements, null, {
                repairBindings: true,
              }),
              appState: restoreAppState(data.scene.appState, null),
              captureUpdate: CaptureUpdateAction.IMMEDIATELY,
            });
          }
        });
      }
    };

    const syncData = debounce(() => {
      if (isTestEnv()) {
        return;
      }
      if (
        !document.hidden &&
        ((collabAPI && !collabAPI.isCollaborating()) || isCollabDisabled)
      ) {
        // don't sync if local state is newer or identical to browser state
        if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_DATA_STATE)) {
          const localDataState = importFromLocalStorage();
          const username = importUsernameFromLocalStorage();
          setLangCode(getPreferredLanguage());
          hidewhiteboardAPI.updateScene({
            ...localDataState,
            captureUpdate: CaptureUpdateAction.NEVER,
          });
          LibraryIndexedDBAdapter.load().then((data) => {
            if (data) {
              hidewhiteboardAPI.updateLibrary({
                libraryItems: data.libraryItems,
              });
            }
          });
          collabAPI?.setUsername(username || "");
        }

        if (isBrowserStorageStateNewer(STORAGE_KEYS.VERSION_FILES)) {
          const elements = hidewhiteboardAPI.getSceneElementsIncludingDeleted();
          const currFiles = hidewhiteboardAPI.getFiles();
          const fileIds =
            elements?.reduce((acc, element) => {
              if (
                isInitializedImageElement(element) &&
                // only load and update images that aren't already loaded
                !currFiles[element.fileId]
              ) {
                return acc.concat(element.fileId);
              }
              return acc;
            }, [] as FileId[]) || [];
          if (fileIds.length) {
            LocalData.fileStorage
              .getFiles(fileIds)
              .then(({ loadedFiles, erroredFiles }) => {
                if (loadedFiles.length) {
                  hidewhiteboardAPI.addFiles(loadedFiles);
                }
                updateStaleImageStatuses({
                  hidewhiteboardAPI,
                  erroredFiles,
                  elements: hidewhiteboardAPI.getSceneElementsIncludingDeleted(),
                });
              });
          }
        }
      }
    }, SYNC_BROWSER_TABS_TIMEOUT);

    const onUnload = () => {
      LocalData.flushSave();
    };

    const visibilityChange = (event: FocusEvent | Event) => {
      if (event.type === EVENT.BLUR || document.hidden) {
        LocalData.flushSave();
      }
      if (
        event.type === EVENT.VISIBILITY_CHANGE ||
        event.type === EVENT.FOCUS
      ) {
        syncData();
      }
    };

    window.addEventListener(EVENT.HASHCHANGE, onHashChange, false);
    window.addEventListener(EVENT.UNLOAD, onUnload, false);
    window.addEventListener(EVENT.BLUR, visibilityChange, false);
    document.addEventListener(EVENT.VISIBILITY_CHANGE, visibilityChange, false);
    window.addEventListener(EVENT.FOCUS, visibilityChange, false);
    return () => {
      window.removeEventListener(EVENT.HASHCHANGE, onHashChange, false);
      window.removeEventListener(EVENT.UNLOAD, onUnload, false);
      window.removeEventListener(EVENT.BLUR, visibilityChange, false);
      window.removeEventListener(EVENT.FOCUS, visibilityChange, false);
      document.removeEventListener(
        EVENT.VISIBILITY_CHANGE,
        visibilityChange,
        false,
      );
    };
  }, [isCollabDisabled, collabAPI, hidewhiteboardAPI, setLangCode]);

  useEffect(() => {
    const unloadHandler = (event: BeforeUnloadEvent) => {
      LocalData.flushSave();

      if (
        hidewhiteboardAPI &&
        LocalData.fileStorage.shouldPreventUnload(
          hidewhiteboardAPI.getSceneElements(),
        )
      ) {
        if (import.meta.env.VITE_APP_DISABLE_PREVENT_UNLOAD !== "true") {
          preventUnload(event);
        } else {
          console.warn(
            "preventing unload disabled (VITE_APP_DISABLE_PREVENT_UNLOAD)",
          );
        }
      }
    };
    window.addEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    return () => {
      window.removeEventListener(EVENT.BEFORE_UNLOAD, unloadHandler);
    };
  }, [hidewhiteboardAPI]);

  const onChange = (
    elements: readonly OrderedhidewhiteboardElement[],
    appState: AppState,
    files: BinaryFiles,
  ) => {
    if (collabAPI?.isCollaborating()) {
      collabAPI.syncElements(elements);
    }

    // this check is redundant, but since this is a hot path, it's best
    // not to evaludate the nested expression every time
    if (!LocalData.isSavePaused()) {
      LocalData.save(elements, appState, files, () => {
        if (hidewhiteboardAPI) {
          let didChange = false;

          const elements = hidewhiteboardAPI
            .getSceneElementsIncludingDeleted()
            .map((element) => {
              if (
                LocalData.fileStorage.shouldUpdateImageElementStatus(element)
              ) {
                const newElement = newElementWith(element, { status: "saved" });
                if (newElement !== element) {
                  didChange = true;
                }
                return newElement;
              }
              return element;
            });

          if (didChange) {
            hidewhiteboardAPI.updateScene({
              elements,
              captureUpdate: CaptureUpdateAction.NEVER,
            });
          }
        }
      });
    }

    // Render the debug scene if the debug canvas is available
    if (debugCanvasRef.current && hidewhiteboardAPI) {
      debugRenderer(
        debugCanvasRef.current,
        appState,
        elements,
        window.devicePixelRatio,
      );
    }
  };

  const [latestShareableLink, setLatestShareableLink] = useState<string | null>(
    null,
  );
  const [isHelpDialogOpen, setIsHelpDialogOpen] = useState(false);
  const [isLLMSettingsOpen, setIsLLMSettingsOpen] = useState(false);

  const onExportToBackend = async (
    exportedElements: readonly NonDeletedhidewhiteboardElement[],
    appState: Partial<AppState>,
    files: BinaryFiles,
  ) => {
    if (exportedElements.length === 0) {
      throw new Error(t("alerts.cannotExportEmptyCanvas"));
    }
    try {
      const { url, errorMessage } = await exportToBackend(
        exportedElements,
        {
          ...appState,
          viewBackgroundColor: appState.exportBackground
            ? appState.viewBackgroundColor
            : getDefaultAppState().viewBackgroundColor,
        },
        files,
      );

      if (errorMessage) {
        throw new Error(errorMessage);
      }

      if (url) {
        setLatestShareableLink(url);
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        const { width, height } = appState;
        console.error(error, {
          width,
          height,
          devicePixelRatio: window.devicePixelRatio,
        });
        throw new Error(error.message);
      }
    }
  };

  const renderCustomStats = (
    elements: readonly NonDeletedhidewhiteboardElement[],
    appState: UIAppState,
  ) => {
    return (
      <CustomStats
        setToast={(message) => hidewhiteboardAPI!.setToast({ message })}
        appState={appState}
        elements={elements}
      />
    );
  };

  const isOffline = useAtomValue(isOfflineAtom);

  const localStorageQuotaExceeded = useAtomValue(localStorageQuotaExceededAtom);

  const onShareDialogOpen = useCallback(
    () => setShareDialogState({ isOpen: true, type: "share" }),
    [setShareDialogState],
  );

  // browsers generally prevent infinite self-embedding, there are
  // cases where it still happens, and while we disallow self-embedding
  // by not whitelisting our own origin, this serves as an additional guard
  if (isSelfEmbedding) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          height: "100%",
        }}
      >
        <h1>I'm not a pretzel!</h1>
      </div>
    );
  }

  return (
    <div
      style={{ height: "100%" }}
      className={clsx("hidewhiteboard-app", {
        "toolbar-side-top": toolbarSide === "top",
        "toolbar-side-bottom": toolbarSide === "bottom",
        "toolbar-side-left": toolbarSide === "left",
        "toolbar-side-right": toolbarSide === "right",
        "is-collaborating": isCollaborating,
      })}
    >
      <Hidewhiteboard
        hidewhiteboardAPI={hidewhiteboardRefCallback}
        onChange={onChange}
        initialData={initialStatePromiseRef.current.promise}
        isCollaborating={isCollaborating}
        onPointerUpdate={collabAPI?.onPointerUpdate}
        UIOptions={{
          canvasActions: {
            toggleTheme: true,
            export: {
              onExportToBackend,
              renderCustomUI: hidewhiteboardAPI
                ? (elements, appState, files) => {
                    return (
                      <ExportTohidewhiteboardPlus
                        elements={elements}
                        appState={appState}
                        files={files}
                        name={hidewhiteboardAPI.getName()}
                        onError={(error) => {
                          hidewhiteboardAPI?.updateScene({
                            appState: {
                              errorMessage: error.message,
                            },
                          });
                        }}
                        onSuccess={() => {
                          hidewhiteboardAPI.updateScene({
                            appState: { openDialog: null },
                          });
                        }}
                      />
                    );
                  }
                : undefined,
            },
          },
        }}
        langCode={langCode}
        renderCustomStats={renderCustomStats}
        detectScroll={false}
        handleKeyboardGlobally={true}
        autoFocus={true}
        theme={editorTheme}
        renderTopRightUI={(isMobile) => {
          if (isMobile || !collabAPI || isCollabDisabled) {
            return null;
          }

          return collabError.message ? (
            <div className="hidewhiteboard-ui-top-right">
              <CollabError collabError={collabError} />
            </div>
          ) : null;
        }}
        onLinkOpen={(element, event) => {
          if (element.link && isElementLink(element.link)) {
            event.preventDefault();
            hidewhiteboardAPI?.scrollToContent(element.link, { animate: true });
          }
        }}
      >
        <AppMainMenu
          onShareDialogOpen={onShareDialogOpen}
          onHelpDialogOpen={() => setIsHelpDialogOpen(true)}
          onLLMSettingsOpen={() => setIsLLMSettingsOpen(true)}
          theme={appTheme}
          setTheme={(theme) => setAppTheme(theme)}
          toolbarSide={toolbarSide}
          setToolbarSide={setToolbarSide}
          refresh={() => forceRefresh((prev) => !prev)}
        />
        {isHelpDialogOpen && (
          <HelpCenterDialog onClose={() => setIsHelpDialogOpen(false)} />
        )}
        {isLLMSettingsOpen && (
          <LLMSettingsDialog onClose={() => setIsLLMSettingsOpen(false)} />
        )}
        <OverwriteConfirmDialog>
          <OverwriteConfirmDialog.Actions.ExportToImage />
          <OverwriteConfirmDialog.Actions.SaveToDisk />
          {hidewhiteboardAPI && (
            <OverwriteConfirmDialog.Action
              title={t("overwriteConfirm.action.hidewhiteboardPlus.title")}
              actionLabel={t("overwriteConfirm.action.hidewhiteboardPlus.button")}
              onClick={() => {
                exportTohidewhiteboardPlus(
                  hidewhiteboardAPI.getSceneElements(),
                  hidewhiteboardAPI.getAppState(),
                  hidewhiteboardAPI.getFiles(),
                  hidewhiteboardAPI.getName(),
                );
              }}
            >
              {t("overwriteConfirm.action.hidewhiteboardPlus.description")}
            </OverwriteConfirmDialog.Action>
          )}
        </OverwriteConfirmDialog>
        <AppFooter onChange={() => hidewhiteboardAPI?.refresh()} />
        {hidewhiteboardAPI && <AIComponents hidewhiteboardAPI={hidewhiteboardAPI} />}

        <TTDDialogTrigger />
        {isCollaborating && isOffline && (
          <div className="alertalert--warning">
            {t("alerts.collabOfflineWarning")}
          </div>
        )}
        {localStorageQuotaExceeded && (
          <div className="alert alert--danger">
            {t("alerts.localStorageQuotaExceeded")}
          </div>
        )}
        {latestShareableLink && (
          <ShareableLinkDialog
            link={latestShareableLink}
            onCloseRequest={() => setLatestShareableLink(null)}
            setErrorMessage={setErrorMessage}
          />
        )}
        {hidewhiteboardAPI && !isCollabDisabled && (
          <Collab hidewhiteboardAPI={hidewhiteboardAPI} />
        )}

        <ShareDialog
          collabAPI={collabAPI}
          onExportToBackend={async () => {
            if (hidewhiteboardAPI) {
              try {
                await onExportToBackend(
                  hidewhiteboardAPI.getSceneElements(),
                  hidewhiteboardAPI.getAppState(),
                  hidewhiteboardAPI.getFiles(),
                );
              } catch (error: any) {
                setErrorMessage(error.message);
              }
            }
          }}
        />

        <AppSidebar />
        <AIAgentPanel runtimeOnly />
        <AIFloatingComposer />

        {errorMessage && (
          <ErrorDialog onClose={() => setErrorMessage("")}>
            {errorMessage}
          </ErrorDialog>
        )}

        <CommandPalette
          customCommandPaletteItems={[
            {
              label: t("labels.liveCollaboration"),
              category: DEFAULT_CATEGORIES.app,
              keywords: [
                "team",
                "multiplayer",
                "share",
                "public",
                "session",
                "invite",
              ],
              icon: usersIcon,
              perform: () => {
                setShareDialogState({
                  isOpen: true,
                  type: "collaborationOnly",
                });
              },
            },
            {
              label: t("roomDialog.button_stopSession"),
              category: DEFAULT_CATEGORIES.app,
              predicate: () => !!collabAPI?.isCollaborating(),
              keywords: [
                "stop",
                "session",
                "end",
                "leave",
                "close",
                "exit",
                "collaboration",
              ],
              perform: () => {
                if (collabAPI) {
                  collabAPI.stopCollaboration();
                  if (!collabAPI.isCollaborating()) {
                    setShareDialogState({ isOpen: false });
                  }
                }
              },
            },
            {
              label: t("labels.share"),
              category: DEFAULT_CATEGORIES.app,
              predicate: true,
              icon: share,
              keywords: [
                "link",
                "shareable",
                "readonly",
                "export",
                "publish",
                "snapshot",
                "url",
                "collaborate",
                "invite",
              ],
              perform: async () => {
                setShareDialogState({ isOpen: true, type: "share" });
              },
            },
            {
              label: t("overwriteConfirm.action.hidewhiteboardPlus.button"),
              category: DEFAULT_CATEGORIES.export,
              icon: exportToPlus,
              predicate: true,
              keywords: ["plus", "export", "save", "backup"],
              perform: () => {
                if (hidewhiteboardAPI) {
                  exportTohidewhiteboardPlus(
                    hidewhiteboardAPI.getSceneElements(),
                    hidewhiteboardAPI.getAppState(),
                    hidewhiteboardAPI.getFiles(),
                    hidewhiteboardAPI.getName(),
                  );
                }
              },
            },
            {
              ...CommandPalette.defaultItems.toggleTheme,
              perform: () => {
                setAppTheme(
                  editorTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK,
                );
              },
            },
            {
              label: t("labels.installPWA"),
              category: DEFAULT_CATEGORIES.app,
              predicate: () => !!pwaEvent,
              perform: () => {
                if (pwaEvent) {
                  pwaEvent.prompt();
                  pwaEvent.userChoice.then(() => {
                    // event cannot be reused, but we'll hopefully
                    // grab new one as the event should be fired again
                    pwaEvent = null;
                  });
                }
              },
            },
          ]}
        />
        {isVisualDebuggerEnabled() && hidewhiteboardAPI && (
          <DebugCanvas
            appState={hidewhiteboardAPI.getAppState()}
            scale={window.devicePixelRatio}
            ref={debugCanvasRef}
          />
        )}
      </Hidewhiteboard>
    </div>
  );
};

const HidewhiteboardApp = () => {
  const isCloudExportWindow =
    window.location.pathname === "/hidewhiteboard-plus-export";
  if (isCloudExportWindow) {
    return <HidewhiteboardPlusIframeExport />;
  }

  return (
    <TopErrorBoundary>
      <Provider store={appJotaiStore}>
        <HidewhiteboardWrapper />
      </Provider>
    </TopErrorBoundary>
  );
};

export default HidewhiteboardApp;
