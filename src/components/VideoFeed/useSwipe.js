// useSwipe.js
import { useEffect, useRef, useCallback } from "react";
import { useSwipeable } from "react-swipeable";

/**
 * Params:
 * - list
 * - index
 * - setIndex
 * - yControls
 * - nextControls
 * - containerRef
 * - nextRef
 *
 * Returns:
 * - handlers (swipeable handlers)
 * - onDrag
 * - onDragEnd
 * - triggerTransition
 */
export default function useSwipe({
  list,
  index,
  setIndex,
  yControls,
  nextControls,
  containerRef,
  nextRef,
}) {
  const isAnimatingRef = useRef(false);
  const lastWheelRef = useRef(0);

  // RANDOM SAFE SET INDEX
  const safeRandomIndex = useCallback(
    (prev) => {
      if (!list.length) return prev;
      let r;
      do {
        r = Math.floor(Math.random() * list.length);
      } while (r === prev);
      return r;
    },
    [list]
  );

  const safeSetIndex = useCallback(
    (newIndex) => {
      if (!list.length) return;
      const normalized =
        ((newIndex % list.length) + list.length) % list.length;
      if (normalized !== index) setIndex(normalized);
    },
    [list, index, setIndex]
  );

  // ------------------------------
  // SWIPE HANDLERS
  // ------------------------------
  const handlers = useSwipeable({
    onSwipedUp: () => {
      if (list.length > 1) safeSetIndex(safeRandomIndex(index));
    },
    onSwipedDown: () => {
      if (list.length > 1) safeSetIndex(safeRandomIndex(index));
    },
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  // ------------------------------
  // WHEEL HANDLER
  // ------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e) => {
      const now = Date.now();
      if (now - lastWheelRef.current < 250) return;
      lastWheelRef.current = now;

      const delta = e.deltaY || e.wheelDelta || -e.target?.detail;
      if (Math.abs(delta) < 2) return;

      if (delta > 0) triggerTransition("next");
      else triggerTransition("prev");
    };

    el.addEventListener("wheel", onWheel, { passive: true });
    return () => el.removeEventListener("wheel", onWheel);
  }, [list, index]);

  // ------------------------------
  // TRIGGER TRANSITION
  // ------------------------------
  const triggerTransition = useCallback(
    async (direction) => {
      if (isAnimatingRef.current) return;
      if (list.length <= 1) return;

      isAnimatingRef.current = true;

      const height =
        containerRef.current?.clientHeight || window.innerHeight;

      const exitY = direction === "next" ? -height - 50 : height + 50;

      await yControls.start({
        y: exitY,
        opacity: 0.8,
        transition: { type: "spring", stiffness: 300, damping: 30 },
      });

      // RANDOM NEXT
      setIndex((prev) => safeRandomIndex(prev));

      // RESET POSITION FOR NEXT ITEM
      await yControls.set({
        y: direction === "next" ? height + 50 : -height - 50,
        opacity: 1,
      });

      await nextControls.set({
        y: "100%",
        opacity: 0,
        scale: 0.95,
      });

      // ENTER ANIMATION
      await yControls.start({
        y: 0,
        opacity: 1,
        transition: { type: "spring", stiffness: 300, damping: 30 },
      });

      nextRef.current?.classList.remove("revealed");
      isAnimatingRef.current = false;
    },
    [list, setIndex, safeRandomIndex, yControls, nextControls, containerRef]
  );

  // ------------------------------
  // onDrag (LIVE FOLLOWING CURSOR)
  // ------------------------------
  const onDrag = (event, info) => {
    const offsetY = info.offset.y;
    const height =
      containerRef.current?.clientHeight || window.innerHeight;

    const progress = Math.min(Math.abs(offsetY) / height, 1);

    const nextOpacityVal = 0.4 + progress * 0.6;
    const nextScaleVal = 0.95 + progress * 0.05;
    const currentOpacityVal = 1 - progress * 0.4;

    yControls.set({
      y: offsetY,
      opacity: currentOpacityVal,
    });

    nextControls.set({
      y: height + offsetY,
      opacity: nextOpacityVal,
      scale: nextScaleVal,
    });

    if (offsetY < -40) nextRef.current?.classList.add("revealed");
    else nextRef.current?.classList.remove("revealed");
  };

  // ------------------------------
  // onDragEnd
  // ------------------------------
  const onDragEnd = async (event, info) => {
    if (isAnimatingRef.current) return;

    const offsetY = info.offset.y;
    const velocityY = info.velocity.y;
    const height =
      containerRef.current?.clientHeight || window.innerHeight;

    const THRESHOLD = 70;
    const VEL_THRESHOLD = 250;

    if (offsetY < -THRESHOLD || velocityY < -VEL_THRESHOLD)
      return triggerTransition("next");

    if (offsetY > THRESHOLD || velocityY > VEL_THRESHOLD)
      return triggerTransition("prev");

    // CANCEL MOVEMENT
    await yControls.start({
      y: 0,
      opacity: 1,
      transition: { type: "spring", stiffness: 400, damping: 40 },
    });

    await nextControls.start({
      y: height,
      opacity: 0,
      scale: 0.95,
      transition: { type: "spring", stiffness: 300, damping: 30 },
    });

    nextRef.current?.classList.remove("revealed");
  };

  return {
    handlers,
    onDrag,
    onDragEnd,
    triggerTransition,
  };
}
