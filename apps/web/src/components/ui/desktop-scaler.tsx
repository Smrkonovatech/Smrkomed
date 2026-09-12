"use client";

import { useEffect, useState, useRef, ReactNode } from "react";

interface DesktopScalerProps {
  children: ReactNode;
  desktopWidth?: number;
  bgColor?: string;
  className?: string;
}

export function DesktopScaler({
  children,
  desktopWidth = 1440,
  bgColor = "transparent",
  className = "",
}: DesktopScalerProps) {
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);
  const [isMobile, setIsMobile] = useState(true);
  const [isDesktopSiteMobile, setIsDesktopSiteMobile] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [useTransformFallback, setUseTransformFallback] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supportsZoom =
      typeof CSS !== "undefined" &&
      CSS.supports &&
      CSS.supports("zoom", "1");

    setUseTransformFallback(!supportsZoom);

    const checkScale = () => {
      const windowWidth = window.innerWidth;
      const mobile = windowWidth < 640;

      setViewportWidth(windowWidth);

      // Detect "Request Desktop Site" on a mobile phone:
      const desktopSiteMobile =
        !mobile &&
        typeof screen !== "undefined" &&
        screen.width < 640 &&
        navigator.maxTouchPoints > 0;

      setIsMobile(mobile);
      setIsDesktopSiteMobile(desktopSiteMobile);

      if (mobile) {
        setScale(Math.min(1.1, windowWidth / 390));
        return;
      }

      const isTablet = windowWidth >= 640 && windowWidth < 1200;

      if (isTablet) {
        // Tablet scaling (base 1024px), clamped so it never gets too tiny.
        setScale(Math.max(0.75, windowWidth / 1024));
        return;
      }

      /**
       * Global Desktop Scaling (1440px base width)
       * Scales fluidly with windowWidth / 1440 so zooming out below 100% holds 1440px layout ratio.
       * Added a 0.8 multiplier to significantly decrease the overall scaling size as requested.
       */
      setScale((windowWidth / desktopWidth) * 0.8);
    };

    checkScale();

    window.addEventListener("resize", checkScale);

    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setContentHeight(
          entries[0].target.clientHeight ||
          entries[0].contentRect.height
        );
      }
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
      setContentHeight(containerRef.current.offsetHeight);
    }

    return () => {
      window.removeEventListener("resize", checkScale);
      resizeObserver.disconnect();
    };
  }, [desktopWidth]);

  useEffect(() => {
    if (isDesktopSiteMobile) {
      document.documentElement.classList.add("dsm-mode");
    } else {
      document.documentElement.classList.remove("dsm-mode");
    }
    return () => {
      document.documentElement.classList.remove("dsm-mode");
    };
  }, [isDesktopSiteMobile]);

  const targetWidth = isMobile ? "100%" : desktopWidth;

  const parentStyle: React.CSSProperties = {
    backgroundColor: bgColor,
    width: "100%",
    position: "relative",
    overflow:
      useTransformFallback || className.includes("overflow-hidden")
        ? "hidden"
        : undefined,
    height: useTransformFallback ? contentHeight * scale : "100%",
  };

  const innerStyle: React.CSSProperties & { [key: string]: any } = {
    width: "100%",
    margin: "0 auto",
    transformOrigin: "top center",
    "--desktop-scale": isDesktopSiteMobile ? 9999 : scale,
    height: "100%",

    ...(useTransformFallback
      ? {
        transform: `scale(${scale})`,
      }
      : {
        zoom: scale,
      }),
  };

  return (
    <div
      className={`w-full flex justify-center ${className} h-full`}
      style={parentStyle}
    >
      <div
        ref={containerRef}
        className="relative flex shrink-0 flex-col h-full"
        style={innerStyle}
      >
        {children}
      </div>
    </div>
  );
}
