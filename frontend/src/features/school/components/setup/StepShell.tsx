export default function StepShell({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="os-wizard-step-header">
        <div className="os-w-2h os-h-2h os-rounded-full os-bg-accent-light os-flex os-items-center os-justify-center os-shrink-0"
        >
          <Icon className="os-c-accent os-text-lg" />
        </div>
        <div>
          <h2 className="os-m-0 os-text-lg os-fw-600 os-c-primary">{title}</h2>
          <p className="os-m-0 os-text-sm os-c-secondary">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}
