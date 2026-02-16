import { ROUNDNESS, assertNever } from "@hidewhiteboard/common";

import { pointsEqual } from "@hidewhiteboard/math";

import type { ElementOrToolType } from "@hidewhiteboard/hidewhiteboard/types";

import type { MarkNonNullable } from "@hidewhiteboard/common/utility-types";

import type {
  hidewhiteboardElement,
  hidewhiteboardTextElement,
  hidewhiteboardEmbeddableElement,
  hidewhiteboardLinearElement,
  hidewhiteboardBindableElement,
  hidewhiteboardFreeDrawElement,
  InitializedhidewhiteboardImageElement,
  hidewhiteboardImageElement,
  hidewhiteboardTextElementWithContainer,
  hidewhiteboardTextContainer,
  hidewhiteboardFrameElement,
  RoundnessType,
  hidewhiteboardFrameLikeElement,
  hidewhiteboardElementType,
  hidewhiteboardIframeElement,
  hidewhiteboardIframeLikeElement,
  hidewhiteboardMagicFrameElement,
  hidewhiteboardArrowElement,
  hidewhiteboardElbowArrowElement,
  hidewhiteboardLineElement,
  hidewhiteboardFlowchartNodeElement,
  hidewhiteboardLinearElementSubType,
} from "./types";

export const isInitializedImageElement = (
  element: hidewhiteboardElement | null,
): element is InitializedhidewhiteboardImageElement => {
  return !!element && element.type === "image" && !!element.fileId;
};

export const isImageElement = (
  element: hidewhiteboardElement | null,
): element is hidewhiteboardImageElement => {
  return !!element && element.type === "image";
};

export const isEmbeddableElement = (
  element: hidewhiteboardElement | null | undefined,
): element is hidewhiteboardEmbeddableElement => {
  return !!element && element.type === "embeddable";
};

export const isIframeElement = (
  element: hidewhiteboardElement | null,
): element is hidewhiteboardIframeElement => {
  return !!element && element.type === "iframe";
};

export const isIframeLikeElement = (
  element: hidewhiteboardElement | null,
): element is hidewhiteboardIframeLikeElement => {
  return (
    !!element && (element.type === "iframe" || element.type === "embeddable")
  );
};

export const isTextElement = (
  element: hidewhiteboardElement | null,
): element is hidewhiteboardTextElement => {
  return element != null && element.type === "text";
};

export const isFrameElement = (
  element: hidewhiteboardElement | null,
): element is hidewhiteboardFrameElement => {
  return element != null && element.type === "frame";
};

export const isMagicFrameElement = (
  element: hidewhiteboardElement | null,
): element is hidewhiteboardMagicFrameElement => {
  return element != null && element.type === "magicframe";
};

export const isFrameLikeElement = (
  element: hidewhiteboardElement | null,
): element is hidewhiteboardFrameLikeElement => {
  return (
    element != null &&
    (element.type === "frame" || element.type === "magicframe")
  );
};

export const isFreeDrawElement = (
  element?: hidewhiteboardElement | null,
): element is hidewhiteboardFreeDrawElement => {
  return element != null && isFreeDrawElementType(element.type);
};

export const isFreeDrawElementType = (
  elementType: hidewhiteboardElementType,
): boolean => {
  return elementType === "freedraw";
};

export const isLinearElement = (
  element?: hidewhiteboardElement | null,
): element is hidewhiteboardLinearElement => {
  return element != null && isLinearElementType(element.type);
};

export const isLineElement = (
  element?: hidewhiteboardElement | null,
): element is hidewhiteboardLineElement => {
  return element != null && element.type === "line";
};

export const isArrowElement = (
  element?: hidewhiteboardElement | null,
): element is hidewhiteboardArrowElement => {
  return element != null && element.type === "arrow";
};

export const isElbowArrow = (
  element?: hidewhiteboardElement,
): element is hidewhiteboardElbowArrowElement => {
  return isArrowElement(element) && element.elbowed;
};

/**
 * sharp or curved arrow, but not elbow
 */
export const isSimpleArrow = (
  element?: hidewhiteboardElement,
): element is hidewhiteboardArrowElement => {
  return isArrowElement(element) && !element.elbowed;
};

export const isSharpArrow = (
  element?: hidewhiteboardElement,
): element is hidewhiteboardArrowElement => {
  return isArrowElement(element) && !element.elbowed && !element.roundness;
};

export const isCurvedArrow = (
  element?: hidewhiteboardElement,
): element is hidewhiteboardArrowElement => {
  return (
    isArrowElement(element) && !element.elbowed && element.roundness !== null
  );
};

export const isLinearElementType = (
  elementType: ElementOrToolType,
): boolean => {
  return (
    elementType === "arrow" || elementType === "line" // || elementType === "freedraw"
  );
};

export const isBindingElement = (
  element?: hidewhiteboardElement | null,
  includeLocked = true,
): element is hidewhiteboardArrowElement => {
  return (
    element != null &&
    (!element.locked || includeLocked === true) &&
    isBindingElementType(element.type)
  );
};

export const isBindingElementType = (
  elementType: ElementOrToolType,
): boolean => {
  return elementType === "arrow";
};

export const isBindableElement = (
  element: hidewhiteboardElement | null | undefined,
  includeLocked = true,
): element is hidewhiteboardBindableElement => {
  return (
    element != null &&
    (!element.locked || includeLocked === true) &&
    (element.type === "rectangle" ||
      element.type === "diamond" ||
      element.type === "ellipse" ||
      element.type === "image" ||
      element.type === "iframe" ||
      element.type === "embeddable" ||
      element.type === "frame" ||
      element.type === "magicframe" ||
      (element.type === "text" && !element.containerId))
  );
};

export const isRectanguloidElement = (
  element?: hidewhiteboardElement | null,
): element is hidewhiteboardBindableElement => {
  return (
    element != null &&
    (element.type === "rectangle" ||
      element.type === "diamond" ||
      element.type === "image" ||
      element.type === "iframe" ||
      element.type === "embeddable" ||
      element.type === "frame" ||
      element.type === "magicframe" ||
      (element.type === "text" && !element.containerId))
  );
};

// TODO: Remove this when proper distance calculation is introduced
// @see binding.ts:distanceToBindableElement()
export const isRectangularElement = (
  element?: hidewhiteboardElement | null,
): element is hidewhiteboardBindableElement => {
  return (
    element != null &&
    (element.type === "rectangle" ||
      element.type === "image" ||
      element.type === "text" ||
      element.type === "iframe" ||
      element.type === "embeddable" ||
      element.type === "frame" ||
      element.type === "magicframe" ||
      element.type === "freedraw")
  );
};

export const isTextBindableContainer = (
  element: hidewhiteboardElement | null,
  includeLocked = true,
): element is hidewhiteboardTextContainer => {
  return (
    element != null &&
    (!element.locked || includeLocked === true) &&
    (element.type === "rectangle" ||
      element.type === "diamond" ||
      element.type === "ellipse" ||
      isArrowElement(element))
  );
};

export const ishidewhiteboardElement = (
  element: any,
): element is hidewhiteboardElement => {
  const type: hidewhiteboardElementType | undefined = element?.type;
  if (!type) {
    return false;
  }
  switch (type) {
    case "text":
    case "diamond":
    case "rectangle":
    case "iframe":
    case "embeddable":
    case "ellipse":
    case "arrow":
    case "freedraw":
    case "line":
    case "frame":
    case "magicframe":
    case "image":
    case "selection": {
      return true;
    }
    default: {
      assertNever(type, null);
      return false;
    }
  }
};

export const isFlowchartNodeElement = (
  element: hidewhiteboardElement,
): element is hidewhiteboardFlowchartNodeElement => {
  return (
    element.type === "rectangle" ||
    element.type === "ellipse" ||
    element.type === "diamond"
  );
};

export const hasBoundTextElement = (
  element: hidewhiteboardElement | null,
): element is MarkNonNullable<hidewhiteboardBindableElement, "boundElements"> => {
  return (
    isTextBindableContainer(element) &&
    !!element.boundElements?.some(({ type }) => type === "text")
  );
};

export const isBoundToContainer = (
  element: hidewhiteboardElement | null,
): element is hidewhiteboardTextElementWithContainer => {
  return (
    element !== null &&
    "containerId" in element &&
    element.containerId !== null &&
    isTextElement(element)
  );
};

export const isArrowBoundToElement = (element: hidewhiteboardArrowElement) => {
  return !!element.startBinding || !!element.endBinding;
};

export const isUsingAdaptiveRadius = (type: string) =>
  type === "rectangle" ||
  type === "embeddable" ||
  type === "iframe" ||
  type === "image";

export const isUsingProportionalRadius = (type: string) =>
  type === "line" || type === "arrow" || type === "diamond";

export const canApplyRoundnessTypeToElement = (
  roundnessType: RoundnessType,
  element: hidewhiteboardElement,
) => {
  if (
    (roundnessType === ROUNDNESS.ADAPTIVE_RADIUS ||
      // if legacy roundness, it can be applied to elements that currently
      // use adaptive radius
      roundnessType === ROUNDNESS.LEGACY) &&
    isUsingAdaptiveRadius(element.type)
  ) {
    return true;
  }
  if (
    roundnessType === ROUNDNESS.PROPORTIONAL_RADIUS &&
    isUsingProportionalRadius(element.type)
  ) {
    return true;
  }

  return false;
};

export const getDefaultRoundnessTypeForElement = (
  element: hidewhiteboardElement,
) => {
  if (isUsingProportionalRadius(element.type)) {
    return {
      type: ROUNDNESS.PROPORTIONAL_RADIUS,
    };
  }

  if (isUsingAdaptiveRadius(element.type)) {
    return {
      type: ROUNDNESS.ADAPTIVE_RADIUS,
    };
  }

  return null;
};

export const getLinearElementSubType = (
  element: hidewhiteboardLinearElement,
): hidewhiteboardLinearElementSubType => {
  if (isSharpArrow(element)) {
    return "sharpArrow";
  }
  if (isCurvedArrow(element)) {
    return "curvedArrow";
  }
  if (isElbowArrow(element)) {
    return "elbowArrow";
  }
  return "line";
};

/**
 * Checks if current element points meet all the conditions for polygon=true
 * (this isn't a element type check, for that use isLineElement).
 *
 * If you want to check if points *can* be turned into a polygon, use
 *  canBecomePolygon(points).
 */
export const isValidPolygon = (
  points: hidewhiteboardLineElement["points"],
): boolean => {
  return points.length > 3 && pointsEqual(points[0], points[points.length - 1]);
};

export const canBecomePolygon = (
  points: hidewhiteboardLineElement["points"],
): boolean => {
  return (
    points.length > 3 ||
    // 3-point polygons can't have all points in a single line
    (points.length === 3 && !pointsEqual(points[0], points[points.length - 1]))
  );
};
