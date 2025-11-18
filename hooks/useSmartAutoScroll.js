"use client";
import { useEffect, useRef } from "react";

export default function useSmartAutoScroll(chats, platform) {
  const endRef = useRef(null);
  const containerRef = useRef(null);
  const isFirstRender = useRef(true);
  const lastMessageCount = useRef(0);

  const SCROLL_THRESHOLD = 150; // px from bottom
  const ANIMATION_DURATION = 300;

  const smoothScrollTo = (target) => {
    const container = containerRef.current;
    if (!container) return;

    const start = container.scrollTop;
    const change = target - start;
    const startTime = performance.now();

    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      container.scrollTop = start + change * eased;

      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  };

  useEffect(() => {
    const messages = chats?.[platform] || [];
    const box = containerRef.current;
    if (!box) return;

    if (isFirstRender.current) {
      isFirstRender.current = false;
      lastMessageCount.current = messages.length;
      return;
    }

    const newMessage =
      messages.length > lastMessageCount.current
        ? messages[messages.length - 1]
        : null;

    lastMessageCount.current = messages.length;

    if (!newMessage) return;

    // detect AI message or options
    const isAIMessage = newMessage.role === "ai";
    const hasOptions = newMessage.options?.length > 0;

    // distance from bottom
    const distanceFromBottom =
      box.scrollHeight - (box.scrollTop + box.clientHeight);

    const userNearBottom = distanceFromBottom < SCROLL_THRESHOLD;

    // Auto-scroll only when user is near bottom OR when AI sends options
    if (isAIMessage || hasOptions) {
      const target = box.scrollHeight - box.clientHeight;
      smoothScrollTo(target);
      return;
    }

    // For user messages – auto scroll only if user is near bottom
    if (userNearBottom) {
      const target = box.scrollHeight - box.clientHeight;
      smoothScrollTo(target);
    }
  }, [chats?.[platform]?.length]);

  return { endRef, containerRef };
}
