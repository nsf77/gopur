export function StubPage(props: { title: string; message: string }) {
  return (
    <main className="p-4">
      <h1 className="m-0 text-2xl font-extrabold tracking-tight">{props.title}</h1>
      <p className="mt-2 text-sm text-text-muted">{props.message}</p>
    </main>
  );
}
