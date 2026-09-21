/**
 * Server-rendered JSON-LD block.
 *
 * Rendered on the server so crawlers (and Rich Results Test) see structured data
 * in the first HTML byte — nothing is injected by client JS. `<` is escaped to
 * `\u003c` so a stray "</script>" inside data cannot break out of the tag.
 */
export function JsonLd({
  data,
  id,
}: {
  data: Record<string, unknown>;
  id?: string;
}) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      id={id}
      // Content is generated from typed config, and `<` is escaped above.
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

/** Renders several JSON-LD graphs (each needs its own script tag). */
export function JsonLdGraph({
  graphs,
}: {
  graphs: (Record<string, unknown> | null | undefined)[];
}) {
  return (
    <>
      {graphs
        .filter((graph): graph is Record<string, unknown> => Boolean(graph))
        .map((graph, index) => (
          <JsonLd
            key={`jsonld-${index}`}
            id={`jsonld-${index}`}
            data={graph}
          />
        ))}
    </>
  );
}