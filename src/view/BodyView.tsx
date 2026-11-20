import {
  Component,
  lazy,
  Suspense,
  type ComponentProps,
  type ReactNode,
} from "react";
const Studio = lazy(() =>
  import("./AthleteStudio").then((m) => ({ default: m.BodyView })),
);
class ModuleError extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <div className="studio-placeholder" role="status">
        <p>3D表示を準備できませんでした。数値と今日の操作は使えます。</p>
        <button onClick={() => location.reload()}>表示を再読み込み</button>
      </div>
    ) : (
      this.props.children
    );
  }
}
export function BodyView(props: ComponentProps<typeof Studio>) {
  return (
    <ModuleError>
      <Suspense
        fallback={
          <div className="studio-placeholder" role="status">
            3D表示を準備中…
          </div>
        }
      >
        <Studio {...props} />
      </Suspense>
    </ModuleError>
  );
}
