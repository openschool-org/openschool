import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Locked, UserMultiple, Edit, TrashCan, Phone, Email, Notification } from "@carbon/icons-react";
import { Tag, SkeletonText, Button, Pagination } from "@carbon/react";
import { useGuardianStudents, useGuardianNotifications, useDeleteGuardian } from "@/features/guardians/queries/useGuardians";
import type { Guardian } from "@/features/guardians/api/guardian";
import { formatDateTime } from "@/shared/lib/date";
import ConfirmDeleteModal from "@/shared/ui/ConfirmDeleteModal";
import { relationshipLabel } from "@/features/guardians/constants";
import EditGuardianModal from "@/features/guardians/components/EditGuardianModal";
import MutationErrorNotification from "@/shared/ui/MutationErrorNotification";
import SectionHeader from "@/shared/ui/SectionHeader";

export default function GuardianDetail({ guardian, onDeleted }: { guardian: Guardian; onDeleted: () => void }) {
  const NOTIFICATIONS_PAGE_SIZE = 5;
  const { data: students, isLoading: studentsLoading } = useGuardianStudents(guardian.id);
  const { data: notifications, isLoading: notificationsLoading } = useGuardianNotifications(guardian.id);
  const deleteGuardian = useDeleteGuardian();

  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notificationPage, setNotificationPage] = useState(1);

  const hasStudents = (students?.length ?? 0) > 0;
  // Blocks delete while the linked-students query is still loading, so a fast double-click can't slip past the "still linked" check.
  const deleteBlocked = studentsLoading || hasStudents;
  const notificationItems = useMemo(() => {
    const start = (notificationPage - 1) * NOTIFICATIONS_PAGE_SIZE;
    return (notifications ?? []).slice(start, start + NOTIFICATIONS_PAGE_SIZE);
  }, [notificationPage, notifications]);

  return (
    <div className="os-section os-mt-0 os-guardian-detail">
      <SectionHeader
        title={guardian.full_name}
        meta={
          <div className="os-flex os-gap-2 os-items-center">
            <Tag size="sm" type="gray">
              {relationshipLabel(guardian.relationship)}
            </Tag>
            {guardian.user_id ? (
              <Tag size="sm" type="green">
                <Locked size={12} className="os-mr-1" />
                Portal access
              </Tag>
            ) : (
              <Tag size="sm" type="cool-gray">
                No portal login
              </Tag>
            )}
            <Button renderIcon={Edit} kind="ghost" size="sm" onClick={() => setEditing(true)}>
              Edit
            </Button>
            <Button
              renderIcon={TrashCan}
              kind="danger--ghost"
              size="sm"
              onClick={() => {
                deleteGuardian.reset();
                setConfirmDelete(true);
              }}
            >
              Delete
            </Button>
          </div>
        }
      />
      <div className="os-section__body">
        <MutationErrorNotification
          isError={deleteGuardian.isError}
          error={deleteGuardian.error}
          title="Could not delete guardian"
          fallback="This guardian may still be linked to a student."
          onClose={() => deleteGuardian.reset()} className="os-mb-4"
        />

        <div className="os-guardian-contact-grid os-mb-6">
          <div className="os-guardian-contact-card">
            <Phone size={18} className="os-fill-accent" />
            <div>
              <p className="os-m-0 os-text-xs os-c-tertiary">Phone</p>
              <p className="os-mt-1 os-mb-0 os-text-md os-fw-500">{guardian.phone}</p>
            </div>
          </div>
          <div className="os-guardian-contact-card">
            <Email size={18} className="os-fill-accent" />
            <div className="os-min-w-0">
              <p className="os-m-0 os-text-xs os-c-tertiary">Email</p>
              <p className="os-mt-1 os-mb-0 os-text-md os-fw-500 os-truncate">{guardian.email || "Not provided"}</p>
            </div>
          </div>
        </div>

        <div className="os-guardian-section-heading">
          <div>
            <h3 className="os-text-sm os-fw-600 os-mt-0 os-mx-0">Linked students</h3>
            <p className="os-m-0 os-text-xs os-c-tertiary">Students connected to this guardian profile</p>
          </div>
          {students && <Tag size="sm" type="cool-gray">{students.length}</Tag>}
        </div>
        {studentsLoading ? (
          <SkeletonText width="60%" />
        ) : students && students.length > 0 ? (
          <div className="os-flex os-gap-2 os-wrap os-mb-6">
            {students.map((s) => (
              <Link
                key={s.id}
                to={`/students/${s.id}`} className="os-flex os-items-center os-gap-1h os-py-1h os-px-3 os-border os-text-sm os-no-underline os-c-primary"
              >
                <UserMultiple size={14} className="os-fill-accent" />
                {s.full_name}
              </Link>
            ))}
          </div>
        ) : (
          <p className="os-text-sm os-c-tertiary os-mb-6">No students linked.</p>
        )}

        <div className="os-guardian-section-heading os-mt-6">
          <div>
            <h3 className="os-text-sm os-fw-600 os-mt-0 os-mx-0">Notification history</h3>
            <p className="os-m-0 os-text-xs os-c-tertiary">Messages delivered to this guardian’s portal</p>
          </div>
          {notifications && <Notification size={18} className="os-fill-accent" />}
        </div>
        {!guardian.user_id ? (
          <p className="os-text-sm os-c-tertiary">
            This guardian has no portal login, so they haven't received any in-app notifications.
          </p>
        ) : notificationsLoading ? (
          <SkeletonText width="80%" />
        ) : notifications && notifications.length > 0 ? (
          <div>
            <div className="os-guardian-notification-list">
            {notificationItems.map((n) => (
              <div key={n.recipient_id} className="os-guardian-notification os-py-2h os-px-0 os-border-b">
                <div className="os-flex os-items-center os-gap-2">
                  <span className="os-fw-600 os-text-sm os-truncate">{n.title}</span>
                  <Tag size="sm" type="cool-gray">
                    {n.category}
                  </Tag>
                  <div className="os-flex-1" />
                  <span className="os-text-xs os-c-tertiary">
                    {formatDateTime(n.sent_at)}
                  </span>
                </div>
                <p className="os-mt-1 os-mx-0 os-mb-0 os-text-sm os-c-secondary">{n.message}</p>
              </div>
            ))}
            </div>
            {notifications.length > NOTIFICATIONS_PAGE_SIZE && (
              <Pagination
                className="os-guardian-notification-pagination"
                totalItems={notifications.length}
                page={notificationPage}
                pageSize={NOTIFICATIONS_PAGE_SIZE}
                pageSizes={[NOTIFICATIONS_PAGE_SIZE]}
                onChange={({ page }) => setNotificationPage(page)}
                size="sm"
              />
            )}
          </div>
        ) : (
          <p className="os-text-sm os-c-tertiary">No notifications sent yet.</p>
        )}
      </div>

      {editing && <EditGuardianModal guardian={guardian} onClose={() => setEditing(false)} />}

      <ConfirmDeleteModal
        open={confirmDelete}
        title="Delete guardian"
        description={
          studentsLoading ? (
            "Checking linked students…"
          ) : hasStudents ? (
            <>
              <strong>{guardian.full_name}</strong> is still linked to {students?.length} student
              {students && students.length !== 1 ? "s" : ""}. Unlink them from this guardian first
              (from each student's profile), then delete.
            </>
          ) : (
            <>
              Delete <strong>{guardian.full_name}</strong>? This cannot be undone.
            </>
          )
        }
        subject="Guardian"
        mutation={deleteGuardian}
        disabled={deleteBlocked}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (deleteBlocked) return;
          deleteGuardian.mutate(guardian.id);
        }}
        onSuccess={onDeleted}
      />
    </div>
  );
}
