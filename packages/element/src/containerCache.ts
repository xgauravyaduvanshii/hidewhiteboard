import type { hidewhiteboardTextContainer } from "./types";

export const originalContainerCache: {
  [id: hidewhiteboardTextContainer["id"]]:
    | {
        height: hidewhiteboardTextContainer["height"];
      }
    | undefined;
} = {};

export const updateOriginalContainerCache = (
  id: hidewhiteboardTextContainer["id"],
  height: hidewhiteboardTextContainer["height"],
) => {
  const data =
    originalContainerCache[id] || (originalContainerCache[id] = { height });
  data.height = height;
  return data;
};

export const resetOriginalContainerCache = (
  id: hidewhiteboardTextContainer["id"],
) => {
  if (originalContainerCache[id]) {
    delete originalContainerCache[id];
  }
};

export const getOriginalContainerHeightFromCache = (
  id: hidewhiteboardTextContainer["id"],
) => {
  return originalContainerCache[id]?.height ?? null;
};
