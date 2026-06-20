import { Link } from "react-router";
import { Button, Grid, Column, Tag } from "@carbon/react";

export default function Home() {
  return (
    <Grid>
      <Column
        lg={16}
        md={8}
        sm={4}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          marginTop: "4rem",
        }}
      >
        <h1>OpenSchool</h1>
        <p>Digital Infrastructure for Sri Lankan Schools</p>

        <div style={{ marginTop: "1.5rem" }}>
          <Tag type="blue">FOSS</Tag>
          <Tag type="green">Education</Tag>
          <Tag type="purple">Sri Lanka</Tag>
        </div>

        <Link to="/showcase">
          <Button style={{ marginTop: "2rem" }}>View Component Showcase</Button>
        </Link>
      </Column>
    </Grid>
  );
}
