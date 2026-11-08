import { SkeletonText } from "@/shared/ui/Skeleton";

// Placeholder for one `.os-stat-card` while its value is loading.
export default function StatCardSkeleton() {
  return (
    <div className="os-stat-card">
      <div className="os-mb-2">
        <SkeletonText width="60%" />
      </div>
      <SkeletonText width="30%" heading />
    </div>
  );
}
