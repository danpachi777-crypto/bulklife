import { lazy, Suspense, type ComponentProps } from "react";
const Studio = lazy(() =>
  import("./AthleteStudio").then((m) => ({ default: m.BodyView })),
);
export function BodyView(props: ComponentProps<typeof Studio>) {
  return (
    <Suspense
      fallback={
        <div className="studio-placeholder" role="status">
          3D表示を準備中…
        </div>
      }
    >
      <Studio {...props} />
    </Suspense>
  );
}
