/** The signed-out chrome: no sidebar, no top bar, nothing to navigate to. */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-dvh bg-canvas">{children}</div>;
}
