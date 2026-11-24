import { Link } from "react-router";
import { Button, Card, Result, Spin } from "antd";

const NEXT_STEPS = [
  { title: "Subjects and curriculum", body: "Build the subject catalogue and the choices students can make at each level.", path: "/subjects" },
  { title: "Teachers", body: "Add teachers. Each one gets a sign-in; the first password is their NIC number.", path: "/teachers" },
  { title: "Students", body: "Add students one by one or import a CSV, then enrol them into classes.", path: "/students" },
  { title: "Streams and section heads", body: "Assign a teacher in charge for each grade or A/L stream.", path: "/streams" },
];

interface Props {
  submitting: boolean;
  submitError: string | null;
  submitted: boolean;
  onRetry: () => void;
  onBack: () => void;
  onGoToDashboard: () => void;
}

export default function DoneStep({ submitting, submitError, submitted, onRetry, onBack, onGoToDashboard }: Props) {
  if (submitting) {
    return (
      <Card className="os-setup-wizard__result">
        <div className="os-setup-saving" role="status">
          <Spin />
          <p>Creating your school. This takes a few seconds.</p>
        </div>
      </Card>
    );
  }

  if (submitError) {
    return (
      <Card className="os-setup-wizard__result">
        <Result
          status="error"
          title="The school could not be created"
          subTitle={`${submitError} Anything already saved is kept, so trying again continues where it stopped.`}
          extra={[
            <Button key="back" size="large" onClick={onBack}>Back to review</Button>,
            <Button key="retry" size="large" type="primary" onClick={onRetry}>Try again</Button>,
          ]}
        />
      </Card>
    );
  }

  if (!submitted) return null;

  return (
    <Card className="os-setup-wizard__result">
      <Result
        status="success"
        title="Your school is ready"
        subTitle="The school, grades and classes are created. These are the usual next steps."
        extra={<Button type="primary" size="large" onClick={onGoToDashboard}>Go to the dashboard</Button>}
      />
      <ol className="os-setup-next">
        {NEXT_STEPS.map((item) => (
          <li key={item.path}>
            <Link to={item.path} className="os-setup-next__title">{item.title}</Link>
            <p>{item.body}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}
