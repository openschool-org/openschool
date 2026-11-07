import type { MouseEvent } from "react";
import { useNavigate } from "react-router";
import { Button } from "antd";
import type { ButtonProps } from "antd";

type Props = Omit<ButtonProps, "href" | "htmlType"> & { to: string };

/**
 * Ant Design button that navigates within the SPA. It renders a real anchor
 * (`href`), so middle-click / "open in new tab" still work, while a plain
 * left-click goes through the router instead of reloading the page.
 */
export default function LinkButton({ to, onClick, ...rest }: Props) {
  const navigate = useNavigate();

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    onClick?.(e as MouseEvent<HTMLAnchorElement> & MouseEvent<HTMLButtonElement>);
    const modified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
    if (e.defaultPrevented || modified) return;
    e.preventDefault();
    navigate(to);
  };

  return <Button {...rest} href={to} onClick={handleClick} />;
}
