import { useEffect, useState, type ReactNode } from "react";
import { Skeleton } from "antd";

const SKELETON_DELAY_MS = 180;

// Fast loads never flash a skeleton: it only appears after a short delay.
function DelayedFallback({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), SKELETON_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);
  return visible ? children : null;
}

// Placeholder for any page while its route chunk loads: a page title and one content card.
// Kept generic on purpose, so a list page or a form doesn't flash a fake dashboard first.
export function ContentSkeleton() {
  return (
    <div className="os-page os-content-skeleton" role="status" aria-label="Loading page">
      <div className="os-content-skeleton__header">
        <Skeleton active title={{ width: 240 }} paragraph={{ rows: 1, width: 360 }} />
      </div>
      <div className="os-content-skeleton__card">
        <Skeleton active title={{ width: 180 }} paragraph={{ rows: 6, width: ["100%", "92%", "96%", "88%", "94%", "60%"] }} />
      </div>
    </div>
  );
}

export function DelayedContentSkeleton() {
  return (
    <DelayedFallback>
      <ContentSkeleton />
    </DelayedFallback>
  );
}

// Whole-app placeholder before the portal shell is ready: the real top bar and brand,
// sidebar lines, and the page placeholder.
export default function SkeletonShell() {
  return (
    <div className="os-skeleton-shell">
      <header className="os-skeleton-header" aria-label="Loading application shell" role="status">
        <img src="/w-favicon.webp" alt="" width={24} height={24} />
        <span className="os-skeleton-header__name">OpenSchool</span>
      </header>
      <div className="os-layout">
        <aside className="os-layout__sidebar">
          <nav className="os-skeleton-nav" aria-label="Loading navigation" role="status">
            <Skeleton active title={false} paragraph={{ rows: 6, width: ["70%", "55%", "80%", "60%", "75%", "50%"] }} />
            <Skeleton active title={false} paragraph={{ rows: 5, width: ["45%", "70%", "60%", "80%", "55%"] }} />
          </nav>
        </aside>
        <main className="os-layout__content">
          <ContentSkeleton />
        </main>
      </div>
    </div>
  );
}

export function DelayedSkeletonShell() {
  return (
    <DelayedFallback>
      <SkeletonShell />
    </DelayedFallback>
  );
}
