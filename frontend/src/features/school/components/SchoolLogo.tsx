import { useSchoolBranding } from "@/features/school/queries/useSchool";

// The school's logo for a dashboard header; renders nothing until a logo is set.
export default function SchoolLogo() {
  const { data } = useSchoolBranding();
  if (!data?.logo_url) return null;
  return <img src={data.logo_url} alt={data.name ? `${data.name} logo` : "School logo"} className="os-dash-hero__logo" />;
}
