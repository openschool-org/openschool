import {
  SkeletonText,
  SkeletonPlaceholder,
} from "@carbon/react";
import { useEffect, useState, type ReactNode } from "react";

const SKELETON_DELAY_MS = 180;

function DelayedFallback({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setVisible(true), SKELETON_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, []);

  return visible ? children : null;
}

export function ContentSkeleton() {
  return (
    <div
      className="os-content-skeleton"
      aria-label="Loading page"
      role="status"
    >
      {/* Page heading */}
      <section className="os-content-skeleton__intro">
        <div className="os-content-skeleton__heading">
          <SkeletonText
            heading
            width="13rem"
            className="os-skeleton__title"
          />
          <SkeletonText width="22rem" />
        </div>

        <div className="os-content-skeleton__actions">
          <SkeletonPlaceholder className="os-skeleton__button" />
          <SkeletonPlaceholder className="os-skeleton__button os-skeleton__button--primary" />
        </div>
      </section>

      {/* Metrics */}
      <section className="os-content-skeleton__stats">
        {Array.from({ length: 4 }).map((_, index) => (
          <article
            className="os-stat-skeleton"
            key={index}
          >
            <SkeletonText width="6rem" />
            <SkeletonText
              heading
              width={index === 1 ? "5rem" : "4rem"}
            />
            <SkeletonText width="8rem" />
          </article>
        ))}
      </section>

      {/* Main content */}
      <section className="os-content-skeleton__grid">
        <article className="os-skeleton-panel os-skeleton-panel--large">
          <div className="os-skeleton-panel__header">
            <SkeletonText heading width="9rem" />
            <SkeletonPlaceholder className="os-skeleton__icon" />
          </div>

          <div className="os-skeleton-list">
            {Array.from({ length: 5 }).map((_, index) => (
              <div className="os-skeleton-list__row" key={index}>
                <SkeletonPlaceholder className="os-skeleton-list__avatar" />

                <div className="os-skeleton-list__content">
                  <SkeletonText
                    width={`${55 + (index % 3) * 8}%`}
                  />
                  <SkeletonText
                    width={`${35 + (index % 2) * 10}%`}
                  />
                </div>

                <SkeletonPlaceholder className="os-skeleton-list__action" />
              </div>
            ))}
          </div>
        </article>

        <article className="os-skeleton-panel">
          <div className="os-skeleton-panel__header">
            <SkeletonText heading width="8rem" />
            <SkeletonPlaceholder className="os-skeleton__icon" />
          </div>

          <div className="os-skeleton-chart">
            <div className="os-skeleton-chart__bars">
              {[42, 68, 54, 82, 63, 76, 48].map(
                (height, index) => (
                  <SkeletonPlaceholder
                    key={index}
                    className="os-skeleton-chart__bar"
                    style={{ height: `${height}%` }}
                  />
                )
              )}
            </div>

            <div className="os-skeleton-chart__legend">
              <SkeletonText width="5rem" />
              <SkeletonText width="4rem" />
            </div>
          </div>
        </article>
      </section>

      {/* Full-width section */}
      <article className="os-skeleton-panel os-skeleton-panel--wide">
        <div className="os-skeleton-panel__header">
          <div>
            <SkeletonText heading width="10rem" />
            <SkeletonText width="15rem" />
          </div>

          <SkeletonPlaceholder className="os-skeleton__button" />
        </div>

        <div className="os-skeleton-table">
          <div className="os-skeleton-table__header">
            {Array.from({ length: 4 }).map((_, index) => (
              <SkeletonText
                key={index}
                width={index === 0 ? "7rem" : "5rem"}
              />
            ))}
          </div>

          {Array.from({ length: 4 }).map((_, row) => (
            <div className="os-skeleton-table__row" key={row}>
              <SkeletonText width="8rem" />
              <SkeletonText width="6rem" />
              <SkeletonText width="5rem" />
              <SkeletonPlaceholder className="os-skeleton-table__status" />
            </div>
          ))}
        </div>
      </article>
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

export default function SkeletonShell() {
  return (
    <div className="os-skeleton-shell">
      {/* Application header */}
      <header
        className="os-skeleton-header"
        aria-label="Loading application shell"
        role="status"
      >
        <SkeletonPlaceholder className="os-skeleton-header__menu" />

        <div className="os-skeleton-header__brand">
          <SkeletonPlaceholder className="os-skeleton-header__logo" />

          <div className="os-skeleton-header__brand-text">
            <SkeletonText width="7rem" />
          </div>
        </div>

        <div className="os-skeleton-header__actions">
          <SkeletonPlaceholder />
          <SkeletonPlaceholder />
          <SkeletonPlaceholder />
          <SkeletonPlaceholder className="os-skeleton-header__profile" />
        </div>
      </header>

      <div className="os-layout">
        {/* Sidebar */}
        <aside className="os-layout__sidebar">
          <nav
            className="os-skeleton-nav"
            aria-label="Loading navigation"
            role="status"
          >
            {[
              { title: "Overview", items: 4 },
              { title: "Management", items: 5 },
              { title: "Resources", items: 3 },
            ].map((group) => (
              <div
                className="os-skeleton-nav__group"
                key={group.title}
              >
                <SkeletonText width="5.5rem" />

                <div className="os-skeleton-nav__items">
                  {Array.from({ length: group.items }).map(
                    (_, index) => (
                      <div
                        className="os-skeleton-nav__item"
                        key={index}
                      >
                        <SkeletonPlaceholder className="os-skeleton-nav__icon" />
                        <SkeletonText
                          width={`${62 + (index % 2) * 12}%`}
                        />
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main */}
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
