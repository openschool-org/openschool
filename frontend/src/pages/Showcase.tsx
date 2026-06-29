import { useState } from "react";
import {
  Button,
  TextInput,
  Dropdown,
  Tile,
  Grid,
  Column,
  Search,
  Toggle,
  InlineNotification,
  ProgressBar,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Modal,
  FileUploader,
  Checkbox,
  RadioButton,
  RadioButtonGroup,
  Accordion,
  AccordionItem,
  Pagination,
  Breadcrumb,
  BreadcrumbItem,
} from "@carbon/react";

const headers = [
  { key: "course", header: "Course" },
  { key: "instructor", header: "Instructor" },
  { key: "status", header: "Status" },
];

const rows = [
  {
    id: "1",
    course: "Intro to React",
    instructor: "Mr. Perera",
    status: "In Progress",
  },
  {
    id: "2",
    course: "DSA Basics",
    instructor: "Ms. Fernando",
    status: "Completed",
  },
  {
    id: "3",
    course: "Linux Fundamentals",
    instructor: "Mr. Silva",
    status: "Not Started",
  },
];

export default function Showcase() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div style={{ padding: "0 1rem" }}>
        <Breadcrumb noTrailingSlash>
          <BreadcrumbItem href="/">Home</BreadcrumbItem>
          <BreadcrumbItem href="/showcase" isCurrentPage>
            Showcase
          </BreadcrumbItem>
        </Breadcrumb>
      </div>

      <Grid style={{ marginTop: "2rem" }}>
        <Column lg={4} md={4} sm={4}>
          <Tile>
            <h4>Courses</h4>
            <p>12 active</p>
            <ProgressBar
              label="Completion"
              value={65}
              max={100}
              helperText="65% complete"
            />
          </Tile>
        </Column>

        <Column
          lg={8}
          md={4}
          sm={4}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Search
            size="lg"
            labelText="Search courses"
            placeholder="Search courses..."
            style={{ width: "100%", maxWidth: "400px" }}
          />
          <Button style={{ marginTop: "2rem" }} onClick={() => setOpen(true)}>
            Get Started
          </Button>
        </Column>

        <Column lg={4} md={4} sm={4}>
          <Tile>
            <h4>Settings</h4>
            <TextInput
              id="username"
              labelText="Username"
              placeholder="Enter username"
            />
            <Dropdown
              id="role"
              titleText="Role"
              label="Select role"
              items={["Student", "Teacher", "Admin"]}
              style={{ marginTop: "1rem" }}
            />
            <Toggle
              labelText="Notifications"
              id="toggle-notifications"
              style={{ marginTop: "1rem" }}
            />
          </Tile>
        </Column>
      </Grid>

      <Grid style={{ marginTop: "2rem" }}>
        <Column lg={16} md={8} sm={4}>
          <InlineNotification
            kind="info"
            title="Welcome"
            subtitle="This is a Carbon Design System component showcase."
            lowContrast
          />
        </Column>
      </Grid>

      <Grid style={{ marginTop: "2rem" }}>
        <Column lg={16} md={8} sm={4}>
          <Tabs>
            <TabList aria-label="Dashboard sections">
              <Tab>My Courses</Tab>
              <Tab>Assignments</Tab>
              <Tab>Profile</Tab>
            </TabList>
            <TabPanels>
              <TabPanel>
                <TableContainer title="Enrolled Courses">
                  <Table>
                    <TableHead>
                      <TableRow>
                        {headers.map((h) => (
                          <TableHeader key={h.key}>{h.header}</TableHeader>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rows.map((row) => (
                        <TableRow key={row.id}>
                          <TableCell>{row.course}</TableCell>
                          <TableCell>{row.instructor}</TableCell>
                          <TableCell>{row.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Pagination
                  style={{ marginTop: "1rem" }}
                  totalItems={rows.length}
                  pageSize={10}
                  pageSizes={[10, 20, 30]}
                />
              </TabPanel>

              <TabPanel>
                <h4 style={{ marginBottom: "1rem" }}>Submit Assignment</h4>
                <FileUploader
                  accept={[".pdf", ".docx"]}
                  buttonLabel="Add file"
                  filenameStatus="edit"
                  labelDescription="Only .pdf and .docx files. 10MB max."
                  labelTitle="Upload assignment"
                />
                <Checkbox
                  id="confirm-original"
                  labelText="I confirm this is my own work"
                  style={{ marginTop: "1rem" }}
                />
              </TabPanel>

              <TabPanel>
                <RadioButtonGroup
                  legendText="Preferred learning mode"
                  name="learning-mode"
                  defaultSelected="online"
                >
                  <RadioButton labelText="Online" value="online" id="online" />
                  <RadioButton
                    labelText="In-person"
                    value="in-person"
                    id="in-person"
                  />
                  <RadioButton labelText="Hybrid" value="hybrid" id="hybrid" />
                </RadioButtonGroup>

                <div style={{ marginTop: "2rem" }}><Accordion>
                  <AccordionItem title="Account details">
                    <p>Update your personal information and credentials.</p>
                  </AccordionItem>
                  <AccordionItem title="Privacy settings">
                    <p>Manage what data is shared with instructors.</p>
                  </AccordionItem>
                </Accordion></div>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Column>
      </Grid>

      <Modal
        open={open}
        onRequestClose={() => setOpen(false)}
        modalHeading="Get started with OpenSchool"
        primaryButtonText="Continue"
        secondaryButtonText="Cancel"
        onRequestSubmit={() => setOpen(false)}
      >
        <p>Create your account to start enrolling in courses.</p>
      </Modal>
    </>
  );
}
