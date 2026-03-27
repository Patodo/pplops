import { Typography } from "antd";

type Props = {
  title: string;
  description?: string;
};

export function PlaceholderPage({ title, description }: Props) {
  return (
    <div className="p-6">
      <Typography.Title level={3}>{title}</Typography.Title>
      {description ? (
        <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
      ) : null}
    </div>
  );
}
