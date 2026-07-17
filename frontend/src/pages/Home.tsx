import { SignOutButton } from "@asgardeo/react";

export default function Home() {
  return (
    <div className="home-hero">
      <h1 className="home-hero__title">OpenSchool</h1>
      <SignOutButton />
      <p className="home-hero__subtitle">
        Digital Infrastructure for Sri Lankan Schools
      </p>
    </div>
  );
}
