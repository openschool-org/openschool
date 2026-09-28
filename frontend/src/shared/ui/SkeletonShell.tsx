import { SkeletonText, SkeletonPlaceholder } from "@carbon/react";

export function ContentSkeleton() {
  return (
    <div className="os-content-skeleton" aria-label="Loading page" role="status">
      <div className="os-content-skeleton__header">
        <div><SkeletonText width="34%" heading /><SkeletonText width="52%" /></div>
        <SkeletonPlaceholder className="os-content-skeleton__action" />
      </div>
      <div className="os-content-skeleton__stats">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonPlaceholder key={i} />)}
      </div>
      <div className="os-content-skeleton__columns">
        <div className="os-content-skeleton__panel"><SkeletonText width="28%" heading />{Array.from({ length: 5 }).map((_, i) => <SkeletonText key={i} width={`${62 - (i % 3) * 10}%`} />)}</div>
        <div className="os-content-skeleton__panel"><SkeletonText width="42%" heading />{Array.from({ length: 4 }).map((_, i) => <SkeletonText key={i} width={`${72 - (i % 2) * 16}%`} />)}</div>
      </div>
      <div className="os-content-skeleton__panel os-content-skeleton__panel--wide"><SkeletonText width="24%" heading />{Array.from({ length: 3 }).map((_, i) => <SkeletonText key={i} width={`${80 - i * 12}%`} />)}</div>
    </div>
  );
}

export default function SkeletonShell() {
  return (
    <div className="os-skeleton-shell">
      <div className="os-skeleton-header" aria-label="Loading application shell" role="status">
        <SkeletonPlaceholder className="os-skeleton-header__menu" />
        <div className="os-skeleton-header__brand">
          <SkeletonPlaceholder className="os-skeleton-header__logo" />
          <SkeletonText width="6rem" />
        </div>
        <div className="os-skeleton-header__actions">
          {Array.from({ length: 3 }).map((_, i) => <SkeletonPlaceholder key={i} />)}
        </div>
      </div>
      <div className="os-layout">
        <aside className="os-layout__sidebar">
          <div className="os-skeleton-nav" aria-label="Loading navigation" role="status">
            {Array.from({ length: 3 }).map((_, group) => (
              <div className="os-skeleton-nav__group" key={group}>
                <SkeletonText width={group === 0 ? "42%" : "50%"} />
                {Array.from({ length: group === 2 ? 3 : 4 }).map((_, item) => (
                  <div className="os-skeleton-nav__item" key={item}>
                    <SkeletonPlaceholder />
                    <SkeletonText width={`${58 + ((item + group) % 3) * 12}%`} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </aside>
        <main className="os-layout__content">
          <ContentSkeleton />
        </main>
      </div>
    </div>
  );
}
